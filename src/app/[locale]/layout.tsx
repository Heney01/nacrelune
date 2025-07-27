
import { TranslationsProvider } from '@/hooks/use-translations';
import { Toaster } from "@/components/ui/toaster";
import '../globals.css';
import { ReactNode } from 'react';

// Define available locales
const availableLocales = ['en', 'fr'];

// Function to get messages for a given locale
async function getMessages(locale: string) {
  // Validate locale
  const finalLocale = availableLocales.includes(locale) ? locale : 'en';
  try {
    return (await import(`../../../messages/${finalLocale}.json`)).default;
  } catch (error) {
    console.error(`Could not load messages for locale: ${finalLocale}`, error);
    // Fallback to English if the locale file is missing
    return (await import(`../../../messages/en.json`)).default;
  }
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: ReactNode;
  params: { locale: string };
}) {
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
                {children}
            </TranslationsProvider>
            <Toaster />
        </body>
    </html>
  );
}
