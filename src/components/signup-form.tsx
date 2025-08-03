

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
import { BrandLogo, GoogleIcon } from '@/components/icons';
import { signup } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from '@/hooks/use-translations';
import { useGoogleAuth } from '@/hooks/use-google-auth';
import { Separator } from './ui/separator';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

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

export function SignUpForm() {
  const [state, formAction] = useFormState(signup, initialState);
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const t = useTranslations('Auth');
  const { signInWithGoogle, error: googleError, isGoogleLoading } = useGoogleAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (state.success) {
        toast({
            title: 'Inscription réussie',
            description: state.message,
        });
        router.push(`/${locale}`);
    }
  }, [state.success, state.message, toast, router, locale]);


  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
            <BrandLogo className="h-10 w-auto" />
        </div>
        <CardTitle className="text-2xl">{t('user_signup_title')}</CardTitle>
        <CardDescription>
           {t('user_signup_description')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
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
                <input type="hidden" name="locale" value={locale} />
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
            <Link href={`/${locale}/connexion`} className="underline">
              {t('login_button')}
            </Link>
          </div>
      </CardFooter>
    </Card>
  );
}
