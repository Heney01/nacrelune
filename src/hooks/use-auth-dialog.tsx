
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type AuthView = 'login' | 'signup';

interface AuthDialogContextType {
  isOpen: boolean;
  view: AuthView;
  open: (view: AuthView) => void;
  close: () => void;
  setView: (view: AuthView) => void;
}

const AuthDialogContext = createContext<AuthDialogContextType | undefined>(undefined);

export const AuthDialogProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<AuthView>('login');

  const open = useCallback((view: AuthView) => {
    setView(view);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AuthDialogContext.Provider value={{ isOpen, view, open, close, setView }}>
      {children}
    </AuthDialogContext.Provider>
  );
};

export const useAuthDialog = () => {
  const context = useContext(AuthDialogContext);
  if (context === undefined) {
    throw new Error('useAuthDialog must be used within an AuthDialogProvider');
  }
  return context;
};
