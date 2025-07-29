
'use server';

import { suggestCharmPlacement, SuggestCharmPlacementInput, SuggestCharmPlacementOutput } from '@/ai/flows/charm-placement-suggestions';
import { revalidatePath } from 'next/cache';
import { db, storage } from '@/lib/firebase';
import { doc, deleteDoc, addDoc, updateDoc, collection, getDoc } from 'firebase/firestore';
import { ref, deleteObject, uploadString, getDownloadURL } from 'firebase/storage';
import { cookies } from 'next/headers';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { redirect } from 'next/navigation';
import type { JewelryModel } from '@/lib/types';


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
    const modelId = formData.get('modelId') as string;
    const jewelryTypeId = formData.get('jewelryTypeId') as string;
    const locale = formData.get('locale') as string || 'fr';
    const displayImageUrl = formData.get('displayImageUrl') as string;
    const editorImageUrl = formData.get('editorImageUrl') as string;
    
    if (!modelId || !jewelryTypeId) {
        return { success: false, message: "Informations manquantes pour la suppression." };
    }

    try {
        await deleteDoc(doc(db, jewelryTypeId, modelId));

        const filesToDelete = [
            getFileNameFromUrl(displayImageUrl),
            getFileNameFromUrl(editorImageUrl)
        ].filter(Boolean);

        for (const filePath of filesToDelete) {
             if (filePath) {
                const fileRef = ref(storage, filePath);
                await deleteObject(fileRef).catch(err => {
                    // It's okay if the object doesn't exist, we just want to ensure it's gone
                    if (err.code !== 'storage/object-not-found') {
                        throw err;
                    }
                });
            }
        }
        
        revalidatePath(`/${locale}/admin/dashboard`);
        return { success: true, message: "Le modèle a été supprimé avec succès." };

    } catch (error: any) {
        let errorMessage = "Une erreur est survenue lors de la suppression du modèle.";
        if (error.code === 'storage/object-not-found') {
            errorMessage = "Le document a été supprimé, mais une ou plusieurs images associées n'ont pas été trouvées dans le stockage.";
        }
        
        return { success: false, message: errorMessage };
    }
}

async function uploadImage(imageDataJson: string, existingUrl: string, jewelryTypeId: string): Promise<string> {
    if (!imageDataJson) return existingUrl;
    
    try {
        const imageData = JSON.parse(imageDataJson);
        if (typeof imageData === 'object' && imageData?.dataUrl && imageData?.name) {
            const { dataUrl, name } = imageData;
            const storageRef = ref(storage, `${jewelryTypeId}/${Date.now()}_${name}`);
            const uploadResult = await uploadString(storageRef, dataUrl, 'data_url');
            return await getDownloadURL(uploadResult.ref);
        }
    } catch (e) {
        // Not a new upload, it's just the URL string
    }
    
    // If it's not a new upload object, return the original URL
    return existingUrl;
}

export async function saveModel(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; model?: JewelryModel }> {
    const modelId = formData.get('modelId') as string | null;
    const jewelryTypeId = formData.get('jewelryTypeId') as string;
    const name = formData.get('name') as string;
    const price = parseFloat(formData.get('price') as string);
    const locale = formData.get('locale') as string || 'fr';

    const displayImageData = formData.get('displayImage') as string;
    const editorImageData = formData.get('editorImage') as string;
    
    const originalDisplayImageUrl = formData.get('originalDisplayImageUrl') as string || '';
    const originalEditorImageUrl = formData.get('originalEditorImageUrl') as string || '';

    if (!jewelryTypeId || !name || isNaN(price)) {
        return { success: false, message: "Les champs obligatoires sont manquants ou invalides." };
    }

    try {
        const displayImageUrl = await uploadImage(displayImageData, originalDisplayImageUrl, jewelryTypeId);
        const editorImageUrl = await uploadImage(editorImageData, originalEditorImageUrl, jewelryTypeId);

        const modelData = {
            name,
            price,
            displayImageUrl,
            editorImageUrl
        };

        let savedModel: JewelryModel;

        if (modelId) {
            // Update
            const modelRef = doc(db, jewelryTypeId, modelId);
            await updateDoc(modelRef, modelData);
            savedModel = { id: modelId, ...modelData };
        } else {
            // Create
            const docRef = await addDoc(collection(db, jewelryTypeId), modelData);
            savedModel = { id: docRef.id, ...modelData };
        }

        revalidatePath(`/${locale}/admin/dashboard`);
        return { 
            success: true, 
            message: `Le modèle a été ${modelId ? 'mis à jour' : 'créé'} avec succès.`,
            model: savedModel
        };

    } catch (error: any) {
        console.error("Error saving model:", error);
        return { success: false, message: "Une erreur est survenue lors de l'enregistrement du modèle." };
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
