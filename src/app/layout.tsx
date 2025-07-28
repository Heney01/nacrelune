import { Toaster } from "@/components/ui/toaster";
import './globals.css';
import { ReactNode } from 'react';
import { CartProvider } from '@/hooks/use-cart';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nacrelune',
  description: 'Concevez vos propres bijoux personnalisés avec Nacrelune.',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="fr">
        <head>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@400;700&display=swap" rel="stylesheet"></link>
        </head>
        <body className="font-body antialiased">
            <CartProvider>
                {children}
            </CartProvider>
            <Toaster />
        </body>
    </html>
  );
}