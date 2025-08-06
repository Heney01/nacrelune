
'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthDialog } from '@/hooks/use-auth-dialog';
import { LoginForm } from './login-form';
import { SignUpForm } from './signup-form';
import { useTranslations } from '@/hooks/use-translations';

export function AuthDialog() {
  const { isOpen, close, view } = useAuthDialog();
  const t = useTranslations('Auth');

  const title = view === 'login' ? t('user_login_title') : t('user_signup_title');
  const description = view === 'login' ? t('user_login_description') : t('user_signup_description');

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-md p-0" aria-describedby={description}>
         <DialogHeader className="hidden">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {view === 'login' ? <LoginForm /> : <SignUpForm />}
      </DialogContent>
    </Dialog>
  );
}
