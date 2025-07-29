
const availableLocales = ['en', 'fr'] as const;
type Locale = typeof availableLocales[number];

export function getStaticParams() {
  return availableLocales.map((locale) => ({ locale }));
}

export async function getMessages(locale: string) {
  const finalLocale: Locale = availableLocales.includes(locale as Locale) ? locale as Locale : 'en';
  try {
    return (await import(`../messages/${finalLocale}.json`)).default;
  } catch (error) {
    console.error(`Could not load messages for locale: ${finalLocale}`, error);
    return (await import(`../messages/en.json`)).default;
  }
}
