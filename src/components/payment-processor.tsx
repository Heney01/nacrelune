
'use client';

import React, { useState } from 'react';
import { useCart } from '@/hooks/use-cart';
import { useTranslations } from '@/hooks/use-translations';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import type { CreateOrderResult, SerializableCartItem } from '@/app/actions/order.actions';
import { useParams } from 'next/navigation';
import type { ShippingAddress, DeliveryMethod, Coupon } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { createOrder } from '@/app/actions/order.actions';

export const PaymentProcessor = ({
  onOrderCreated,
  email,
  deliveryMethod,
  shippingAddress,
  clientSecret,
  appliedCoupon,
  pointsToUse,
  finalTotal
}: {
  onOrderCreated: (result: CreateOrderResult) => void;
  email: string;
  deliveryMethod: DeliveryMethod;
  shippingAddress?: ShippingAddress;
  clientSecret: string;
  appliedCoupon: Coupon | null;
  pointsToUse: number;
  finalTotal: number;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const t = useTranslations('Checkout');
  const { cart } = useCart();
  const locale = useParams().locale as string;
  const { user } = useAuth();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const handleFreeOrder = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    const serializableCart: SerializableCartItem[] = cart.map(item => ({
        id: item.id,
        model: item.model,
        jewelryType: { id: item.jewelryType.id, name: item.jewelryType.name, description: item.jewelryType.description },
        placedCharms: item.placedCharms.map(pc => ({
            id: pc.id,
            charm: pc.charm,
            position: pc.position,
            rotation: pc.rotation,
            withClasp: pc.withClasp
        })),
        previewImage: item.previewImage,
        creator: item.creator,
        creationId: item.creationId,
    }));
    
    const result = await createOrder(
        serializableCart,
        email,
        'free_order', // Special identifier for free orders
        deliveryMethod,
        locale,
        shippingAddress,
        appliedCoupon || undefined,
        user?.uid,
        pointsToUse
    );

    onOrderCreated(result);
    setIsProcessing(false);
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (finalTotal <= 0) {
        await handleFreeOrder();
        return;
    }
    
    if (!stripe || !elements) {
      setErrorMessage(t('payment_error_default'));
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

    // Redirect to Stripe checkout page
    const { error } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/${locale}/orders/confirmation`,
        receipt_email: email,
      },
    });

    // This code will only be executed if there's an immediate error
    // (e.g., network issue) before redirection.
    if (error) {
      setErrorMessage(error.message || t('payment_error_default'));
      setIsProcessing(false);
    }
  };

  const isFreeOrder = finalTotal <= 0;
  const isStripeLoading = !isFreeOrder && (!stripe || !elements);

  if (isFreeOrder) {
    return (
        <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">
            <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>{t('free_order_title')}</AlertTitle>
                <AlertDescription>
                    {t('free_order_description')}
                </AlertDescription>
            </Alert>
            <DialogFooter className="pt-4 pb-6 mt-auto px-0">
                <Button type="submit" form="payment-form" className="w-full" disabled={isProcessing}>
                    {isProcessing ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('processing_button')}</>
                    ) : (
                        t('confirm_order_button_no_payment')
                    )}
                </Button>
            </DialogFooter>
        </form>
    );
  }

  return (
    <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('payment_error_title')}</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="relative">
        <PaymentElement options={{wallets: {applePay: 'never', googlePay: 'never'}}} className={cn(isStripeLoading && 'opacity-0 h-0')}/>
        {isStripeLoading && (
            <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        )}
      </div>
      
       <DialogFooter className="pt-4 pb-6 mt-auto px-0">
         <Button type="submit" form="payment-form" className="w-full" disabled={isProcessing || isStripeLoading}>
            {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('processing_button')}</>
            ) : (
                t('confirm_order_button', { total: finalTotal.toFixed(2) })
            )}
         </Button>
      </DialogFooter>
    </form>
  )
};
