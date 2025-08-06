
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
import Loading from '../loading';

export default function ProfileRedirectPage() {
    const { firebaseUser, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const locale = params.locale as string;

    useEffect(() => {
        if (!loading) {
            if (firebaseUser) {
                router.replace(`/${locale}/creators/${firebaseUser.uid}`);
            } else {
                router.replace(`/${locale}/`);
            }
        }
    }, [firebaseUser, loading, router, locale]);

    return <Loading />;
}
