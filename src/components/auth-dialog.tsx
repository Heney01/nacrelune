
'use client';

import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAuthDialog } from '@/hooks/use-auth-dialog';
import { LoginForm } from './login-form';
import { SignUpForm } from './signup-form';
import { useRouter } from 'next/navigation';

export function AuthDialog() {
  const { isOpen, close, view } = useAuthDialog();
  const router = useRouter();

  const handleLoginSuccess = () => {
    close();
    router.refresh();
  }
  
  const handleSignupSuccess = () => {
    close();
    router.refresh();
  }

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent 
        className="sm:max-w-md p-0" 
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {view === 'login' 
            ? <LoginForm onLoginSuccess={handleLoginSuccess} /> 
            : <SignUpForm onSignupSuccess={handleSignupSuccess} />}
      </DialogContent>
    </Dialog>
  );
}
