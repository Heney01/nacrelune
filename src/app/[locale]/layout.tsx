

import { TranslationsProvider } from '@/hooks/use-translations';
import { Toaster } from "@/components/ui/toaster";
import '../globals.css';
import { ReactNode } from 'react';
import { getMessages } from '@/lib/translations';
import { CartProvider } from '@/hooks/use-cart';
import { AuthProvider } from '@/hooks/use-auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Atelier à bijoux',
  description: 'Concevez vos propres bijoux personnalisés avec Atelier à bijoux.',
};

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
        <AuthProvider>
            <TranslationsProvider messages={messages}>
                <CartProvider>
                    {children}
                </CartProvider>
            </TranslationsProvider>
            <Toaster />
        </AuthProvider>
  );
}
