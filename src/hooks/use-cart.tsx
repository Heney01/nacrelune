
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { CartItem } from '@/lib/types';
import { useLocalStorage } from './use-local-storage';

interface CartContextType {
  cart: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  updateItem: (itemId: string, updatedItem: CartItem) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [storedCart, setStoredCart] = useLocalStorage<CartItem[]>('nacrelune-cart', []);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Hydrate state from local storage on client side
  useEffect(() => {
    setCart(storedCart);
  }, [storedCart]);

  useEffect(() => {
    setStoredCart(cart);
  }, [cart, setStoredCart]);


  const addItem = (item: Omit<CartItem, 'id'>) => {
    const newItem = { ...item, id: `cart-item-${Date.now()}` };
    setCart(prevCart => [...prevCart, newItem]);
    setIsCartOpen(true);
  };

  const updateItem = (itemId: string, updatedItem: CartItem) => {
    setCart(prevCart => prevCart.map(item => item.id === itemId ? updatedItem : item));
  };

  const removeItem = (itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  return (
    <CartContext.Provider value={{ cart, addItem, updateItem, removeItem, clearCart, isCartOpen, setIsCartOpen }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
