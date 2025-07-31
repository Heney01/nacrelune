

'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/hooks/use-cart';
import { useTranslations } from '@/hooks/use-translations';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertCircle, Ban } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { createPaymentIntent, createOrder, CreateOrderResult, SerializableCartItem } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { useParams } from 'next/navigation';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export type StockErrorState = {
  message: string;
  unavailableModelIds: Set<string>;
  unavailableCharmIds: Set<string>;
} | null;

interface CheckoutDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onOrderCreated: (result: CreateOrderResult) => void;
  stockError: StockErrorState;
  setStockError: (error: StockErrorState) => void;
}

const CheckoutForm = ({
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
      
      const orderResult = await createOrder(serializableCart, email, locale);
      
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
          <PaymentElement />
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

export function CheckoutDialog({ isOpen, onOpenChange, onOrderCreated, stockError, setStockError }: CheckoutDialogProps) {
  const t = useTranslations('Checkout');
  const tCart = useTranslations('Cart');
  const { cart } = useCart();
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const subtotal = cart.reduce((sum, item) => {
    const modelPrice = item.model.price || 0;
    const charmsPrice = item.placedCharms.reduce((charmSum, pc) => charmSum + (pc.charm.price || 0), 0);
    return sum + modelPrice + charmsPrice;
  }, 0);

  const shippingCost = 0; // Simulate free shipping
  const total = subtotal + shippingCost;
  
  const formatPrice = (price: number) => {
    return tCart('price', { price });
  };
  
  useEffect(() => {
    if(isOpen && total > 0) {
      createPaymentIntent(total).then(res => {
        if (res.clientSecret) {
          setClientSecret(res.clientSecret);
        } else {
            console.error(res.error);
        }
      });
    }
  }, [isOpen, total]);

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
       variables: {
        colorPrimary: '#ef4444',
        colorBackground: '#ffffff',
        colorText: '#333333',
        colorDanger: '#df1b41',
        fontFamily: 'Alegreya, Ideal Sans, system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '4px',
      }
    },
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl w-full grid p-0 max-h-[90vh] md:grid-cols-2"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col h-full max-h-[90vh] md:max-h-none">
            <DialogHeader className="p-6 pb-4 flex-shrink-0">
                <DialogTitle className="text-2xl font-headline">{t('title')}</DialogTitle>
                <DialogDescription>{t('description')}</DialogDescription>
            </DialogHeader>
             {stockError && (
                <div className="px-6">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{t('stock_error_title')}</AlertTitle>
                        <AlertDescription>{t('stock_error_description')}</AlertDescription>
                    </Alert>
                </div>
            )}
            <div className="flex-grow overflow-y-auto px-6 no-scrollbar">
              {clientSecret ? (
                <Elements stripe={stripePromise} options={options}>
                  <CheckoutForm 
                    onOrderCreated={onOrderCreated} 
                    setStockError={setStockError}
                    clientSecret={clientSecret}
                  />
                </Elements>
              ) : (
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
            </div>
        </div>
        
        <aside className="hidden md:flex flex-col bg-muted/50 p-6 overflow-hidden">
            <h3 className="text-lg font-medium">{t('order_summary')}</h3>
            <div className="mt-6 flex-grow -mx-6 overflow-y-auto no-scrollbar">
                <div className="space-y-4 px-6">
                    {cart.map(item => {
                         const itemPrice = (item.model.price || 0) + item.placedCharms.reduce((charmSum, pc) => charmSum + (pc.charm.price || 0), 0);
                         const isModelOutOfStock = stockError?.unavailableModelIds.has(item.model.id);

                        return (
                        <div key={item.id} className={cn("flex items-center gap-4 p-2 rounded-md", isModelOutOfStock && 'bg-red-100 ring-2 ring-red-200')}>
                            <div className="relative w-16 h-16 rounded-md overflow-hidden border">
                                <Image
                                    src={item.previewImage}
                                    alt={item.model.name}
                                    fill
                                    className="object-cover"
                                />
                                 {isModelOutOfStock && (
                                    <div className="absolute inset-0 bg-red-800/50 flex items-center justify-center">
                                        <Ban className="h-6 w-6 text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-grow">
                                <p className="font-semibold">{item.model.name}</p>
                                <div className="text-sm text-muted-foreground">
                                    {item.placedCharms.map(pc => {
                                        const isCharmOutOfStock = stockError?.unavailableCharmIds.has(pc.charm.id);
                                        return (
                                            <div key={pc.id} className={cn("flex items-center gap-1", isCharmOutOfStock && 'text-red-600 font-medium')}>
                                                {isCharmOutOfStock && 
                                                    <TooltipProvider><Tooltip><TooltipTrigger>
                                                        <Ban className="h-3 w-3" />
                                                    </TooltipTrigger><TooltipContent><p>{tCart('sold_out')}</p></TooltipContent></Tooltip></TooltipProvider>
                                                }
                                                <span>{pc.charm.name}</span>
                                            </div>
                                        )
                                    })}
                                    {item.placedCharms.length === 0 && tCart('item_count_zero')}
                                </div>
                            </div>
                            <p className="font-medium">{formatPrice(itemPrice)}</p>
                        </div>
                    )})}
                </div>
            </div>
            <Separator className="my-6" />
            <div className="space-y-2">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('subtotal')}</span>
                    <span>{formatPrice(subtotal)}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('shipping')}</span>
                    <span>{shippingCost > 0 ? formatPrice(shippingCost) : t('shipping_cost_free')}</span>
                </div>
                <Separator />
                 <div className="flex justify-between font-bold text-lg">
                    <span>{t('total')}</span>
                    <span>{formatPrice(total)}</span>
                </div>
            </div>
        </aside>
      </DialogContent>
    </Dialog>
  );
}
