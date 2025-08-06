
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GoogleIcon, BrandLogo } from '@/components/icons';
import { userLogin, userLoginWithGoogle } from '@/app/actions/auth.actions';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from '@/hooks/use-translations';
import { Separator } from './ui/separator';
import { useGoogleAuth } from '@/hooks/use-google-auth';
import { useToast } from '@/hooks/use-toast';
import { useAuthDialog } from '@/hooks/use-auth-dialog';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '@/lib/firebase';


type State = {
  success: boolean;
  traces: string[];
  error?: string;
}

const initialState: State = {
  success: false,
  traces: [],
  error: undefined,
};

function LoginButton() {
  const { pending } = useFormStatus();
  const t = useTranslations('Auth');

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {t('login_button')}
    </Button>
  );
}

export function LoginForm({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [state, formAction] = useFormState(userLogin, initialState);
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('Auth');
  const { toast } = useToast();
  const { setView } = useAuthDialog();

  const [isClientSigningIn, setIsClientSigningIn] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  
  const { signInWithGoogle, error, isGoogleLoading } = useGoogleAuth({
      onSuccess: async (user) => {
          const idToken = await user.getIdToken();
          const formData = new FormData();
          formData.append('idToken', idToken);
          formData.append('locale', locale);
          formData.append('uid', user.uid);
          formData.append('displayName', user.displayName || '');
          formData.append('email', user.email || '');
          formData.append('photoURL', user.photoURL || '');
          
          const result = await userLoginWithGoogle(formData);
          if (result.success) {
            onLoginSuccess();
          } else {
            toast({
              variant: 'destructive',
              title: t('login_error_title'),
              description: result.message,
            });
          }
      }
  });

  useEffect(() => {
    if (state.success) {
      const email = formRef.current?.email.value;
      const password = formRef.current?.password.value;

      if (email && password) {
        setIsClientSigningIn(true);
        const auth = getAuth(app);
        signInWithEmailAndPassword(auth, email, password)
          .then(() => {
            onLoginSuccess();
          })
          .catch((clientError) => {
            // This should rarely happen if server-side login succeeded
            console.error("Client-side sign-in failed after server-side success:", clientError);
            toast({
              variant: 'destructive',
              title: 'Erreur de synchronisation',
              description: "La session n'a pas pu être établie côté client. Veuillez réessayer.",
            });
          })
          .finally(() => {
            setIsClientSigningIn(false);
          });
      } else {
        // Fallback in case formRef is not available, though unlikely.
        onLoginSuccess();
      }
    } else if (state.error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: state.error,
      });
    }
  }, [state, toast, onLoginSuccess]);

  return (
    <Card className="border-0 shadow-none">
       <div className="flex justify-center pt-6">
        <BrandLogo className="h-10 w-auto" />
      </div>
      <DialogHeader className="text-center pt-4">
        <DialogTitle>{t('user_login_title')}</DialogTitle>
        <DialogDescription>{t('user_login_description')}</DialogDescription>
      </DialogHeader>
       <CardContent className="space-y-4 pt-6">
        {(state?.error || error) && (
            <Alert variant="destructive">
              <AlertTitle>{t('login_error_title')}</AlertTitle>
              <AlertDescription>{state?.error || error}</AlertDescription>
            </Alert>
          )}

        <div className="space-y-4">
             <Button variant="outline" className="w-full" onClick={signInWithGoogle} disabled={isGoogleLoading || isClientSigningIn}>
                {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
                {t('google_login_button')}
            </Button>
            <div className="relative">
                <Separator />
                <span className="absolute left-1/2 -translate-x-1/2 top-[-10px] bg-card px-2 text-xs text-muted-foreground">
                    {t('or_continue_with')}
                </span>
            </div>
        </div>

        <form action={formAction} ref={formRef}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="votre.email@exemple.com"
              required
            />
          </div>
          <div className="space-y-2 mt-4">
            <Label htmlFor="password">{t('password_label')}</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <CardFooter className="flex-col gap-4 items-stretch p-0 pt-6">
            <LoginButton />
            <div className="mt-4 text-center text-sm">
              {t('no_account_prompt')}{' '}
              <button type="button" onClick={() => setView('signup')} className="underline">
                {t('signup_button')}
              </button>
            </div>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
