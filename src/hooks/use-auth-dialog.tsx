
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type AuthView = 'login' | 'signup';

interface AuthDialogOptions {
  onLoginSuccess?: () => void;
  onSignupSuccess?: () => void;
  isAdminLogin?: boolean;
}

interface AuthDialogContextType {
  isOpen: boolean;
  view: AuthView;
  options: AuthDialogOptions;
  open: (view: AuthView, options?: AuthDialogOptions) => void;
  close: () => void;
  setView: (view: AuthView) => void;
}

const AuthDialogContext = createContext<AuthDialogContextType | undefined>(undefined);

export const AuthDialogProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<AuthView>('login');
  const [options, setOptions] = useState<AuthDialogOptions>({});

  const open = useCallback((view: AuthView, newOptions: AuthDialogOptions = {}) => {
    setView(view);
    setOptions(newOptions);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AuthDialogContext.Provider value={{ isOpen, view, options, open, close, setView }}>
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
