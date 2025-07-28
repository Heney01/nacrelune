
"use client";

import { useCart } from "@/hooks/use-cart";
import { ShoppingCart } from "lucide-react";
import { Button } from "./ui/button";
import { useTranslations } from "@/hooks/use-translations";
import { useEffect, useState } from "react";
import { CartSheet } from "./cart-sheet";

export function CartWidget() {
  const { cart } = useCart();
  const t = useTranslations('Editor');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const itemCount = cart.length;

  if (!hasMounted) {
    return (
        <Button variant="ghost" size="icon" className="relative">
            <ShoppingCart className="h-6 w-6" />
            <span className="sr-only">{t('cart_title')}</span>
        </Button>
    );
  }

  return (
    <CartSheet>
        <Button variant="ghost" size="icon" className="relative">
            <ShoppingCart className="h-6 w-6" />
            {itemCount > 0 && (
                <span className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center transform translate-x-1/4 -translate-y-1/4">
                    {itemCount}
                </span>
            )}
            <span className="sr-only">{t('cart_title')}</span>
        </Button>
    </CartSheet>
  );
}
