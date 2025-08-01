
'use client';

import React, { useState } from 'react';
import { useCart } from '@/hooks/use-cart';
import { useTranslations } from '@/hooks/use-translations';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { createOrder, CreateOrderResult, SerializableCartItem } from '@/app/actions';
import { useParams } from 'next/navigation';
import { StockErrorState } from './checkout-dialog';
import type { ShippingAddress } from '@/lib/types';
import { Progress } from './ui/progress';

type Step = 'customer' | 'shipping' | 'payment';

const PaymentStep = ({
  onOrderCreated,
  setStockError,
  clientSecret,
  email,
  shippingAddress
}: {
  onOrderCreated: (result: CreateOrderResult) => void,
  setStockError: (error: StockErrorState) => void,
  clientSecret: string,
  email: string,
  shippingAddress: ShippingAddress
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const t = useTranslations('Checkout');
  const { cart } = useCart();
  const params = useParams();
  const locale = params.locale as string;

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const handlePaymentSubmit = async () => {
    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setErrorMessage(submitError.message || t('payment_error_default'));
      setIsProcessing(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
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
      
      if (orderResult.success) {
        onOrderCreated(orderResult);
      } else {
        setErrorMessage(orderResult.message);
        if (orderResult.stockError) {
           setStockError({
              message: orderResult.message,
              unavailableModelIds: new Set(orderResult.stockError.unavailableModelIds),
              unavailableCharmIds: new Set(orderResult.stockError.unavailableCharmIds),
            });
        }
      }
    }
    
    setIsProcessing(false);
  }

  return (
    <>
      <div>
        <h3 className="text-lg font-medium">{t('payment_info')}</h3>
        <div className="mt-4">
        <PaymentElement 
            options={{
                wallets: {
                    applePay: 'never',
                    googlePay: 'never'
                }
            }}
        />
        </div>
      </div>

       {errorMessage && (
            <div className="pt-4">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('payment_error_title')}</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            </div>
        )}
      
      <DialogFooter className="pt-4 mt-auto border-t">
        <Button type="button" variant="ghost" onClick={() => (document.querySelector('#checkout-back-button') as HTMLButtonElement)?.click()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('back_button')}
        </Button>
        <Button type="button" className="w-full" disabled={isProcessing || !stripe || !elements} onClick={handlePaymentSubmit}>
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('processing_button')}
            </>
          ) : t('confirm_order_button') }
        </Button>
      </DialogFooter>
    </>
  );
}


export const CheckoutForm = ({
  onOrderCreated,
  setStockError,
  clientSecret
}: {
  onOrderCreated: (result: CreateOrderResult) => void,
  setStockError: (error: StockErrorState) => void,
  clientSecret: string
}) => {
  const t = useTranslations('Checkout');
  const [currentStep, setCurrentStep] = useState<Step>('customer');

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
      name: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      postalCode: '',
      country: 'France'
  });
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleNextStep = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (currentStep === 'customer') {
        if (!name || !email) {
            setErrorMessage("Veuillez remplir tous les champs.");
            return;
        }
        setShippingAddress(prev => ({ ...prev, name }));
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
  };

  const handleBackStep = () => {
    setCurrentStep(currentStep === 'shipping' ? 'customer' : 'shipping');
  }
  
  const stepNumber = currentStep === 'customer' ? 1 : currentStep === 'shipping' ? 2 : 3;
  const progressValue = (stepNumber / 3) * 100;

  return (
     <div className="py-4 space-y-6 flex flex-col h-full">
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
      
        <div className="flex-grow overflow-y-auto px-6 space-y-6 no-scrollbar pb-6 flex flex-col">
            {currentStep !== 'payment' ? (
                <form id="checkout-form" onSubmit={handleNextStep} className="space-y-6 flex flex-col flex-grow">
                    {currentStep === 'customer' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">{t('customer_info')}</h3>
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('full_name')}</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('full_name')} required />
                            </div>
                            <div className="space-y-2 pb-2">
                                <Label htmlFor="email-address">{t('email_address')}</Label>
                                <Input id="email-address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={useTranslations('OrderStatus')('email_placeholder')} required />
                            </div>
                        </div>
                    )}

                    {currentStep === 'shipping' && (
                         <div className="space-y-4">
                            <h3 className="text-lg font-medium">{t('shipping_info')}</h3>
                            <div className="space-y-2">
                                <Label htmlFor="shipping-name">{t('full_name')}</Label>
                                <Input id="shipping-name" name="name" value={shippingAddress.name} onChange={(e) => setShippingAddress(prev => ({...prev, name: e.target.value}))} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="addressLine1">{t('address')}</Label>
                                <Input id="addressLine1" name="addressLine1" placeholder={t('address_line1_placeholder')} value={shippingAddress.addressLine1} onChange={(e) => setShippingAddress(prev => ({...prev, addressLine1: e.target.value}))} required />
                            </div>
                             <div className="space-y-2">
                                <Input id="addressLine2" name="addressLine2" placeholder={t('address_line2_placeholder')} value={shippingAddress.addressLine2 || ''} onChange={(e) => setShippingAddress(prev => ({...prev, addressLine2: e.target.value}))} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2 sm:col-span-1">
                                    <Label htmlFor="postalCode">{t('postal_code')}</Label>
                                    <Input id="postalCode" name="postalCode" value={shippingAddress.postalCode} onChange={(e) => setShippingAddress(prev => ({...prev, postalCode: e.target.value}))} required />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="city">{t('city')}</Label>
                                    <Input id="city" name="city" value={shippingAddress.city} onChange={(e) => setShippingAddress(prev => ({...prev, city: e.target.value}))} required />
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="country">{t('country')}</Label>
                                <Input id="country" name="country" value={shippingAddress.country} onChange={(e) => setShippingAddress(prev => ({...prev, country: e.target.value}))} required />
                            </div>
                        </div>
                    )}
                    <DialogFooter className="pt-4 mt-auto border-t">
                        <Button id="checkout-back-button" type="button" variant="ghost" onClick={handleBackStep} className={currentStep === 'customer' ? 'invisible' : ''}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t('back_button')}
                        </Button>
                        <Button type="submit" className="w-full">
                           {t('next_step_button')}
                        </Button>
                     </DialogFooter>
                </form>
            ) : (
                <PaymentStep 
                    onOrderCreated={onOrderCreated}
                    setStockError={setStockError}
                    clientSecret={clientSecret}
                    email={email}
                    shippingAddress={shippingAddress}
                />
            )}
        </div>
    </div>
  )
}
