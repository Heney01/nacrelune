

'use client';

import React, { useState } from 'react';
import { useCart } from '@/hooks/use-cart';
import { useTranslations } from '@/hooks/use-translations';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { createOrder, CreateOrderResult, SerializableCartItem } from '@/app/actions';
import { useParams } from 'next/navigation';
import { StockErrorState } from './checkout-dialog';

export const CheckoutForm = ({
  onOrderCreated,
  setStockError,
  clientSecret
}: {
  onOrderCreated: (result: CreateOrderResult) => void,
  setStockError: (error: StockErrorState) => void,
  clientSecret: string
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const t = useTranslations('Checkout');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { cart } = useCart();
  const params = useParams();
  const locale = params.locale as string;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

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
      
      const orderResult = await createOrder(serializableCart, email, locale, paymentIntent.id);
      
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
  };
  
  return (
     <form id="checkout-form" onSubmit={handleSubmit} className="py-4 space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t('shipping_info')}</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">{t('full_name')}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('full_name')} required />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email-address">{t('email_address')}</Label>
            <Input id="email-address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={useTranslations('OrderStatus')('email_placeholder')} required />
          </div>
        </div>
      </div>
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
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('payment_error_title')}</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
      <DialogFooter className="pt-4 mt-auto border-t">
        <Button type="submit" className="w-full" disabled={isProcessing || !stripe || !elements}>
          {isProcessing ? (
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
  )
}
