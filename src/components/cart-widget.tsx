
"use client";

import { useCart } from "@/hooks/use-cart";
import { ShoppingCart } from "lucide-react";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { CartSheet } from "./cart-sheet";

export function CartWidget() {
  const { cart } = useCart();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const itemCount = cart.length;

  if (!hasMounted) {
    return (
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
            <ShoppingCart className="h-5 w-5" />
            <span className="sr-only">Your Cart</span>
        </Button>
    );
  }

  return (
    <CartSheet>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
                <span className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center transform translate-x-1/4 -translate-y-1/4">
                    {itemCount}
                </span>
            )}
            <span className="sr-only">Votre panier</span>
        </Button>
    </CartSheet>
  );
}
