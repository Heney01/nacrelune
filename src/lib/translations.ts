
// Define available locales
const availableLocales = ['en', 'fr'];

// Function to get messages for a given locale
export async function getMessages(locale: string) {
  // Validate locale
  const finalLocale = availableLocales.includes(locale) ? locale : 'en';
  try {
    return (await import(`../../messages/${finalLocale}.json`)).default;
  } catch (error) {
    console.error(`Could not load messages for locale: ${finalLocale}`, error);
    // Fallback to English if the locale file is missing
    return (await import(`../../messages/en.json`)).default;
  }
}
