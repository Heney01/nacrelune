
'use server';

import { suggestCharmPlacement, SuggestCharmPlacementInput, SuggestCharmPlacementOutput } from '@/ai/flows/charm-placement-suggestions';
import { revalidatePath } from 'next/cache';
import { db, storage } from '@/lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { cookies } from 'next/headers';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { redirect } from 'next/navigation';

export async function getCharmSuggestions(
  input: SuggestCharmPlacementInput
): Promise<SuggestCharmPlacementOutput> {
  try {
    const suggestions = await suggestCharmPlacement(input);
    return suggestions;
  } catch (error) {
    console.error('Error getting charm suggestions:', error);
    // In a real app, you might want to return a more user-friendly error
    throw new Error('Failed to generate suggestions.');
  }
}

const getFileNameFromUrl = (url: string) => {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'firebasestorage.googleapis.com') {
            const decodedPath = decodeURIComponent(urlObj.pathname);
            const pathRegex = /\/o\/(.*)/;
            const match = decodedPath.match(pathRegex);
            if (match && match[1]) {
                return match[1].split('?')[0]; // Remove query params
            }
        }
    } catch (e) {
        // Not a valid URL
    }
    if (url.includes('placehold.co')) return null;
    // Fallback for other URL structures or local paths during development
    const pathParts = url.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    return lastPart.split('?')[0];
};

export async function deleteModel(formData: FormData): Promise<{ success: boolean; message: string }> {
    console.log("--- [SERVER] deleteModel action called ---");
    const modelId = formData.get('modelId') as string;
    const jewelryTypeId = formData.get('jewelryTypeId') as string;
    const locale = formData.get('locale') as string || 'fr'; // Default locale
    const displayImageUrl = formData.get('displayImageUrl') as string;
    const editorImageUrl = formData.get('editorImageUrl') as string;

    // This handles the test call from the homepage button
    if (!modelId || !jewelryTypeId) {
        const message = "Appel de test réussi depuis la page d'accueil.";
        console.log(`--- [SERVER] Test call detected. ${message}`);
        return { success: true, message: message };
    }

    console.log(`--- [SERVER] Received data: modelId=${modelId}, jewelryTypeId=${jewelryTypeId}`);

    try {
        // 1. Delete Firestore document
        console.log(`--- [SERVER] Attempting to delete Firestore doc: ${jewelryTypeId}/${modelId}`);
        await deleteDoc(doc(db, jewelryTypeId, modelId));
        console.log("--- [SERVER] Firestore document deleted successfully.");

        // 2. Delete images from Storage
        const filesToDelete = [
            getFileNameFromUrl(displayImageUrl),
            getFileNameFromUrl(editorImageUrl)
        ].filter(Boolean);

        console.log(`--- [SERVER] Files to delete from Storage:`, filesToDelete);

        for (const filePath of filesToDelete) {
             if (filePath) {
                console.log(`--- [SERVER] Attempting to delete file from Storage: ${filePath}`);
                const fileRef = ref(storage, filePath);
                await deleteObject(fileRef);
                console.log(`--- [SERVER] File deleted: ${filePath}`);
            }
        }
        
        revalidatePath(`/${locale}/admin/dashboard`); 
        console.log("--- [SERVER] Path revalidated. Operation successful.");
        return { success: true, message: "Le modèle a été supprimé avec succès." };

    } catch (error: any) {
        console.error("--- [SERVER] Error during model deletion: ", error);
        
        let errorMessage = "Une erreur est survenue lors de la suppression du modèle.";
        if (error.code === 'storage/object-not-found') {
            errorMessage = "Le document a été supprimé, mais une ou plusieurs images associées n'ont pas été trouvées dans le stockage.";
        }
        
        return { success: false, message: errorMessage };
    }
}


export async function login(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const locale = formData.get('locale') as string || 'fr';

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
  
  redirect(`/${locale}/admin/dashboard`);
}


export async function logout(formData: FormData) {
  const locale = formData.get('locale') as string || 'fr';
  cookies().delete('session');
  redirect(`/${locale}/login`);
}
