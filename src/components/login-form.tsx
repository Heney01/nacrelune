

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
import { login, userLogin } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from '@/hooks/use-translations';
import { Separator } from './ui/separator';
import { useGoogleAuth } from '@/hooks/use-google-auth';


const initialState = {
  error: '',
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

export function LoginForm({ isUserAuth = false }: { isUserAuth?: boolean }) {
  const [state, formAction] = useFormState(isUserAuth ? userLogin : login, initialState);
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('Auth');
  const { signInWithGoogle, error, isGoogleLoading } = useGoogleAuth();

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
            <BrandLogo className="h-10 w-auto" />
        </div>
        <CardTitle className="text-2xl">{isUserAuth ? t('user_login_title') : t('admin_login_title')}</CardTitle>
        <CardDescription>
           {isUserAuth ? t('user_login_description') : t('admin_login_description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(state?.error || error) && (
            <Alert variant="destructive">
              <AlertTitle>{t('login_error_title')}</AlertTitle>
              <AlertDescription>{state?.error || error}</AlertDescription>
            </Alert>
          )}

        {isUserAuth && (
            <div className="space-y-4">
                 <Button variant="outline" className="w-full" onClick={signInWithGoogle} disabled={isGoogleLoading}>
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
        )}

        <form action={formAction}>
          <input type="hidden" name="locale" value={locale} />
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
              {isUserAuth && (
                <div className="mt-4 text-center text-sm">
                  {t('no_account_prompt')}{' '}
                  <Link href={`/${locale}/inscription`} className="underline">
                    {t('signup_button')}
                  </Link>
                </div>
              )}
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
