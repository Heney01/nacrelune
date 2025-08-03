'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/hooks/use-cart';
import { useTranslations } from '@/hooks/use-translations';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, ArrowLeft, Home, Store, Search, CheckCircle, TicketPercent, Award } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { createOrder, createPaymentIntent, CreateOrderResult, SerializableCartItem, validateCoupon } from '@/app/actions';
import { useParams } from 'next/navigation';
import { StockErrorState } from './checkout-dialog';
import type { ShippingAddress, DeliveryMethod, PickupPoint, Coupon } from '@/lib/types';
import { Progress } from './ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { findPickupPoints, FindPickupPointsResult } from '@/lib/pickup-points';
import { ScrollArea } from './ui/scroll-area';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Separator } from './ui/separator';
import { Slider } from './ui/slider';

type Step = 'customer' | 'shipping' | 'payment';

const PaymentStep = ({
  onOrderCreated,
  totalBeforeCoupon,
  email,
  deliveryMethod,
  shippingAddress,
  selectedPickupPoint,
  appliedCoupon,
  setAppliedCoupon,
}: {
  onOrderCreated: (result: CreateOrderResult) => void;
  totalBeforeCoupon: number;
  email: string;
  deliveryMethod: DeliveryMethod;
  shippingAddress?: ShippingAddress;
  selectedPickupPoint?: PickupPoint;
  appliedCoupon: Coupon | null;
  setAppliedCoupon: (coupon: Coupon | null) => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const t = useTranslations('Checkout');
  const tCart = useTranslations('Cart');
  const { cart } = useCart();
  const locale = useParams().locale as string;
  const { user } = useAuth();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const discountAmount = appliedCoupon
    ? appliedCoupon.discountType === 'percentage'
      ? totalBeforeCoupon * (appliedCoupon.value / 100)
      : appliedCoupon.value
    : 0;
  
  const totalAfterCoupon = Math.max(0, totalBeforeCoupon - discountAmount);

  const availablePoints = user?.rewardPoints || 0;
  const maxPointsToUse = Math.min(availablePoints, Math.floor(totalAfterCoupon * 10));

  const [pointsToUse, setPointsToUse] = useState(0);
  const pointsValue = pointsToUse / 10;
  
  const finalTotal = Math.max(0, totalAfterCoupon - pointsValue);

  const formatPrice = (price: number) => tCart('price', { price });

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setIsApplyingCoupon(true);
    setCouponError(null);
    setAppliedCoupon(null);

    const result = await validateCoupon(couponCode);
    if (result.success && result.coupon) {
        setAppliedCoupon(result.coupon);
        toast({
            title: t('coupon_applied_title'),
            description: t('coupon_applied_description', {code: result.coupon.code}),
        })
    } else {
        setCouponError(result.message);
    }
    setIsApplyingCoupon(false);
  }

  const handleFreeOrder = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    const serializableCart: SerializableCartItem[] = cart.map(item => ({
      id: item.id,
      model: item.model,
      jewelryType: { id: item.jewelryType.id, name: item.jewelryType.name, description: item.jewelryType.description },
      placedCharms: item.placedCharms,
      previewImage: item.previewImage,
      creatorId: item.creatorId,
      creatorName: item.creatorName,
      creationId: item.creationId,
    }));

    const finalShippingAddress = deliveryMethod === 'pickup' && selectedPickupPoint
      ? {
          name: shippingAddress?.name || '',
          addressLine1: selectedPickupPoint.name,
          addressLine2: `${selectedPickupPoint.address}, ${selectedPickupPoint.city}`,
          city: selectedPickupPoint.city,
          postalCode: selectedPickupPoint.postcode,
          country: selectedPickupPoint.country,
        }
      : shippingAddress;

    const orderResult = await createOrder(
        serializableCart,
        email,
        locale,
        'free_order', // No payment intent for free orders
        deliveryMethod,
        finalShippingAddress,
        appliedCoupon || undefined,
        user?.uid,
        pointsToUse
    );
    
    onOrderCreated(orderResult);
    setIsProcessing(false);
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (finalTotal <= 0) {
        handleFreeOrder();
        return;
    }

    if (!stripe || !elements) {
      setErrorMessage(t('payment_error_default'));
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const serializableCart: SerializableCartItem[] = cart.map(item => ({
        id: item.id,
        model: item.model,
        jewelryType: {
          id: item.jewelryType.id,
          name: item.jewelryType.name,
          description: item.jewelryType.description
        },
        placedCharms: item.placedCharms,
        previewImage: item.previewImage,
        creatorId: item.creatorId,
        creatorName: item.creatorName,
        creationId: item.creationId,
      }));

    const { clientSecret, error: intentError } = await createPaymentIntent(finalTotal);

    if (intentError || !clientSecret) {
        setErrorMessage(intentError || t('payment_intent_error'));
        setIsProcessing(false);
        return;
    }

    const { error: paymentError } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        receipt_email: email,
      },
      redirect: 'if_required',
    });

    if (paymentError) {
      setErrorMessage(paymentError.message || t('payment_error_default'));
      setIsProcessing(false);
      return;
    }

    const finalShippingAddress = deliveryMethod === 'pickup' && selectedPickupPoint
      ? {
          name: shippingAddress?.name || '', // Customer name
          addressLine1: selectedPickupPoint.name, // Relay name
          addressLine2: `${selectedPickupPoint.address}, ${selectedPickupPoint.city}`, // Relay address
          city: selectedPickupPoint.city,
          postalCode: selectedPickupPoint.postcode,
          country: selectedPickupPoint.country,
        }
      : shippingAddress;
    
    const orderResult = await createOrder(
        serializableCart,
        email,
        locale,
        clientSecret,
        deliveryMethod,
        finalShippingAddress,
        appliedCoupon || undefined,
        user?.uid,
        pointsToUse
    );

    onOrderCreated(orderResult);
    setIsProcessing(false);
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('payment_error_title')}</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="md:hidden p-4 rounded-lg border bg-muted/50 space-y-2">
         <h4 className="font-medium text-center mb-4">{t('order_summary')}</h4>
         <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('subtotal')}</span>
              <span>{formatPrice(totalBeforeCoupon)}</span>
          </div>
          {appliedCoupon && (
              <div className="flex justify-between text-sm text-green-600">
                  <span className="text-muted-foreground">{t('discount')} ({appliedCoupon.code})</span>
                  <span>-{formatPrice(discountAmount)}</span>
              </div>
          )}
           {pointsValue > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                  <span className="text-muted-foreground">{t('points_discount')}</span>
                  <span>-{formatPrice(pointsValue)}</span>
              </div>
          )}
          <Separator className="my-2"/>
          <div className="flex justify-between font-bold text-base">
              <span>{t('total')}</span>
              <span>{formatPrice(finalTotal)}</span>
          </div>
      </div>


      {user && availablePoints > 0 && (
         <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
              <div className="space-y-0.5">
                  <Label htmlFor="use-points" className="font-bold flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary"/>
                    {t('use_reward_points')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                      {t('you_have_points_slider', { count: availablePoints })}
                  </p>
              </div>
               <div className="flex items-center gap-4">
                  <Slider
                    id="points-slider"
                    min={0}
                    max={maxPointsToUse}
                    step={10}
                    value={[pointsToUse]}
                    onValueChange={(value) => setPointsToUse(value[0])}
                    className="flex-grow"
                  />
                  <div className="w-24 text-center border rounded-md p-2">
                      <p className="text-sm font-bold text-green-600">- {formatPrice(pointsValue)}</p>
                      <p className="text-xs text-muted-foreground">{pointsToUse} pts</p>
                  </div>
               </div>
         </div>
      )}

      <Separator />

       <div className="space-y-2">
            <Label>{t('coupon_code')}</Label>
            <div className="flex gap-2">
                <Input 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="SUMMER20"
                    disabled={!!appliedCoupon}
                />
                {!appliedCoupon ? (
                    <Button type="button" variant="outline" onClick={handleApplyCoupon} disabled={isApplyingCoupon || !couponCode}>
                        {isApplyingCoupon ? <Loader2 className="animate-spin" /> : t('apply_button')}
                    </Button>
                ) : (
                    <Button type="button" variant="ghost" onClick={() => { setAppliedCoupon(null); setCouponCode(''); setCouponError(null); }}>
                        {t('remove_coupon_button')}
                    </Button>
                )}
            </div>
            {couponError && <p className="text-sm text-destructive">{couponError}</p>}
        </div>
      
      {finalTotal > 0 ? (
          <PaymentElement />
      ) : (
          <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>{t('free_order_title')}</AlertTitle>
              <AlertDescription>
                  {t('free_order_description')}
              </AlertDescription>
          </Alert>
      )}
      
       <DialogFooter className="pt-4 pb-6 mt-auto px-0">
         <Button type="submit" form="payment-form" className="w-full" disabled={isProcessing || !stripe || !elements}>
            {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('processing_button')}</>
            ) : (
                finalTotal > 0
                ? t('confirm_order_button', { total: finalTotal.toFixed(2) })
                : t('confirm_order_button_no_payment')
            )}
         </Button>
      </DialogFooter>
    </form>
  )
};


export const CheckoutForm = ({
  total,
  onOrderCreated,
  setStockError,
  appliedCoupon,
  setAppliedCoupon,
}: {
  total: number;
  onOrderCreated: (result: CreateOrderResult) => void;
  setStockError: (error: StockErrorState) => void;
  appliedCoupon: Coupon | null;
  setAppliedCoupon: (coupon: Coupon | null) => void;
}) => {
  const t = useTranslations('Checkout');
  const tStatus = useTranslations('OrderStatus');
  const { user, firebaseUser } = useAuth();

  const [currentStep, setCurrentStep] = useState<Step>('customer');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('home');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: '',
    addressLine1: '',
    city: '',
    postalCode: '',
    country: 'France',
  });
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [postcode, setPostcode] = useState('');
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [selectedPickupPoint, setSelectedPickupPoint] = useState<PickupPoint | null>(null);
  const [isFindingPoints, setIsFindingPoints] = useState(false);
  const [pickupPointError, setPickupPointError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
        setShippingAddress(prev => ({ ...prev, name: user.displayName || '' }));
        setEmail(user.email || '');
    }
  }, [user]);

  const handleFindPickupPoints = async () => {
    if (!postcode) {
      setPickupPointError(t('pickup_postcode_error'));
      return;
    }
    setIsFindingPoints(true);
    setPickupPointError(null);
    setPickupPoints([]);
    setSelectedPickupPoint(null);
    const result: FindPickupPointsResult = await findPickupPoints(postcode);
    if (result.success && result.points) {
      setPickupPoints(result.points);
    } else {
      setPickupPointError(result.error || t('pickup_generic_error'));
    }
    setIsFindingPoints(false);
  }

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (currentStep === 'customer') {
      if (!shippingAddress.name || !email) {
        setErrorMessage(t('customer_info_error'));
        return;
      }
      setCurrentStep('shipping');
      return;
    }

    if (currentStep === 'shipping') {
       if (deliveryMethod === 'home' && (!shippingAddress.addressLine1 || !shippingAddress.city || !shippingAddress.postalCode || !shippingAddress.country)) {
        setErrorMessage(t('shipping_info_error'));
        return;
      }
      if (deliveryMethod === 'pickup' && !selectedPickupPoint) {
        setErrorMessage(t('pickup_selection_error'));
        return;
      }
      setCurrentStep('payment');
      return;
    }
  };

  const handleBackStep = () => {
    setErrorMessage(null);
    if(currentStep === 'payment') setCurrentStep('shipping');
    if(currentStep === 'shipping') setCurrentStep('customer');
  };
  
  const stepNumber = currentStep === 'customer' ? 1 : currentStep === 'shipping' ? 2 : 3;
  const progressValue = (stepNumber / 3) * 100;
  
  if (currentStep === 'payment') {
      return (
          <div className="flex flex-col h-full">
            <DialogHeader className="p-6 pb-4 flex-shrink-0 relative flex-row items-center justify-center">
                <Button type="button" variant="ghost" size="icon" onClick={handleBackStep} id="checkout-back-button-payment" className="absolute left-4">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <DialogTitle className="text-2xl font-headline">{t('payment_info')}</DialogTitle>
            </DialogHeader>
             <div className="px-6 pb-6 flex-grow overflow-y-auto">
                  <PaymentStep
                      onOrderCreated={onOrderCreated}
                      totalBeforeCoupon={total}
                      email={email}
                      deliveryMethod={deliveryMethod}
                      shippingAddress={shippingAddress}
                      selectedPickupPoint={selectedPickupPoint || undefined}
                      appliedCoupon={appliedCoupon}
                      setAppliedCoupon={setAppliedCoupon}
                  />
             </div>
          </div>
      )
  }

  return (
    <form id="checkout-form" onSubmit={handleFormSubmit} className="flex flex-col h-full">
      <DialogHeader className="p-6 pb-4 flex-shrink-0 relative flex-row items-center justify-center">
        {currentStep !== 'customer' && (
          <Button type="button" variant="ghost" size="icon" onClick={handleBackStep} id="checkout-back-button-main" className="absolute left-4">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
         <div className="flex flex-col items-center">
            <DialogTitle className="text-2xl font-headline text-center">{t('title')}</DialogTitle>
            <DialogDescription className="text-center">{t('description')}</DialogDescription>
        </div>
      </DialogHeader>

      <div className="px-6 flex-grow overflow-y-auto min-h-0">
          <div className="space-y-6">
              <div>
                  <Progress value={progressValue} className="w-full" />
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                      {t('step_indicator', { step: stepNumber, total: 3 })}
                  </p>
              </div>

              {errorMessage && (
                  <div>
                      <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>{t('form_error_title')}</AlertTitle>
                          <AlertDescription>{errorMessage}</AlertDescription>
                      </Alert>
                  </div>
              )}
              
              <div>
                <div style={{ display: currentStep === 'customer' ? 'block' : 'none' }} className="space-y-4">
                    <h3 className="text-lg font-medium">{t('customer_info')}</h3>
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('full_name')}</Label>
                        <Input id="name" value={shippingAddress.name} onChange={(e) => setShippingAddress(prev => ({ ...prev, name: e.target.value }))} placeholder={t('full_name')} required={currentStep === 'customer'} />
                    </div>
                    <div className="space-y-2 pb-2">
                        <Label htmlFor="email-address">{t('email_address')}</Label>
                        <Input id="email-address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={tStatus('email_placeholder')} required={currentStep === 'customer'} />
                    </div>
                </div>

                <div style={{ display: currentStep === 'shipping' ? 'block' : 'none' }} className="space-y-4">
                  <h3 className="text-lg font-medium">{t('shipping_title')}</h3>
                  <Tabs value={deliveryMethod} onValueChange={(v) => setDeliveryMethod(v as DeliveryMethod)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="home"><Home className="mr-2 h-4 w-4"/>{t('delivery_method_home')}</TabsTrigger>
                      <TabsTrigger value="pickup"><Store className="mr-2 h-4 w-4"/>{t('delivery_method_pickup')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="home" className="pt-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="shipping-name">{t('full_name')}</Label>
                          <Input id="shipping-name" name="name" value={shippingAddress.name} onChange={(e) => setShippingAddress(prev => ({...prev, name: e.target.value}))} required={currentStep === 'shipping' && deliveryMethod === 'home'} />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="addressLine1">{t('address')}</Label>
                          <Input id="addressLine1" name="addressLine1" placeholder={t('address_line1_placeholder')} value={shippingAddress.addressLine1} onChange={(e) => setShippingAddress(prev => ({...prev, addressLine1: e.target.value}))} required={currentStep === 'shipping' && deliveryMethod === 'home'} />
                      </div>
                      <div className="space-y-2">
                          <Input id="addressLine2" name="addressLine2" placeholder={t('address_line2_placeholder')} value={shippingAddress.addressLine2 || ''} onChange={(e) => setShippingAddress(prev => ({...prev, addressLine2: e.target.value}))} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2 sm:col-span-1">
                              <Label htmlFor="postalCode">{t('postal_code')}</Label>
                              <Input id="postalCode" name="postalCode" value={shippingAddress.postalCode} onChange={(e) => setShippingAddress(prev => ({...prev, postalCode: e.target.value}))} required={currentStep === 'shipping' && deliveryMethod === 'home'} />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                              <Label htmlFor="city">{t('city')}</Label>
                              <Input id="city" name="city" value={shippingAddress.city} onChange={(e) => setShippingAddress(prev => ({...prev, city: e.target.value}))} required={currentStep === 'shipping' && deliveryMethod === 'home'} />
                          </div>
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="country">{t('country')}</Label>
                          <Input id="country" name="country" value={shippingAddress.country} onChange={(e) => setShippingAddress(prev => ({...prev, country: e.target.value}))} required={currentStep === 'shipping' && deliveryMethod === 'home'} />
                      </div>
                    </TabsContent>
                    <TabsContent value="pickup" className="pt-4 space-y-4">
                        <div className="flex gap-2">
                          <div className="flex-grow space-y-2">
                              <Label htmlFor="postcode">{t('postal_code')}</Label>
                              <Input id="postcode" value={postcode} onChange={e => setPostcode(e.target.value)} placeholder="e.g. 75001" />
                          </div>
                          <Button type="button" onClick={handleFindPickupPoints} disabled={isFindingPoints} className="self-end">
                              {isFindingPoints ? <Loader2 className="animate-spin" /> : <Search />}
                          </Button>
                        </div>
                        {pickupPointError && <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertDescription>{pickupPointError}</AlertDescription></Alert>}

                        {pickupPoints.length > 0 && (
                          <div className="space-y-2">
                              <Label>{t('pickup_select_point')}</Label>
                              <div className="h-48 rounded-md border overflow-y-auto">
                                  <div className="p-2 space-y-2">
                                      {pickupPoints.map(point => (
                                          <Card 
                                              key={point.id} 
                                              className={cn("p-3 cursor-pointer hover:bg-muted/50", selectedPickupPoint?.id === point.id && "bg-muted ring-2 ring-primary")}
                                              onClick={() => setSelectedPickupPoint(point)}
                                          >
                                              <div className="flex justify-between items-start">
                                                  <div>
                                                      <p className="font-semibold text-sm">{point.name}</p>
                                                      <p className="text-xs text-muted-foreground">{point.address}, {point.city}</p>
                                                  </div>
                                                  {selectedPickupPoint?.id === point.id && <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />}
                                              </div>
                                          </Card>
                                      ))}
                                  </div>
                              </div>
                          </div>
                        )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
          </div>
      </div>
      <DialogFooter className="p-6 pt-4 mt-auto border-t">
          <Button type="submit" form="checkout-form" className="w-full">
              {t('next_step_button')}
          </Button>
      </DialogFooter>
    </form>
  );
};
