
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NacreluneLogo } from '@/components/icons';
import { login } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';


const initialState = {
  error: null,
};

function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Se connecter
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(login, initialState);
  const params = useParams();
  const locale = params.locale as string;

  useEffect(() => {
    if (state?.error === null) {
      // successful login is handled by redirect in the action
    }
  }, [state]);

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
            <NacreluneLogo className="h-10 w-auto" />
        </div>
        <CardTitle className="text-2xl">Espace Administrateur</CardTitle>
        <CardDescription>
          Connectez-vous pour accéder à votre tableau de bord.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          {state?.error && (
            <Alert variant="destructive">
              <AlertTitle>Erreur de connexion</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <input type="hidden" name="locale" value={locale} />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="admin@nacrelune.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" name="password" type="password" required />
          </div>
        </CardContent>
        <CardFooter>
          <LoginButton />
        </CardFooter>
      </form>
    </Card>
  );
}
