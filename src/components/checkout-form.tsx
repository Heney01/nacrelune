

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
import { useStripe, useElements, PaymentElement, Elements } from '@stripe/react-stripe-js';
import type { CreateOrderResult } from '@/app/actions/order.actions';
import { useParams, useRouter } from 'next/navigation';
import { StockErrorState } from './checkout-dialog';
import type { ShippingAddress, DeliveryMethod, PickupPoint, Coupon, User, StripePromise } from '@/lib/types';
import { Progress } from './ui/progress';
import { Tabs, TabsList, TabsContent, TabsTrigger } from './ui/tabs';
import { findPickupPoints, FindPickupPointsResult } from '@/lib/pickup-points';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Separator } from './ui/separator';
import { Slider } from './ui/slider';
import { Skeleton } from './ui/skeleton';
import { createOrder, validateCoupon, sendConfirmationEmail, createPaymentIntent } from '@/app/actions/order.actions';
import { PaymentProcessor } from './payment-processor';


type Step = 'shipping' | 'summary' | 'payment';

export const CheckoutForm = ({
  stripePromise,
  onOrderCreated,
  setStockError,
}: {
  stripePromise: StripePromise;
  onOrderCreated: (result: CreateOrderResult) => void;
  setStockError: (error: StockErrorState) => void;
}) => {
  const t = useTranslations('Checkout');
  const tCart = useTranslations('Cart');
  const tStatus = useTranslations('OrderStatus');
  const { user } = useAuth();
  const { cart } = useCart();
  const CLASP_PRICE = 1.20;

  const [currentStep, setCurrentStep] = useState<Step>('shipping');
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
  
  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
        setShippingAddress(prev => ({ ...prev, name: user.displayName || '' }));
        setEmail(user.email || '');
    }
  }, [user]);

  const totalBeforeDiscount = cart.reduce((sum, item) => {
    const basePrice = item.model.price || 9.90;
    let charmsPrice = 0;
    const sortedCharms = [...item.placedCharms].sort((a, b) => (a.charm.price || 0) - (b.charm.price || 0));
    
    sortedCharms.forEach((pc, index) => {
        const charmPrice = pc.charm.price || 4.00;
        if (index < 5) {
            charmsPrice += charmPrice;
        } else {
            charmsPrice += charmPrice / 2;
        }
    });

    const claspsPrice = item.placedCharms.reduce((claspSum, pc) => {
      return claspSum + (pc.withClasp ? CLASP_PRICE : 0);
    }, 0);
    
    return sum + basePrice + charmsPrice + claspsPrice;
  }, 0);

  const discountAmount = appliedCoupon
    ? appliedCoupon.discountType === 'percentage'
      ? totalBeforeDiscount * (appliedCoupon.value / 100)
      : appliedCoupon.value
    : 0;
  
  const totalAfterCoupon = Math.max(0, totalBeforeDiscount - discountAmount);

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
        if (result.coupon.minPurchase && totalBeforeDiscount < result.coupon.minPurchase) {
            setCouponError(`Le total de la commande doit être d'au moins ${formatPrice(result.coupon.minPurchase)} pour utiliser ce coupon.`);
        } else {
            setAppliedCoupon(result.coupon);
        }
    } else {
        setCouponError(result.message);
    }
    setIsApplyingCoupon(false);
  }
  
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

  const handleProceedToPayment = async () => {
    setErrorMessage(null);
    
    setIsPreparingPayment(true);
    setPaymentError(null);
    const intentEmail = user?.email || 'customer@example.com';
    
    if (finalTotal > 0) {
      const intentResult = await createPaymentIntent(finalTotal, intentEmail);
      if (intentResult.clientSecret) {
        setClientSecret(intentResult.clientSecret);
      } else {
        setPaymentError(intentResult.error || t('payment_intent_error'));
        setIsPreparingPayment(false);
        return;
      }
    } else {
      setClientSecret('free_order'); // Special case for free orders
    }

    setIsPreparingPayment(false);
    setCurrentStep('payment');
  }


  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (currentStep === 'shipping') {
       if (!shippingAddress.name || !email) {
        setErrorMessage(t('customer_info_error'));
        return;
      }
       if (deliveryMethod === 'home' && (!shippingAddress.addressLine1 || !shippingAddress.city || !shippingAddress.postalCode || !shippingAddress.country)) {
        setErrorMessage(t('shipping_info_error'));
        return;
      }
      if (deliveryMethod === 'pickup' && !selectedPickupPoint) {
        setErrorMessage(t('pickup_selection_error'));
        return;
      }
      setCurrentStep('summary');
      return;
    }

     if (currentStep === 'summary') {
      handleProceedToPayment();
      return;
    }
  };

  const handleBackStep = () => {
    setErrorMessage(null);
    setPaymentError(null);
    if(currentStep === 'payment') setCurrentStep('summary');
    if(currentStep === 'summary') setCurrentStep('shipping');
  };
  
  const stepNumber = currentStep === 'shipping' ? 1 : currentStep === 'summary' ? 2 : 3;
  const progressValue = (stepNumber / 3) * 100;
  
  if (currentStep === 'payment') {
      return (
          <div className="flex flex-col h-full">
            <DialogHeader className="p-6 pb-4 flex-shrink-0 relative flex-row items-center justify-center">
                <Button type="button" variant="ghost" size="icon" onClick={handleBackStep} id="checkout-back-button-payment" className="absolute left-4 top-4">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <DialogTitle className="text-2xl font-headline">{t('payment_info')}</DialogTitle>
            </DialogHeader>
             <div className="px-6 pb-6 flex-grow overflow-y-auto no-scrollbar">
                  {isPreparingPayment && (
                    <div className="flex flex-col items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p className="mt-4 text-sm text-muted-foreground">{t('processing_button')}</p>
                    </div>
                  )}
                  {paymentError && (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{t('payment_error_title')}</AlertTitle>
                            <AlertDescription>{paymentError}</AlertDescription>
                        </Alert>
                    </div>
                  )}
                  {clientSecret && (
                     <Elements stripe={stripePromise} options={clientSecret !== 'free_order' ? {clientSecret, appearance: { theme: 'stripe' }} : undefined}>
                        <PaymentProcessor
                            onOrderCreated={onOrderCreated}
                            email={email}
                            deliveryMethod={deliveryMethod}
                            shippingAddress={shippingAddress}
                            clientSecret={clientSecret}
                            appliedCoupon={appliedCoupon}
                            pointsToUse={pointsToUse}
                            finalTotal={finalTotal}
                        />
                    </Elements>
                  )}
             </div>
          </div>
      )
  }

  return (
    <form id="checkout-form" onSubmit={handleFormSubmit} className="flex flex-col h-full">
      <DialogHeader className="p-6 pb-4 flex-shrink-0 relative flex-row items-center justify-center">
        {currentStep !== 'shipping' && (
          <Button type="button" variant="ghost" size="icon" onClick={handleBackStep} id="checkout-back-button-main" className="absolute left-4 top-4">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
         <div className="flex flex-col items-center">
            <DialogTitle className="text-2xl font-headline text-center">{t('title')}</DialogTitle>
            <DialogDescription className="text-center">{t('description')}</DialogDescription>
        </div>
      </DialogHeader>

      <div className="px-6 flex-grow overflow-y-auto no-scrollbar min-h-0">
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
              
              <div style={{ display: currentStep === 'shipping' ? 'block' : 'none' }}>
                <h3 className="text-lg font-medium mb-4">{t('shipping_title')}</h3>
                <Tabs value={deliveryMethod} onValueChange={(v) => setDeliveryMethod(v as DeliveryMethod)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="home"><Home className="mr-2 h-4 w-4"/>{t('delivery_method_home')}</TabsTrigger>
                    <TabsTrigger value="pickup"><Store className="mr-2 h-4 w-4"/>{t('delivery_method_pickup')}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="home" className="pt-4 space-y-4">
                      <div className="space-y-2">
                          <Label htmlFor="email-address">{t('email_address')}</Label>
                          <Input id="email-address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={tStatus('email_placeholder')} required={currentStep === 'shipping'} />
                      </div>
                      <Separator />
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

              <div style={{ display: currentStep === 'summary' ? 'block' : 'none' }}>
                 <h3 className="text-lg font-medium mb-4">{t('order_summary')}</h3>
                 <div className="space-y-4">
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

                    <Separator className="my-4"/>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('subtotal')}</span>
                            <span>{formatPrice(totalBeforeDiscount)}</span>
                        </div>
                        {appliedCoupon && (
                            <div className="flex justify-between text-green-600">
                                <span className="text-muted-foreground">{t('discount')} ({appliedCoupon.code})</span>
                                <span>-{formatPrice(discountAmount)}</span>
                            </div>
                        )}
                        {pointsValue > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span className="text-muted-foreground">{t('points_discount')}</span>
                                <span>-{formatPrice(pointsValue)}</span>
                            </div>
                        )}
                         <div className="flex justify-between font-bold text-lg">
                            <span>{t('total')}</span>
                            <span>{formatPrice(finalTotal)}</span>
                        </div>
                    </div>

                 </div>
              </div>

          </div>
      </div>
      <DialogFooter className="p-6 pt-4 mt-auto border-t">
          <Button type="submit" form="checkout-form" className="w-full">
              {currentStep === 'summary' ? t('go_to_payment_button') : t('next_step_button')}
          </Button>
      </DialogFooter>
    </form>
  );
};
