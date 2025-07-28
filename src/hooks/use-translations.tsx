
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

  return useCallback((key: string, values?: Record<string, any>) => {
    let translation = get(messages, `${namespace}.${key}`) as string;

    if (translation === undefined) {
      console.warn(`Translation not found for key: ${namespace}.${key}`);
      return `${namespace}.${key}`;
    }

    if (values) {
      Object.keys(values).forEach(valueKey => {
        const regex = new RegExp(`{${valueKey}}`, 'g');
        translation = translation.replace(regex, values[valueKey]);
      });
    }

    return translation;
  }, [messages, namespace]);
};
