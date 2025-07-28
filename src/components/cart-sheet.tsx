
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/hooks/use-cart';
import { useTranslations } from '@/hooks/use-translations';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, ShoppingCart, PlusCircle } from 'lucide-react';
import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

interface CartSheetProps {
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CartSheet({ children, open, onOpenChange }: CartSheetProps) {
  const t = useTranslations('Editor');
  const { cart, removeFromCart, clearCart } = useCart();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'en';

  const totalItems = cart.length;
  
  // Simple sum of prices, assuming price is available.
  // In a real app, this would be more complex (currency, etc.)
  const totalPrice = cart.reduce((sum, item) => {
    const modelPrice = item.model.price || 0;
    const charmsPrice = item.placedCharms.reduce((charmSum, pc) => charmSum + (pc.charm.price || 0), 0);
    return sum + modelPrice + charmsPrice;
  }, 0);

  const content = (
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-headline text-2xl">{t('cart_title')} ({totalItems})</SheetTitle>
        </SheetHeader>
        {cart.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center text-muted-foreground">
            <ShoppingCart className="w-16 h-16 mb-4" />
            <p className="font-bold text-lg">{t('cart_empty_title')}</p>
            <p className="text-sm">{t('cart_empty_description')}</p>
             <SheetClose asChild>
                <Button variant="outline" asChild className="mt-6">
                    <Link href={`/${locale}`}>
                        <PlusCircle />
                        {t('create_new_jewel_button')}
                    </Link>
                </Button>
            </SheetClose>
          </div>
        ) : (
          <>
            <div className="p-4 border-b">
                 <SheetClose asChild>
                    <Button variant="outline" className="w-full" asChild>
                         <Link href={`/${locale}`}>
                            <PlusCircle />
                            {t('create_new_jewel_button')}
                        </Link>
                    </Button>
                </SheetClose>
            </div>
            <ScrollArea className="flex-grow my-4 pr-4">
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-start gap-4">
                    <div className="relative w-20 h-20 rounded-md overflow-hidden border">
                      <Image
                        src={item.model.displayImageUrl}
                        alt={item.model.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                    <div className="flex-grow">
                      <p className="font-bold">{item.model.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.jewelryType.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t('added_charms_title', { count: item.placedCharms.length })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">{t('cart_remove_item')}</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <SheetFooter className="mt-auto border-t pt-4">
               <div className="w-full space-y-4">
                <div className="flex justify-between font-bold text-lg">
                    <span>{t('cart_total')}</span>
                    <span>${totalPrice.toFixed(2)}</span>
                </div>
                 <SheetClose asChild>
                    <Button className="w-full" disabled>
                        {t('purchase_button')}
                    </Button>
                 </SheetClose>
                 {cart.length > 0 && (
                    <Button variant="outline" className="w-full" onClick={clearCart}>
                       <Trash2 className="mr-2 h-4 w-4" /> {t('clear_all_button')}
                    </Button>
                 )}
               </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
  );

  if (children) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            {content}
        </Sheet>
    );
  }

  return <Sheet open={open} onOpenChange={onOpenChange}>{content}</Sheet>;
}
