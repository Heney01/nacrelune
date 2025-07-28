
"use client";

import { useCart } from "@/hooks/use-cart";
import { ShoppingCart } from "lucide-react";
import { Button } from "./ui/button";
import { useTranslations } from "@/hooks/use-translations";
import { useEffect, useState } from "react";

export function CartWidget() {
  const { cart } = useCart();
  const t = useTranslations('Editor');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
        <Button variant="ghost">
            <ShoppingCart className="h-6 w-6" />
            <span className="sr-only">{t('cart_title')}</span>
        </Button>
    );
  }

  const itemCount = cart.length;

  return (
    <Button variant="ghost">
        <ShoppingCart className="h-6 w-6" />
        {itemCount > 0 && (
            <span className="ml-2 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {itemCount}
            </span>
        )}
        <span className="sr-only">{t('cart_title')}</span>
    </Button>
  );
}
