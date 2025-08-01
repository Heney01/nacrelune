
'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/hooks/use-cart';
import { useTranslations } from '@/hooks/use-translations';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { createOrder, createPaymentIntent, CreateOrderResult, SerializableCartItem } from '@/app/actions';
import { useParams } from 'next/navigation';
import { StockErrorState } from './checkout-dialog';
import type { ShippingAddress } from '@/lib/types';
import { Progress } from './ui/progress';

type Step = 'customer' | 'shipping' | 'payment';

export const CheckoutForm = ({
  total,
  onOrderCreated,
  setStockError,
}: {
  total: number;
  onOrderCreated: (result: CreateOrderResult) => void;
  setStockError: (error: StockErrorState) => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const t = useTranslations('Checkout');
  const tStatus = useTranslations('OrderStatus');
  const { cart } = useCart();
  const params = useParams();
  const locale = params.locale as string;

  const [currentStep, setCurrentStep] = useState<Step>('customer');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: '',
    addressLine1: '',
    city: '',
    postalCode: '',
    country: 'France',
  });
  const [email, setEmail] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (currentStep === 'customer') {
      if (!shippingAddress.name || !email) {
        setErrorMessage("Veuillez remplir tous les champs.");
        return;
      }
      setCurrentStep('shipping');
      return;
    }

    if (currentStep === 'shipping') {
      if (!shippingAddress.addressLine1 || !shippingAddress.city || !shippingAddress.postalCode || !shippingAddress.country) {
        setErrorMessage("Veuillez remplir tous les champs d'adresse.");
        return;
      }
      setCurrentStep('payment');
      return;
    }
    
    if (currentStep === 'payment') {
        if (!stripe || !elements) {
            setErrorMessage(t('payment_error_default'));
            return;
        }

        setIsProcessing(true);

        const { error: submitError } = await elements.submit();
        if (submitError) {
          setErrorMessage(submitError.message || t('payment_error_default'));
          setIsProcessing(false);
          return;
        }

        // Create Payment Intent on the server
        const paymentIntentResult = await createPaymentIntent(total);
        if (!paymentIntentResult.clientSecret) {
            setErrorMessage(paymentIntentResult.error || t('payment_error_default'));
            setIsProcessing(false);
            return;
        }

        // Confirm the payment with the client secret
        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          clientSecret: paymentIntentResult.clientSecret,
          confirmParams: {
            receipt_email: email,
            shipping: {
                name: shippingAddress.name,
                address: {
                    line1: shippingAddress.addressLine1,
                    line2: shippingAddress.addressLine2,
                    city: shippingAddress.city,
                    postal_code: shippingAddress.postalCode,
                    country: shippingAddress.country
                }
            }
          },
          redirect: 'if_required'
        });

        if (error) {
          setErrorMessage(error.message || t('payment_error_default'));
          setIsProcessing(false);
          return;
        }

        if (paymentIntent && paymentIntent.status === 'succeeded') {
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
          
          const orderResult = await createOrder(serializableCart, email, locale, paymentIntent.id, shippingAddress);
          onOrderCreated(orderResult);
        }
        
        setIsProcessing(false);
    }
  };

  const handleBackStep = () => {
    setErrorMessage(null);
    if(currentStep === 'payment') setCurrentStep('shipping');
    if(currentStep === 'shipping') setCurrentStep('customer');
  };
  
  const stepNumber = currentStep === 'customer' ? 1 : currentStep === 'shipping' ? 2 : 3;
  const progressValue = (stepNumber / 3) * 100;

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
                        {t('step_indicator', { step: stepNumber })}
                    </p>
                </div>

                {errorMessage && (
                    <div className="px-6">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{t('payment_error_title')}</AlertTitle>
                            <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                    </div>
                )}
                
                <div className="px-6 pb-6">
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
                      <h3 className="text-lg font-medium">{t('shipping_info')}</h3>
                      <div className="space-y-2">
                          <Label htmlFor="shipping-name">{t('full_name')}</Label>
                          <Input id="shipping-name" name="name" value={shippingAddress.name} onChange={(e) => setShippingAddress(prev => ({...prev, name: e.target.value}))} required={currentStep === 'shipping'} />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="addressLine1">{t('address')}</Label>
                          <Input id="addressLine1" name="addressLine1" placeholder={t('address_line1_placeholder')} value={shippingAddress.addressLine1} onChange={(e) => setShippingAddress(prev => ({...prev, addressLine1: e.target.value}))} required={currentStep === 'shipping'} />
                      </div>
                      <div className="space-y-2">
                          <Input id="addressLine2" name="addressLine2" placeholder={t('address_line2_placeholder')} value={shippingAddress.addressLine2 || ''} onChange={(e) => setShippingAddress(prev => ({...prev, addressLine2: e.target.value}))} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2 sm:col-span-1">
                              <Label htmlFor="postalCode">{t('postal_code')}</Label>
                              <Input id="postalCode" name="postalCode" value={shippingAddress.postalCode} onChange={(e) => setShippingAddress(prev => ({...prev, postalCode: e.target.value}))} required={currentStep === 'shipping'} />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                              <Label htmlFor="city">{t('city')}</Label>
                              <Input id="city" name="city" value={shippingAddress.city} onChange={(e) => setShippingAddress(prev => ({...prev, city: e.target.value}))} required={currentStep === 'shipping'} />
                          </div>
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="country">{t('country')}</Label>
                          <Input id="country" name="country" value={shippingAddress.country} onChange={(e) => setShippingAddress(prev => ({...prev, country: e.target.value}))} required={currentStep === 'shipping'} />
                      </div>
                  </div>

                  <div style={{ display: currentStep === 'payment' ? 'block' : 'none' }} className="space-y-4">
                      <h3 className="text-lg font-medium">{t('payment_info')}</h3>
                      {stripe && elements && <PaymentElement />}
                  </div>
                </div>
            </div>
            
            <DialogFooter className="pt-4 pb-6 mt-auto border-t px-6">
                <Button type="submit" className="w-full" disabled={isProcessing || (currentStep === 'payment' && (!stripe || !elements))}>
                  {currentStep !== 'payment' ? (
                     t('next_step_button')
                  ) : isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('processing_button')}
                    </>
                  ) : (
                    t('confirm_order_button')
                  )}
                </Button>
            </DialogFooter>
        </form>
      </div>
    </>
  );
};
