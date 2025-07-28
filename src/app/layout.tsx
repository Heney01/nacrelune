
import { Toaster } from "@/components/ui/toaster";
import './globals.css';
import { ReactNode } from 'react';
import { CartProvider } from '@/hooks/use-cart';
import { TranslationsProvider } from '@/hooks/use-translations';
import messages from '@/messages/en.json';


export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
        <head>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@400;700&display=swap" rel="stylesheet"></link>
        </head>
        <body className="font-body antialiased">
            <TranslationsProvider messages={messages}>
                <CartProvider>
                    {children}
                </CartProvider>
            </TranslationsProvider>
            <Toaster />
        </body>
    </html>
  );
}
