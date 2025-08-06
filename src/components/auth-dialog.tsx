'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog';
import { useAuthDialog } from '@/hooks/use-auth-dialog';
import { LoginForm } from './login-form';
import { SignUpForm } from './signup-form';
import { useRouter } from 'next/navigation';
import { DialogHeader, DialogTitle } from './ui/dialog';
import { useTranslations } from '@/hooks/use-translations';


export function AuthDialog() {
  const { isOpen, close, view, setView, options } = useAuthDialog();
  const router = useRouter();
  const t = useTranslations('Auth');

  const handleLoginSuccess = () => {
    if (options?.onLoginSuccess) {
      options.onLoginSuccess();
    }
    close();
  }
  
  const handleSignupSuccess = () => {
    if (options?.onSignupSuccess) {
      options.onSignupSuccess();
    }
    close();
  }

  const getTitle = () => {
    if (view === 'login') {
      return options?.isAdminLogin ? t('admin_login_title') : t('user_login_title');
    }
    return t('user_signup_title');
  }

  const getDescription = () => {
     if (view === 'login') {
      return options?.isAdminLogin ? t('admin_login_description') : t('user_login_description');
    }
    return t('user_signup_description');
  }

  const titleId = view === 'login' ? 'login-dialog-title' : 'signup-dialog-title';
  const descriptionId = view === 'login' ? 'login-dialog-desc' : 'signup-dialog-desc';

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent 
        className="sm:max-w-md" 
        onOpenAutoFocus={(e) => e.preventDefault()}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <DialogHeader className="text-center">
            <DialogTitle id={titleId}>{getTitle()}</DialogTitle>
            <DialogDescription id={descriptionId}>{getDescription()}</DialogDescription>
        </DialogHeader>
        {view === 'login' 
            ? <LoginForm onLoginSuccess={handleLoginSuccess} /> 
            : <SignUpForm onSignupSuccess={handleSignupSuccess} />}
      </DialogContent>
    </Dialog>
  );
}
