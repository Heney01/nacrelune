
'use server';

import { cookies } from 'next/headers';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Veuillez fournir un email et un mot de passe.' };
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
    return { error: errorMessage };
  }
  
  redirect('/admin/dashboard');
}


export async function logout() {
  cookies().delete('session');
  redirect('/login');
}
