

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useCart } from '@/hooks/use-cart';
import { useTranslations } from '@/hooks/use-translations';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertCircle, Ban, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { loadStripe, Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { CreateOrderResult } from '@/app/actions/order.actions';
import { CheckoutForm } from './checkout-form';
import type { Coupon } from '@/lib/types';
import { Button } from './ui/button';
import { useAuth } from '@/hooks/use-auth';

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

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

export function CheckoutDialog({ isOpen, onOpenChange, onOrderCreated, stockError, setStockError }: CheckoutDialogProps) {
  const t = useTranslations('Checkout');
  const tCart = useTranslations('Cart');
  const { cart } = useCart();
  const { user } = useAuth();
  
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  const CLASP_PRICE = 1.20;

  const subtotal = cart.reduce((sum, item) => {
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

  const shippingCost = 0;

  const discountAmount = appliedCoupon
    ? appliedCoupon.discountType === 'percentage'
      ? subtotal * (appliedCoupon.value / 100)
      : appliedCoupon.value
    : 0;
  
  const total = Math.max(0, subtotal - discountAmount + shippingCost);

  const formatPrice = (price: number) => tCart('price', { price });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          setAppliedCoupon(null);
        }
        onOpenChange(open);
    }}>
      <DialogContent 
        className="max-w-4xl w-full grid p-0 max-h-[90vh] md:grid-cols-2"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col h-full max-h-[90vh] md:max-h-none overflow-y-auto no-scrollbar">
           {stripePromise && (
            <CheckoutForm 
                stripePromise={stripePromise}
                onOrderCreated={onOrderCreated}
                setStockError={setStockError}
            />
           )}
        </div>
        
        <aside className="hidden md:flex flex-col bg-muted/50 p-6 overflow-y-auto no-scrollbar">
            <h3 className="text-lg font-medium">{t('order_summary')}</h3>
            <div className="mt-6 flex-grow -mx-6 overflow-y-auto no-scrollbar">
                <div className="space-y-4 px-6">
                    {cart.map(item => {
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

                         const itemPrice = basePrice + charmsPrice + claspsPrice;
                         const isModelOutOfStock = stockError?.unavailableModelIds.has(item.model.id);

                        return (
                        <div key={item.id} className={cn("flex items-center gap-4 p-2 rounded-md", isModelOutOfStock && 'bg-red-100 ring-2 ring-red-200')}>
                            <div className="relative w-16 h-16 rounded-md overflow-hidden border">
                                <Image
                                    src={item.previewImage}
                                    alt={item.model.name}
                                    fill
                                    className="object-cover"
                                    sizes="64px"
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
                 {appliedCoupon && (
                    <div className="flex justify-between text-green-600">
                        <span className="text-muted-foreground">{t('discount')} ({appliedCoupon.code})</span>
                        <span>-{formatPrice(discountAmount)}</span>
                    </div>
                )}
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
