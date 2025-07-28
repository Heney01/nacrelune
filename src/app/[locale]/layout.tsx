
import { TranslationsProvider } from '@/hooks/use-translations';
import { Toaster } from "@/components/ui/toaster";
import '../globals.css';
import { ReactNode } from 'react';
import { getMessages } from '@/lib/translations';
import { CartProvider } from '@/hooks/use-cart';


export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  const messages = await getMessages(locale);

  return (
    <html lang={locale}>
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