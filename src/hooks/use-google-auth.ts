
'use client';

import { useState } from 'react';
import { getAuth, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { userLoginWithGoogle } from '@/app/actions/auth.actions';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from './use-toast';

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

interface GoogleAuthOptions {
  onSuccess?: (user: User) => void;
  onError?: (error: string) => void;
}

export const useGoogleAuth = (options?: GoogleAuthOptions) => {
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const signInWithGoogle = async () => {
        setIsGoogleLoading(true);
        setError(null);

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            if (options?.onSuccess) {
                await options.onSuccess(user);
            }
        } catch (error: any) {
            let errorMessage = "Une erreur est survenue lors de la connexion avec Google.";
            if (error.code === 'auth/account-exists-with-different-credential') {
                errorMessage = "Un compte existe déjà avec cette adresse e-mail mais avec un mode de connexion différent.";
            } else if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = "La fenêtre de connexion a été fermée avant la fin de l'opération.";
            }
            setError(errorMessage);
            if (options?.onError) {
                options.onError(errorMessage);
            }
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return { signInWithGoogle, isGoogleLoading, error };
};
