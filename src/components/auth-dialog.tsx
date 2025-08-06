
'use client';

import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAuthDialog } from '@/hooks/use-auth-dialog';
import { LoginForm } from './login-form';
import { SignUpForm } from './signup-form';

export function AuthDialog() {
  const { isOpen, close, view } = useAuthDialog();

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-md p-0">
        {view === 'login' ? <LoginForm /> : <SignUpForm />}
      </DialogContent>
    </Dialog>
  );
}
