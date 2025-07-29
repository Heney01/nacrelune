
'use client';

import React, { createContext, useContext, useCallback } from 'react';
import get from 'lodash.get';

const TranslationsContext = createContext<any>(null);

export const TranslationsProvider = ({ children, messages }: { children: React.ReactNode, messages: any }) => {
  return (
    <TranslationsContext.Provider value={messages}>
      {children}
    </TranslationsContext.Provider>
  );
};

export const useTranslations = (namespace: string) => {
  const messages = useContext(TranslationsContext);

  if (messages === null) {
    throw new Error('useTranslations must be used within a TranslationsProvider');
  }

  const t = useCallback((key: string, values?: Record<string, any>) => {
    const messageKey = `${namespace}.${key}`;
    let translation = get(messages, messageKey) as string;

    if (translation === undefined) {
      console.warn(`Translation not found for key: ${messageKey}`);
      return messageKey;
    }

    if (values) {
      // Handle ICU message formatting for currencies and numbers
      if (translation.includes('{price, number,') && values.price !== undefined) {
          const currency = translation.includes('::currency/USD') ? 'USD' : 'EUR';
          const locale = translation.includes('::currency/USD') ? 'en-US' : 'fr-FR';
          try {
            return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(values.price);
          } catch(e) {
             return `${values.price}`;
          }
      }

      Object.keys(values).forEach(valueKey => {
        const regex = new RegExp(`{${valueKey}}`, 'g');
        translation = translation.replace(regex, values[valueKey]);
      });
    }

    return translation;
  }, [messages, namespace]);

  return t;
};

