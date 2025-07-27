// This file is now redundant as we are not using next-intl
// and can be removed. I will keep it for now to avoid breaking
// the file structure, but will remove it in a future step.

import { TranslationsProvider } from '@/hooks/use-translations';
import { promises as fs } from 'fs';
import path from 'path';

async function getMessages(locale: string) {
  try {
    const filePath = path.join(process.cwd(), 'messages', `${locale}.json`);
    const fileContent = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch(e) {
    console.error(`Could not load messages for locale: ${locale}`, e);
    // Fallback to English if the locale file is not found
    try {
      const filePath = path.join(process.cwd(), 'messages', `en.json`);
      const fileContent = await fs.readFile(filePath, 'utf8');
      return JSON.parse(fileContent);
    } catch(enError) {
       console.error(`Could not load fallback messages for en`, enError);
       return {}; // Return empty object if even English fails
    }
  }
}

export default async function LocaleLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  const messages = await getMessages(locale);
 
  return (
    <TranslationsProvider messages={messages}>
        {children}
    </TranslationsProvider>
  );
}
