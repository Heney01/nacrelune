
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useCart, CartProvider } from '@/hooks/use-cart';
import { useTranslations, TranslationsProvider } from '@/hooks/use-translations';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, ShoppingCart, PlusCircle, Loader2 } from 'lucide-react';
import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Card } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getMessages } from '@/lib/translations';

// This is the actual content of the cart. By creating it as a separate component,
// we can wrap it with the necessary context providers.
function CartContent({ onClose, locale, messages }: { onClose: () => void, locale: string, messages: any }) {
  const t = useTranslations('Editor');
  const { cart, removeFromCart } = useCart();
  
  const totalItems = cart.length;
  
  const totalPrice = cart.reduce((sum, item) => {
    const modelPrice = item.model.price || 0;
    const charmsPrice = item.placedCharms.reduce((charmSum, pc) => charmSum + (pc.charm.price || 0), 0);
    return sum + modelPrice + charmsPrice;
  }, 0);

  return (
    // We re-provide the translation context here because the SheetContent is portaled
    // and loses the original context.
    <TranslationsProvider messages={messages}>
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
                  <PlusCircle className="mr-2 h-4 w-4" />
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
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('create_new_jewel_button')}
                  </Link>
                </Button>
              </SheetClose>
            </div>
            <ScrollArea className="flex-grow my-4 pr-4">
              <Accordion type="multiple" className="space-y-4">
                {cart.map((item) => {
                  const itemPrice = (item.model.price || 0) + item.placedCharms.reduce((charmSum, pc) => charmSum + (pc.charm.price || 0), 0);
                  return (
                    <Card key={item.id} className="overflow-hidden">
                      <div className="p-4 flex items-start gap-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border cursor-pointer group">
                              <Image
                                src={item.previewImage || item.model.displayImageUrl}
                                alt={item.model.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform"
                                sizes="80px"
                              />
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-xl">
                            <DialogHeader>
                              <DialogTitle>{t('cart_preview_title', { modelName: item.model.name })}</DialogTitle>
                              <DialogDescription>
                                {t('cart_preview_description')}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="mt-4 grid place-items-center">
                              <Image
                                src={item.previewImage || item.model.displayImageUrl}
                                alt={`Preview of ${item.model.name}`}
                                width={800}
                                height={800}
                                className="w-full h-auto object-contain rounded-lg max-w-full max-h-[70vh]"
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                        <div className="flex-grow">
                          <p className="font-bold">{item.model.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.jewelryType.name}
                          </p>
                          <p className="text-sm font-bold mt-1">
                            {t('item_price', { price: itemPrice.toFixed(2) })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">{t('cart_remove_item')}</span>
                        </Button>
                      </div>
                      {item.placedCharms.length > 0 && (
                        <AccordionItem value={item.id} className="border-t">
                          <AccordionTrigger className="text-sm px-4 py-2 hover:no-underline hover:bg-muted/50">
                            <div className="flex justify-between w-full items-center">
                              <span>{t('view_charms_action')} ({item.placedCharms.length})</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="p-4 pt-0">
                            <ul className="space-y-2">
                              {item.placedCharms.map(pc => (
                                <li key={pc.id} className="flex items-center justify-between gap-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Image src={pc.charm.imageUrl} alt={pc.charm.name} width={24} height={24} className="rounded-sm border" data-ai-hint="jewelry charm" />
                                    <span>{pc.charm.name}</span>
                                  </div>
                                  <span className="text-muted-foreground">{t('item_price', { price: (pc.charm.price || 0).toFixed(2) })}</span>
                                </li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Card>
                  )
                })}
              </Accordion>
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
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </TranslationsProvider>
  );
}


// The main CartSheet component now manages fetching the messages and passing them down.
export function CartSheet({ children, open, onOpenChange }: {
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'en';
  const [messages, setMessages] = React.useState(null);

  React.useEffect(() => {
    // Reset messages when sheet is closed
    if (!open) {
      setMessages(null);
      return;
    }
    
    // Fetch messages when sheet is opened
    getMessages(locale).then(setMessages);

  }, [open, locale]);

  const handleClose = () => {
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {children && <SheetTrigger asChild>{children}</SheetTrigger>}
      <CartProvider>
          {messages ? (
              <CartContent onClose={handleClose} locale={locale} messages={messages} />
          ) : (
              <SheetContent>
                  <SheetHeader>
                      {/* We provide a basic title to satisfy accessibility requirements during loading */}
                      <SheetTitle>Loading...</SheetTitle>
                  </SheetHeader>
                  <div className="flex justify-center items-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
              </SheetContent>
          )}
      </CartProvider>
    </Sheet>
  );
}
