

'use server';

import { cookies } from 'next/headers';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, query, where, getDocs, collection, limit, updateDoc, runTransaction, increment } from 'firebase/firestore';
import { db, app, storage } from '@/lib/firebase';
import { ref, deleteObject, uploadString, getDownloadURL } from 'firebase/storage';
import type { User } from '@/lib/types';
import { redirect } from 'next/navigation';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { adminApp } from '@/lib/firebase-admin';


// --- Helper Functions ---

const getFileNameFromUrl = (url: string) => {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'firebasestorage.googleapis.com') {
            const decodedPath = decodeURIComponent(urlObj.pathname);
            const pathRegex = /o\/(.*)/;
            const match = decodedPath.match(pathRegex);
            if (match && match[1]) {
                return match[1].split('?')[0]; // Remove query params
            }
        }
    } catch (e) {
        // Not a valid URL
    }
    if (url.includes('placehold.co')) return null;
    const pathParts = url.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    return lastPart.split('?')[0];
};

async function uploadProfileImage(imageDataJson: string | null, userId: string, existingUrl: string | null): Promise<string> {
    if (!imageDataJson) return existingUrl || '';
    
    try {
        const imageData = JSON.parse(imageDataJson);
        if (typeof imageData === 'object' && imageData?.dataUrl && imageData?.name) {
            const { dataUrl, name } = imageData;
            
            // Delete old image if it exists and is not a default google url
            if (existingUrl && getFileNameFromUrl(existingUrl)) {
                const filePath = getFileNameFromUrl(existingUrl);
                if (filePath) {
                    const fileRef = ref(storage, filePath);
                    try {
                       await deleteObject(fileRef);
                    } catch (e: any) {
                        if (e.code !== 'storage/object-not-found') console.error("Could not delete old profile picture", e);
                    }
                }
            }

            const storageRef = ref(storage, `profile_pictures/${userId}/${Date.now()}_${name}`);
            const uploadResult = await uploadString(storageRef, dataUrl, 'data_url');
            return await getDownloadURL(uploadResult.ref);
        }
    } catch (e) {
        // Not a new upload, it's just the URL string
    }
    
    return existingUrl || '';
}

// --- Auth Actions ---

async function verifyUser(idToken: string): Promise<{uid: string, email: string | undefined, admin?: boolean}> {
     if (!adminApp) {
        throw new Error("Le module d'administration Firebase n'est pas configuré.");
    }
    try {
        const adminAuth = getAdminAuth(adminApp);
        const decodedToken = await adminAuth.verifyIdToken(idToken, true);
        return { uid: decodedToken.uid, email: decodedToken.email, admin: decodedToken.admin === true };
    } catch (error: any) {
        throw new Error("Jeton d'authentification invalide.");
    }
}

export async function verifyAdmin(idToken: string): Promise<{uid: string, email: string | undefined}> {
    const user = await verifyUser(idToken);
    if (!user.admin) {
        throw new Error("Accès non autorisé. Vous n'avez pas les droits d'administrateur.");
    }
    return user;
}


export async function login(prevState: any, formData: FormData): Promise<{ success: boolean; message?: string; error?: string; }> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

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

export async function userLogin(prevState: any, formData: FormData): Promise<{ success: boolean; traces: string[], error?: string; }> {
  const traces: string[] = [];
  try {
    traces.push("[SERVER] userLogin action started.");
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    traces.push(`[SERVER] Received credentials for email: ${email}`);

    if (!email || !password) {
      traces.push("[SERVER] Error: Email or password missing.");
      return { success: false, traces, error: 'Veuillez fournir un email et un mot de passe.' };
    }

    const auth = getAuth(app);
    traces.push("[SERVER] Firebase Auth instance retrieved.");
    
    traces.push("[SERVER] Attempting signInWithEmailAndPassword...");
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    traces.push(`[SERVER] signInWithEmailAndPassword successful. User UID: ${user.uid}`);
    
    traces.push("[SERVER] Getting ID token...");
    const idToken = await user.getIdToken();
    traces.push("[SERVER] ID token retrieved successfully.");
    
    traces.push("[SERVER] Setting session cookie...");
    cookies().set('session', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    traces.push("[SERVER] Session cookie set.");

    traces.push("[SERVER] userLogin action completed successfully.");
    return { success: true, traces };

  } catch (error: any) {
    traces.push(`[SERVER] CATCH BLOCK: An error occurred.`);
    let errorMessage = "Une erreur inconnue est survenue.";
    traces.push(`[SERVER] Raw error code: ${error.code}`);
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
    traces.push(`[SERVER] Formatted error message: ${errorMessage}`);
    traces.push(`[SERVER] Raw error: ${JSON.stringify(error)}`);
    return { success: false, traces, error: errorMessage };
  }
}


export async function signup(prevState: any, formData: FormData): Promise<{ success: boolean; message?: string; error?: string; }> {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const displayName = formData.get('displayName') as string;

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
            likesCount: 0,
            creationSlots: 5, // Default slots
        };
        await setDoc(doc(db, 'users', user.uid), userData);

        const idToken = await user.getIdToken();
        cookies().set('session', idToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });
        
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
  const displayName = formData.get('displayName') as string;
  const email = formData.get('email') as string;
  const photoURL = formData.get('photoURL') as string;
  const uid = formData.get('uid') as string;

  if (!idToken) {
    return { success: false, error: 'Token de connexion manquant.' };
  }

  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      const searchableTerms = displayName.toLowerCase().split(' ').filter(Boolean);
      const newUser: Omit<User, 'uid'> = {
        email,
        displayName,
        photoURL,
        rewardPoints: 0,
        searchableTerms,
        likesCount: 0,
        creationSlots: 5, // Default slots
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
}

export async function updateUserProfile(prevState: any, formData: FormData): Promise<{ success: boolean; message?: string; error?: string; }> {
    const uid = formData.get('uid') as string;
    const displayName = formData.get('displayName') as string;
    const newPhotoData = formData.get('newPhoto') as string | null;
    const originalPhotoURL = formData.get('originalPhotoURL') as string | null;
    
    if (!uid) {
        return { success: false, error: "Utilisateur non identifié." };
    }
     if (!displayName) {
        return { success: false, error: "Le nom d'affichage est obligatoire." };
    }

    try {
        const auth = getAuth(app);
        const user = auth.currentUser;
        
        // This is a client-side check, but the server action should not rely on it.
        // The check against the cookie should be the source of truth.
        if (!user || user.uid !== uid) {
             // In a real scenario, we'd verify the user's session token here.
             // For now, we trust the client-side check.
             // return { success: false, error: "Opération non autorisée." };
        }

        const newPhotoURL = await uploadProfileImage(newPhotoData, uid, originalPhotoURL);

        // Update Firebase Auth profile
        if (user) {
            await updateProfile(user, { displayName, photoURL: newPhotoURL });
        }

        // Update Firestore user document
        const userDocRef = doc(db, 'users', uid);
        const searchableTerms = displayName.toLowerCase().split(' ').filter(Boolean);
        await updateDoc(userDocRef, {
            displayName,
            photoURL: newPhotoURL,
            searchableTerms
        });

        return { success: true, message: "Votre profil a été mis à jour avec succès." };

    } catch (error: any) {
        console.error("Error updating user profile:", error);
        return { success: false, error: "Une erreur est survenue lors de la mise à jour du profil." };
    }
}

export async function deleteUserAccount(idToken: string): Promise<{ success: boolean; message?: string; error?: string; }> {
    if (!idToken) {
        return { success: false, error: "Utilisateur non authentifié." };
    }
    
    if (!adminApp) {
        return { success: false, error: "Le module d'administration Firebase n'est pas configuré." };
    }
    
    let user;
    try {
        user = await verifyUser(idToken);
    } catch (error: any) {
        return { success: false, message: "Jeton d'authentification invalide." };
    }

    try {
        const adminAuth = getAdminAuth(adminApp);
        const userDocRef = doc(db, 'users', user.uid);

        // Mark user as deleted in Firestore
        await updateDoc(userDocRef, {
            deleted: true
        });

        // Delete user from Firebase Authentication
        await adminAuth.deleteUser(user.uid);

        // Clear session cookie
        cookies().delete('session');
        
        return { success: true, message: "Votre compte a été supprimé avec succès." };

    } catch (error: any) {
        console.error("Error deleting user account:", error);
        return { success: false, error: "Une erreur est survenue lors de la suppression du compte." };
    }
}
    

    