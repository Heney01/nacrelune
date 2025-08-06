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
import { GoogleIcon } from '@/components/icons';
import { signup, userLoginWithGoogle } from '@/app/actions/auth.actions';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from '@/hooks/use-translations';
import { useGoogleAuth } from '@/hooks/use-google-auth';
import { Separator } from './ui/separator';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuthDialog } from '@/hooks/use-auth-dialog';
import { DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';


type State = {
  success: boolean;
  message?: string;
  error?: string;
}

const initialState: State = {
  success: false,
  error: undefined,
  message: undefined,
};

function SignUpButton() {
  const { pending } = useFormStatus();
  const t = useTranslations('Auth');

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {t('signup_button')}
    </Button>
  );
}

export function SignUpForm({ onSignupSuccess }: { onSignupSuccess: () => void }) {
  const [state, formAction] = useFormState(signup, initialState);
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('Auth');
  const { toast } = useToast();
  const { setView } = useAuthDialog();

  const { signInWithGoogle, error: googleError, isGoogleLoading } = useGoogleAuth({
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
            toast({
                title: 'Connexion réussie',
                description: result.message,
            });
            onSignupSuccess();
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
        toast({
            title: 'Inscription réussie',
            description: state.message,
        });
        onSignupSuccess();
    }
  }, [state, toast, onSignupSuccess]);


  return (
    <Card className="border-0 shadow-none">
       <DialogHeader className="text-center pt-6">
        <DialogTitle>{t('user_signup_title')}</DialogTitle>
        <DialogDescription>{t('user_signup_description')}</DialogDescription>
      </DialogHeader>
       <CardContent className="space-y-4 pt-6">
          {(state?.error || googleError) && (
            <Alert variant="destructive">
              <AlertTitle>{t('signup_error_title')}</AlertTitle>
              <AlertDescription>{state.error || googleError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
              <Button variant="outline" className="w-full" onClick={signInWithGoogle} disabled={isGoogleLoading}>
                {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
                {t('google_signup_button')}
            </Button>
            <div className="relative">
                <Separator />
                <span className="absolute left-1/2 -translate-x-1/2 top-[-10px] bg-card px-2 text-xs text-muted-foreground">
                    {t('or_continue_with')}
                </span>
            </div>
          </div>
          <form action={formAction}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">{t('displayName_label')}</Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    type="text"
                    placeholder="Jean Dupont"
                    required
                  />
                </div>
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
                <div className="space-y-2">
                  <Label htmlFor="password">{t('password_label')}</Label>
                  <Input id="password" name="password" type="password" required />
                </div>
                 <div className="pt-2">
                    <SignUpButton />
                 </div>
              </div>
          </form>
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-4">
          <div className="mt-4 text-center text-sm">
            {t('has_account_prompt')}{' '}
            <button type="button" onClick={() => setView('login')} className="underline">
              {t('login_button')}
            </button>
          </div>
      </CardFooter>
    </Card>
  );
}
