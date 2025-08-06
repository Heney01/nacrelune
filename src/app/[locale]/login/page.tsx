
'use client';

import { useEffect } from 'react';
import { useAuthDialog } from '@/hooks/use-auth-dialog';
import { useRouter, useParams } from 'next/navigation';
import Loading from '../loading';

export default function LoginPage() {
  const { open } = useAuthDialog();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  useEffect(() => {
    // Open the dialog and then redirect to the home page
    // The dialog will remain visible over the home page
    open('login');
    router.replace(`/${locale}`);
  }, [open, router, locale]);

  return <Loading />;
}
