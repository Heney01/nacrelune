'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog';
import { useAuthDialog } from '@/hooks/use-auth-dialog';
import { LoginForm } from './login-form';
import { SignUpForm } from './signup-form';
import { useRouter } from 'next/navigation';
import { DialogHeader, DialogTitle } from './ui/dialog';


export function AuthDialog() {
  const { isOpen, close, view, setView } = useAuthDialog();
  const router = useRouter();

  const handleLoginSuccess = () => {
    close();
  }
  
  const handleSignupSuccess = () => {
    close();
  }

  const descriptionId = view === 'login' ? 'login-dialog-desc' : 'signup-dialog-desc';
  const titleId = view === 'login' ? 'login-dialog-title' : 'signup-dialog-title';

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent 
        className="sm:max-w-md p-0" 
        onOpenAutoFocus={(e) => e.preventDefault()}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        {view === 'login' 
            ? <LoginForm onLoginSuccess={handleLoginSuccess} /> 
            : <SignUpForm onSignupSuccess={handleSignupSuccess} />}
      </DialogContent>
    </Dialog>
  );
}
