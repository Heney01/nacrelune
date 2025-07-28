
'use client';

import React, { createContext, useContext } from 'react';
import get from 'lodash.get';

// 1. Create the context
const TranslationsContext = createContext<any>(null);

// 2. Create the provider component
export const TranslationsProvider = ({ children, messages }: { children: React.ReactNode, messages: any }) => {
  return (
    <TranslationsContext.Provider value={messages}>
      {children}
    </TranslationsContext.Provider>
  );
};

// 3. Create the hook
export const useTranslations = (namespace: string) => {
  const messages = useContext(TranslationsContext);

  if (messages === null) {
    throw new Error('useTranslations must be used within a TranslationsProvider');
  }

  return (key: string, values?: Record<string, any>) => {
    let translation = get(messages, `${namespace}.${key}`) as string;

    if (!translation) {
      console.warn(`Translation not found for key: ${namespace}.${key}`);
      return `${namespace}.${key}`;
    }

    if (values) {
      Object.keys(values).forEach(valueKey => {
        translation = translation.replace(`{${valueKey}}`, values[valueKey]);
      });
    }

    return translation;
  };
};

// A hook for using translations without a namespace
export const useRichTranslations = () => {
  const messages = useContext(TranslationsContext);

  if (messages === null) {
    throw new Error('useRichTranslations must be used within a TranslationsProvider');
  }
  
  return (key: string, values?: Record<string, any>) => {
      let translation = get(messages, key) as string;

      if (!translation) {
        console.warn(`Translation not found for key: ${key}`);
        return key;
      }

      if (values) {
        Object.keys(values).forEach(valueKey => {
          translation = translation.replace(`{${valueKey}}`, values[valueKey]);
        });
      }
      return translation;
  }
}