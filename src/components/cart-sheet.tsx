
"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/hooks/use-cart';
import { useTranslations } from '@/hooks/use-translations';
import { Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PurchaseDialog } from './purchase-dialog';
import { usePathname } from 'next/navigation';

export function CartSheetContent() {
    const { cart, removeItem, clearCart, setIsCartOpen } = useCart();
    const t = useTranslations('Editor.Cart');
    const tEditor = useTranslations('Editor');
    const { toast } = useToast();
    const pathname = usePathname();
    const locale = pathname.split('/')[1] || 'en';

    const handleRemoveItem = (itemId: string, modelName: string) => {
        removeItem(itemId);
        toast({
            title: tEditor('toast_item_removed_title'),
            description: tEditor('toast_item_removed_description', { modelName }),
        });
    };

    const handleSuccessfulOrder = () => {
        clearCart();
        setIsCartOpen(false);
    }
    
    const totalPrice = cart.reduce((acc, item) => acc + item.price, 0);

    return (
        <>
            {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-lg text-muted-foreground">{t('empty_message')}</p>
                    <Button asChild className="mt-4" onClick={() => setIsCartOpen(false)}>
                        <Link href={`/${locale}`}>{t('empty_cta')}</Link>
                    </Button>
                </div>
            ) : (
                <>
                    <ScrollArea className="flex-grow p-6">
                        <div className="space-y-6">
                            {cart.map(item => (
                                <div key={item.id} className="flex gap-4">
                                    <Image
                                        src={item.model.displayImageUrl}
                                        alt={item.model.name}
                                        width={80}
                                        height={80}
                                        className="rounded-md border object-cover"
                                        data-ai-hint="jewelry"
                                    />
                                    <div className="flex-grow">
                                        <h3 className="font-semibold">{item.model.name}</h3>
                                        <p className="text-sm text-muted-foreground">{item.jewelryType.name}</p>
                                        <p className="text-sm font-medium mt-1">{item.price.toFixed(2)}€</p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Button asChild variant="outline" size="icon" className="h-8 w-8">
                                            <Link href={`/${locale}?type=${item.jewelryType.id}&model=${item.model.id}&cartItem=${item.id}`}>
                                                <Edit className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleRemoveItem(item.id, item.model.name)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                    <div className="p-6 border-t mt-auto">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-lg font-semibold">{tEditor('PurchaseDialog.total_label')}</span>
                            <span className="text-lg font-semibold">{totalPrice.toFixed(2)}€</span>
                        </div>
                         <PurchaseDialog cart={cart} onSuccessfulOrder={handleSuccessfulOrder} />
                    </div>
                </>
            )}
        </>
    );
}
