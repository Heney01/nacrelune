
'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/hooks/use-cart';
import { useTranslations } from '@/hooks/use-translations';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, ArrowLeft, Home, Store, Search, CheckCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { createOrder, createPaymentIntent, CreateOrderResult, SerializableCartItem } from '@/app/actions';
import { useParams } from 'next/navigation';
import { StockErrorState } from './checkout-dialog';
import type { ShippingAddress, DeliveryMethod, PickupPoint } from '@/lib/types';
import { Progress } from './ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { findPickupPoints, FindPickupPointsResult } from '@/lib/pickup-points';
import { ScrollArea } from './ui/scroll-area';
import { Card } from './ui/card';
import { cn } from '@/lib/utils';

type Step = 'customer' | 'shipping' | 'payment';

const PaymentStep = ({
  onOrderCreated,
  total,
  email,
  deliveryMethod,
  shippingAddress,
  selectedPickupPoint,
}: {
  onOrderCreated: (result: CreateOrderResult) => void;
  total: number;
  email: string;
  deliveryMethod: DeliveryMethod;
  shippingAddress?: ShippingAddress;
  selectedPickupPoint?: PickupPoint;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const t = useTranslations('Checkout');
  const { cart } = useCart();
  const locale = useParams().locale as string;

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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
      }));

    const { clientSecret, error: intentError } = await createPaymentIntent(total);

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
      <PaymentElement />
       <DialogFooter className="pt-4 pb-2 mt-auto px-0">
         <Button type="submit" form="payment-form" className="w-full" disabled={isProcessing || !stripe || !elements}>
            {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('processing_button')}</>
            ) : (
                t('confirm_order_button', { total: total.toFixed(2) })
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
}: {
  total: number;
  onOrderCreated: (result: CreateOrderResult) => void;
  setStockError: (error: StockErrorState) => void;
}) => {
  const t = useTranslations('Checkout');
  const tStatus = useTranslations('OrderStatus');

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
            <DialogHeader className="p-6 pb-4 flex-shrink-0 flex-row items-center gap-4">
                <Button type="button" variant="ghost" size="icon" onClick={handleBackStep} id="checkout-back-button-payment">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <DialogTitle className="text-2xl font-headline">{t('payment_info')}</DialogTitle>
                </div>
            </DialogHeader>
             <div className="px-6 pb-6 flex-grow">
                  <PaymentStep
                      onOrderCreated={onOrderCreated}
                      total={total}
                      email={email}
                      deliveryMethod={deliveryMethod}
                      shippingAddress={shippingAddress}
                      selectedPickupPoint={selectedPickupPoint || undefined}
                  />
             </div>
          </div>
      )
  }

  return (
    <>
      <DialogHeader className="p-6 pb-4 flex-shrink-0 flex-row items-center gap-4">
        {currentStep !== 'customer' && (
          <Button type="button" variant="ghost" size="icon" onClick={handleBackStep} id="checkout-back-button-main">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <DialogTitle className="text-2xl font-headline">{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </div>
      </DialogHeader>

      <div className="flex-grow overflow-y-auto no-scrollbar">
        <form id="checkout-form" onSubmit={handleFormSubmit} className="space-y-6 flex flex-col flex-grow h-full">
            <div className="py-4 space-y-6 flex-grow">
                <div className="px-6">
                    <Progress value={progressValue} className="w-full" />
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                        {t('step_indicator', { step: stepNumber, total: 3 })}
                    </p>
                </div>

                {errorMessage && (
                    <div className="px-6">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{t('form_error_title')}</AlertTitle>
                            <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                    </div>
                )}
                
                <div className="px-6 pb-12">
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
                        <TabsTrigger value="home"><Home className="mr-2 h-4 w-4"/>{t('delivery_method_home_tab')}</TabsTrigger>
                        <TabsTrigger value="pickup"><Store className="mr-2 h-4 w-4"/>{t('delivery_method_pickup_tab')}</TabsTrigger>
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
                                <ScrollArea className="h-48 rounded-md border">
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
                                </ScrollArea>
                            </div>
                         )}
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
            </div>
            
            <DialogFooter className="pt-4 pb-6 mt-auto border-t px-6">
                <Button type="submit" form="checkout-form" className="w-full">
                    {t('next_step_button')}
                </Button>
            </DialogFooter>
        </form>
      </div>
    </>
  );
};

