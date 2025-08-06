
'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthDialog } from '@/hooks/use-auth-dialog';
import { LoginForm } from './login-form';
import { SignUpForm } from './signup-form';
import { useTranslations } from '@/hooks/use-translations';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

export function AuthDialog() {
  const { isOpen, close, view, setView } = useAuthDialog();
  const t = useTranslations('Auth');
  const router = useRouter();

  const handleLoginSuccess = () => {
    close();
    router.refresh();
  }

  const title = view === 'login' ? t('user_login_title') : t('user_signup_title');
  const description = view === 'login' ? t('user_login_description') : t('user_signup_description');

  const descriptionId = view === 'login' ? 'login-description' : 'signup-description';

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent 
        className="sm:max-w-md p-0" 
        aria-describedby={descriptionId}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription id={descriptionId}>{description}</DialogDescription>
        </DialogHeader>
        {view === 'login' 
            ? <LoginForm onLoginSuccess={handleLoginSuccess} /> 
            : <SignUpForm onSignupSuccess={handleLoginSuccess} />}
      </DialogContent>
    </Dialog>
  );
}
