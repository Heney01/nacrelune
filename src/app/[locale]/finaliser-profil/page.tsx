
'use client';

import React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandLogo } from '@/components/icons';
import { initializeUserProfile } from '@/app/actions';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

const initialState = {
  error: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Enregistrer et continuer
    </Button>
  );
}

export default function FinaliserProfilPage() {
  const [state, formAction] = useFormState(initializeUserProfile, initialState);
  const params = useParams();
  const locale = params.locale as string;
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  if (!user) {
    // This should ideally not happen if middleware is correct
    return <p>Utilisateur non authentifié.</p>
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
              <BrandLogo className="h-10 w-auto" />
          </div>
          <CardTitle className="text-2xl">Finalisez votre profil</CardTitle>
          <CardDescription>
            Choisissez un pseudo pour votre espace créateur.
          </CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            {state?.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="userId" value={user.uid} />
            <input type="hidden" name="email" value={user.email || ''} />
            <div className="space-y-2">
              <Label htmlFor="pseudo">Pseudo</Label>
              <Input
                id="pseudo"
                name="pseudo"
                type="text"
                placeholder="Votre pseudo unique"
                required
                minLength={3}
              />
            </div>
          </CardContent>
          <CardFooter>
            <SubmitButton />
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
