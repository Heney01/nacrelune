
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { CartSheetContent } from './cart-sheet';

export function CartWidget() {
    const { cart, isCartOpen, setIsCartOpen } = useCart();
    
    return (
        <>
            <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(true)}>
                <ShoppingBag />
                {cart.length > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                        {cart.length}
                    </span>
                )}
                <span className="sr-only">View Cart</span>
            </Button>
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
                    <SheetHeader className="p-6 pb-4 border-b">
                        <SheetTitle>Your Cart</SheetTitle>
                    </SheetHeader>
                    <CartSheetContent />
                </SheetContent>
            </Sheet>
        </>
    );
}
