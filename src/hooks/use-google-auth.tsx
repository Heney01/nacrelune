

'use client';

import { useState } from 'react';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { userLoginWithGoogle } from '@/app/actions';
import { useParams } from 'next/navigation';

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export const useGoogleAuth = () => {
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const params = useParams();
    const locale = params.locale as string;

    const signInWithGoogle = async () => {
        setIsGoogleLoading(true);
        setError(null);

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const idToken = await user.getIdToken();

            // Create a FormData object to send to the server action
            const formData = new FormData();
            formData.append('idToken', idToken);
            formData.append('locale', locale);
            formData.append('uid', user.uid);
            formData.append('displayName', user.displayName || '');
            formData.append('email', user.email || '');
            formData.append('photoURL', user.photoURL || '');

            // Call the server action
            const actionResult = await userLoginWithGoogle(formData);

            if (actionResult?.error) {
                setError(actionResult.error);
            }
            // The action handles redirection on success

        } catch (error: any) {
            let errorMessage = "Une erreur est survenue lors de la connexion avec Google.";
            if (error.code === 'auth/account-exists-with-different-credential') {
                errorMessage = "Un compte existe déjà avec cette adresse e-mail mais avec un mode de connexion différent.";
            } else if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = "La fenêtre de connexion a été fermée avant la fin de l'opération.";
            }
            setError(errorMessage);
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return { signInWithGoogle, isGoogleLoading, error };
};
