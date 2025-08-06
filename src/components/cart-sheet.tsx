

"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, ShoppingCart, PlusCircle, Loader2, User, Send, Edit } from 'lucide-react';
import React, { ReactNode, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useTranslations } from '@/hooks/use-translations';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { CreateOrderResult } from '@/app/actions/order.actions';
import { CheckoutDialog, StockErrorState } from './checkout-dialog';
import { SuccessDialog } from './success-dialog';
import type { CartItem, Creation } from '@/lib/types';
import { Badge } from './ui/badge';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { cn } from '@/lib/utils';
import { FinalizeCreationDialog } from './finalize-creation-dialog';


export function CartSheet({ children, open, onOpenChange }: {
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { cart, removeFromCart, clearCart, updateCartItem } = useCart();
  const t = useTranslations('Cart');
  const tEditor = useTranslations('Editor');
  const params = useParams();
  const locale = params.locale as string;
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [successData, setSuccessData] = useState<{orderNumber: string, email: string} | null>(null);
  const [stockError, setStockError] = useState<StockErrorState | null>(null);
  const [itemToPublish, setItemToPublish] = useState<CartItem | null>(null);

  const CLASP_PRICE = 1.20;
  const totalItems = cart.length;
  
  const totalPrice = cart.reduce((sum, item) => {
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


  const formatPrice = (price: number) => {
    return t('price', { price });
  };
  
  const handleOrderCreated = (result: CreateOrderResult) => {
     if (result.success && result.orderNumber && result.email) {
        clearCart();
        setIsCheckoutOpen(false);
        setSuccessData({orderNumber: result.orderNumber, email: result.email});
      } else if (!result.success && result.stockError) {
        setStockError({
          message: result.message,
          unavailableModelIds: new Set(result.stockError.unavailableModelIds),
          unavailableCharmIds: new Set(result.stockError.unavailableCharmIds),
        });
      }
      else {
        toast({
          variant: 'destructive',
          title: t('checkout_error_title'),
          description: result.message || "Une erreur inattendue est survenue.",
        });
      }
  }
  
  const handlePublishSuccess = (publishedCreationId: string) => {
    if (itemToPublish) {
      updateCartItem(itemToPublish.id, {
        ...itemToPublish,
        creationId: publishedCreationId,
      });
      setItemToPublish(null); // Close the dialog
    }
  };


  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      {children && <SheetTrigger asChild>{children}</SheetTrigger>}
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-headline text-2xl">{t('title')} {t('item_count', { count: totalItems })}</SheetTitle>
        </SheetHeader>
        {cart.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center text-muted-foreground">
            <ShoppingCart className="w-16 h-16 mb-4" />
            <p className="font-bold text-lg">{t('empty_title')}</p>
            <p className="text-sm">{t('empty_description')}</p>
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
            <div className="p-4 border-b flex-shrink-0">
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
              <div className="space-y-4">
                {cart.map((item) => {
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
                    const editUrl = `/${locale}/?type=${item.jewelryType.id}&model=${item.model.id}&cartItemId=${item.id}`;
                    
                    const isFromAnotherCreator = !!item.creator;
                    const isPublished = !!item.creationId;

                    const descriptionId = `item-description-${item.id}`;
                    const titleId = `item-title-${item.id}`;

                  return (
                    <Card key={item.id} className="overflow-hidden">
                       <CardHeader className="p-4">
                          <div className="flex items-start gap-4">
                            <Dialog>
                              <DialogTrigger asChild>
                                <div className="relative w-24 h-24 flex-shrink-0 rounded-md overflow-hidden border cursor-pointer group">
                                  <Image
                                    src={item.previewImage || item.model.displayImageUrl}
                                    alt={item.model.name}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform"
                                    sizes="96px"
                                  />
                                </div>
                              </DialogTrigger>
                              <DialogContent className="max-w-xl" aria-labelledby={titleId} aria-describedby={descriptionId}>
                                <DialogHeader>
                                  <DialogTitle id={titleId}>{t('preview_title', { modelName: item.model.name })}</DialogTitle>
                                  <DialogDescription id={descriptionId}>
                                    {t('preview_description')}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="mt-4">
                                  <Image
                                    src={item.previewImage || item.model.displayImageUrl}
                                    alt={t('preview_title', { modelName: item.model.name })}
                                    width={800}
                                    height={800}
                                    className="w-full h-auto object-contain rounded-lg max-w-full max-h-[70vh]"
                                  />
                                </div>
                              </DialogContent>
                            </Dialog>
                            <div className="flex-grow min-w-0">
                              <p className="font-bold">{item.model.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.jewelryType.name}
                              </p>
                              {item.creator?.displayName && (
                                <Badge variant="secondary" className="mt-1.5">
                                  <User className="h-3 w-3 mr-1.5"/>
                                  {t('creator_badge', { name: item.creator.displayName })}
                                </Badge>
                              )}
                              <p className="text-lg font-bold mt-2">
                                {formatPrice(itemPrice)}
                              </p>
                            </div>
                          </div>
                      </CardHeader>

                      <Accordion type="single" collapsible className="w-full bg-muted/30">
                        <AccordionItem value="item-details" className="border-t">
                          <AccordionTrigger className="text-sm px-4 py-2 hover:no-underline">
                             <div className="flex justify-between w-full items-center">
                              <span>
                                {item.placedCharms.length > 0 
                                  ? t('view_charms_action', { count: item.placedCharms.length })
                                  : t('item_count_zero')
                                }
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="p-4 pt-0">
                            {item.placedCharms.length > 0 ? (
                              <ul className="space-y-2">
                                {item.placedCharms.map(pc => {
                                    return (
                                  <li key={pc.id} className="flex items-center justify-start gap-2 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Image src={pc.charm.imageUrl} alt={pc.charm.name} width={24} height={24} className="rounded-sm border" data-ai-hint="jewelry charm" />
                                      <span>{pc.charm.name} {pc.withClasp && `(+ ${t('clasp_label')})`}</span>
                                    </div>
                                  </li>
                                )})}
                              </ul>
                            ) : (
                               <p className="text-sm text-muted-foreground text-center py-2">{t('no_charms_for_item')}</p>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                      
                       <CardFooter className={cn("p-2 bg-muted/30 border-t grid gap-2", isFromAnotherCreator ? 'grid-cols-1' : 'grid-cols-3')}>
                          {!isFromAnotherCreator && (
                              <>
                                <SheetClose asChild>
                                    <Button variant="outline" size="sm" asChild className="text-xs">
                                        <Link href={editUrl}>
                                            <Edit className="mr-1.5 h-3 w-3"/>{t('edit_item_button')}
                                        </Link>
                                    </Button>
                                </SheetClose>
                                {!isPublished && (
                                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setItemToPublish(item)}>
                                        <Send className="mr-1.5 h-3 w-3"/> {tEditor('publish_button')}
                                    </Button>
                                )}
                              </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "text-destructive hover:text-destructive text-xs",
                                !isFromAnotherCreator && isPublished && "col-start-2 col-span-2" // Take full width if only this and delete are shown
                            )}
                            onClick={() => removeFromCart(item.id)}
                            disabled={isProcessing}
                          >
                            <Trash2 className="mr-1.5 h-3 w-3"/>{t('remove_item')}
                          </Button>
                        </CardFooter>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
            <SheetFooter className="mt-auto border-t pt-4 flex-shrink-0">
              <div className="w-full space-y-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>{t('total')}</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                  <Button className="w-full" disabled={totalItems === 0 || isCheckoutOpen} onClick={() => setIsCheckoutOpen(true)}>
                     {isProcessing ? <Loader2 className="animate-spin" /> : t('checkout_button')}
                  </Button>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
    {isCheckoutOpen && (
      <CheckoutDialog 
          isOpen={isCheckoutOpen} 
          onOpenChange={setIsCheckoutOpen}
          onOrderCreated={handleOrderCreated}
          stockError={stockError}
          setStockError={setStockError}
      />
    )}
    {successData && (
        <SuccessDialog
            isOpen={!!successData}
            onOpenChange={() => setSuccessData(null)}
            orderNumber={successData.orderNumber}
            email={successData.email}
        />
    )}
    {itemToPublish && (
       <FinalizeCreationDialog
            isOpen={!!itemToPublish}
            onOpenChange={() => setItemToPublish(null)}
            getCanvasDataUri={() => Promise.resolve(itemToPublish.previewImage)}
            onConfirmAddToCart={() => { /* Not used here */ }}
            isEditing={false} // Always a new publication
            placedCharms={itemToPublish.placedCharms.map(pc => ({
                charmId: pc.charm.id,
                position: pc.position,
                rotation: pc.rotation,
            }))}
            jewelryType={itemToPublish.jewelryType}
            model={itemToPublish.model}
            locale={locale}
            onPublishSuccess={handlePublishSuccess} // New prop to handle success
            fromCart={true} // New prop
        />
    )}
    </>
  );
}
