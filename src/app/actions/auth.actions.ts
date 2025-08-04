
'use server';

import { cookies } from 'next/headers';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, query, where, getDocs, collection, limit } from 'firebase/firestore';
import { db, app } from '@/lib/firebase';
import type { User } from '@/lib/types';
import { redirect } from 'next/navigation';


export async function login(prevState: any, formData: FormData): Promise<{ success: boolean; message?: string; error?: string; }> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const locale = formData.get('locale') as string || 'fr';

  if (!email || !password) {
    return { success: false, error: 'Veuillez fournir un email et un mot de passe.' };
  }

  const auth = getAuth(app);
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();
    
    cookies().set('session', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });
    
    // Don't redirect from here, let the client handle it after showing toast.
    return { success: true, message: "Connexion réussie !" };

  } catch (error: any) {
    let errorMessage = "Une erreur inconnue est survenue.";
    switch (error.code) {
        case 'auth/invalid-email':
            errorMessage = "L'adresse e-mail n'est pas valide.";
            break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            errorMessage = "Email ou mot de passe incorrect.";
            break;
        default:
            errorMessage = "Une erreur est survenue lors de la connexion.";
            break;
    }
    return { success: false, error: errorMessage };
  }
}

export async function userLogin(prevState: any, formData: FormData): Promise<{ success: boolean; message?: string; error?: string; }> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const locale = formData.get('locale') as string || 'fr';

  if (!email || !password) {
    return { success: false, error: 'Veuillez fournir un email et un mot de passe.' };
  }

  const auth = getAuth(app);
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();
    
    cookies().set('session', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days for users
      path: '/',
    });
    
    // Don't redirect from here, let the client handle it after showing toast.
    return { success: true, message: `Bienvenue, ${user.displayName || user.email} !` };

  } catch (error: any) {
    let errorMessage = "Une erreur inconnue est survenue.";
    switch (error.code) {
        case 'auth/invalid-email':
            errorMessage = "L'adresse e-mail n'est pas valide.";
            break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            errorMessage = "Email ou mot de passe incorrect.";
            break;
        default:
            errorMessage = "Une erreur est survenue lors de la connexion.";
            break;
    }
    return { success: false, error: errorMessage };
  }
}

export async function signup(prevState: any, formData: FormData): Promise<{ success: boolean; message?: string; error?: string; }> {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const displayName = formData.get('displayName') as string;
    const locale = formData.get('locale') as string || 'fr';

    if (!email || !password || !displayName) {
        return { success: false, error: 'Veuillez remplir tous les champs.' };
    }

    const auth = getAuth(app);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName });
        
        const searchableTerms = displayName.toLowerCase().split(' ').filter(Boolean);

        const userData: Omit<User, 'uid'> = {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            rewardPoints: 0,
            searchableTerms,
        };
        await setDoc(doc(db, 'users', user.uid), userData);

        const idToken = await user.getIdToken();
        cookies().set('session', idToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });
        
        // Don't redirect from here, let the client handle it after showing toast.
        return { success: true, message: `Bienvenue, ${displayName} !` };

    } catch (error: any) {
        let errorMessage = "Une erreur inconnue est survenue.";
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = "L'adresse e-mail n'est pas valide.";
                break;
            case 'auth/email-already-in-use':
                errorMessage = "Cette adresse e-mail est déjà utilisée.";
                break;
            case 'auth/weak-password':
                errorMessage = "Le mot de passe doit contenir au moins 6 caractères.";
                break;
            default:
                errorMessage = "Une erreur est survenue lors de l'inscription.";
                break;
        }
        return { success: false, error: errorMessage };
    }
}


export async function userLoginWithGoogle(formData: FormData): Promise<{ success: boolean; message?: string; error?: string; }> {
  const idToken = formData.get('idToken') as string;
  const locale = formData.get('locale') as string || 'fr';
  const displayName = formData.get('displayName') as string;
  const email = formData.get('email') as string;
  const photoURL = formData.get('photoURL') as string;
  const uid = formData.get('uid') as string;

  if (!idToken) {
    return { success: false, error: 'Token de connexion manquant.' };
  }

  try {
    // Check if user already exists in Firestore
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // If user does not exist, create a new document
      const searchableTerms = displayName.toLowerCase().split(' ').filter(Boolean);
      const newUser: Omit<User, 'uid'> = {
        email,
        displayName,
        photoURL,
        rewardPoints: 0,
        searchableTerms,
      };
      await setDoc(userDocRef, newUser);
    }
    
    cookies().set('session', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    
    return { success: true, message: `Bienvenue, ${displayName || email} !` };

  } catch (error: any) {
    console.error("Error during Google Sign-in server action:", error);
    return { success: false, error: "Une erreur est survenue lors de la connexion avec Google." };
  }
}


export async function logout(locale: string) {
  cookies().delete('session');
  redirect(`/${locale}/connexion`);
}
