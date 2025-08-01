
'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/hooks/use-cart';
import { useTranslations } from '@/hooks/use-translations';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, ArrowLeft, Home, Store } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { createOrder, createPaymentIntent, CreateOrderResult, SerializableCartItem } from '@/app/actions';
import { useParams } from 'next/navigation';
import { StockErrorState } from './checkout-dialog';
import type { ShippingAddress, DeliveryMethod } from '@/lib/types';
import { Progress } from './ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';

type Step = 'customer' | 'shipping' | 'payment';

const StripeCheckoutForm = ({
  onOrderCreated,
  total,
  email,
  deliveryMethod,
  shippingAddress,
}: {
  onOrderCreated: (result: CreateOrderResult) => void;
  total: number;
  email: string;
  deliveryMethod: DeliveryMethod;
  shippingAddress?: ShippingAddress;
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

    // We create the payment intent here, right before confirming the payment.
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

    // If payment is successful, create the order in our database
    const orderResult = await createOrder(
        serializableCart,
        email,
        locale,
        clientSecret, // Pass the real payment intent ID now
        deliveryMethod,
        shippingAddress
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
       <DialogFooter className="pt-4 mt-auto px-0">
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
  clientSecret, // Now receiving the clientSecret as a prop
}: {
  total: number;
  onOrderCreated: (result: CreateOrderResult) => void;
  setStockError: (error: StockErrorState) => void;
  clientSecret: string | null;
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
      if (!clientSecret) {
          return (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">Initializing payment...</p>
              </div>
          )
      }
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
                  <StripeCheckoutForm 
                      onOrderCreated={onOrderCreated}
                      total={total}
                      email={email}
                      deliveryMethod={deliveryMethod}
                      shippingAddress={shippingAddress}
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
                      <TabsContent value="pickup" className="pt-4">
                        <Alert>
                           <AlertCircle className="h-4 w-4" />
                           <AlertTitle>{t('pickup_info_title')}</AlertTitle>
                           <AlertDescription>{t('pickup_info_description')}</AlertDescription>
                       </Alert>
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
