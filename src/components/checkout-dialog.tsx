
'use client';

import React from 'react';
import { useCart } from '@/hooks/use-cart';
import { useTranslations } from '@/hooks/use-translations';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreditCard, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface CheckoutDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  isProcessing: boolean;
}

export function CheckoutDialog({ isOpen, onOpenChange, onConfirm, isProcessing }: CheckoutDialogProps) {
  const t = useTranslations('Checkout');
  const tCart = useTranslations('Cart');
  const { cart } = useCart();

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl grid-cols-1 md:grid-cols-2 grid p-0">
        <div className="p-6 flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline">{t('title')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col flex-grow overflow-hidden">
            <ScrollArea className="flex-grow -mx-6">
                <div className="space-y-6 px-6">
                <div>
                    <h3 className="text-lg font-medium">{t('shipping_info')}</h3>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('full_name')}</Label>
                        <Input id="name" defaultValue="Marie Dubois" required />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="address">{t('address')}</Label>
                        <Input id="address" defaultValue="123 Rue de la Joie" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="city">{t('city')}</Label>
                        <Input id="city" defaultValue="Paris" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="postal-code">{t('postal_code')}</Label>
                        <Input id="postal-code" defaultValue="75001" required />
                    </div>
                     <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="country">{t('country')}</Label>
                        <Input id="country" defaultValue="France" required />
                    </div>
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-medium">{t('payment_info')}</h3>
                    <div className="mt-2 text-sm text-muted-foreground">{t('payment_simulation_notice')}</div>
                    <div className="mt-4 grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="card-number">{t('card_number')}</Label>
                        <div className="relative">
                        <Input id="card-number" defaultValue="**** **** **** 4242" required />
                        <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                        <Label htmlFor="expiry-date">{t('expiry_date')}</Label>
                        <Input id="expiry-date" defaultValue="12/28" required />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="cvc">{t('cvc')}</Label>
                        <Input id="cvc" defaultValue="123" required />
                        </div>
                    </div>
                    </div>
                </div>
                </div>
            </ScrollArea>
            <DialogFooter className="mt-6 pt-6 border-t">
              <Button type="submit" className="w-full" disabled={isProcessing}>
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
        </div>
        <aside className="hidden md:flex flex-col bg-muted/50 p-6">
            <h3 className="text-lg font-medium">{t('order_summary')}</h3>
            <ScrollArea className="mt-6 flex-grow">
                <div className="space-y-4">
                    {cart.map(item => {
                         const itemPrice = (item.model.price || 0) + item.placedCharms.reduce((charmSum, pc) => charmSum + (pc.charm.price || 0), 0);
                        return (
                        <div key={item.id} className="flex items-center gap-4">
                            <div className="relative w-16 h-16 rounded-md overflow-hidden border">
                                <Image
                                    src={item.previewImage}
                                    alt={item.model.name}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="flex-grow">
                                <p className="font-semibold">{item.model.name}</p>
                                <p className="text-sm text-muted-foreground">{tCart('item_count', {count: item.placedCharms.length})}</p>
                            </div>
                            <p className="font-medium">{formatPrice(itemPrice)}</p>
                        </div>
                    )})}
                </div>
            </ScrollArea>
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
