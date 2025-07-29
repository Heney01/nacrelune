

'use server';

import { suggestCharmPlacement, SuggestCharmPlacementInput, SuggestCharmPlacementOutput } from '@/ai/flows/charm-placement-suggestions';
import { revalidatePath } from 'next/cache';
import { db, storage } from '@/lib/firebase';
import { doc, deleteDoc, addDoc, updateDoc, collection, getDoc, getDocs, writeBatch, query, where, setDoc } from 'firebase/firestore';
import { ref, deleteObject, uploadString, getDownloadURL } from 'firebase/storage';
import { cookies } from 'next/headers';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { redirect } from 'next/navigation';
import type { JewelryModel, CharmCategory, Charm, GeneralPreferences } from '@/lib/types';


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
    if (!url) return null;
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

const deleteFileFromStorage = async (fileUrl: string) => {
    const filePath = getFileNameFromUrl(fileUrl);
    if (filePath) {
        try {
            const fileRef = ref(storage, filePath);
            await deleteObject(fileRef);
        } catch (err: any) {
             if (err.code !== 'storage/object-not-found') {
                console.error("Failed to delete file from storage:", err);
                throw err;
            }
        }
    }
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

        await Promise.allSettled([
            deleteFileFromStorage(displayImageUrl),
            deleteFileFromStorage(editorImageUrl)
        ]);
        
        revalidatePath(`/${locale}/admin/dashboard`);
        return { success: true, message: "Le modèle a été supprimé avec succès." };

    } catch (error: any) {
        return { success: false, message: "Une erreur est survenue lors de la suppression du modèle." };
    }
}

async function uploadImage(imageDataJson: string | null, existingUrl: string, storagePath: string): Promise<string> {
    if (!imageDataJson) return existingUrl;
    
    try {
        const imageData = JSON.parse(imageDataJson);
        if (typeof imageData === 'object' && imageData?.dataUrl && imageData?.name) {
            const { dataUrl, name } = imageData;
            
            // Delete old image if it exists and is different
            if (existingUrl && getFileNameFromUrl(existingUrl)) {
                 await deleteFileFromStorage(existingUrl);
            }

            const storageRef = ref(storage, `${storagePath}/${Date.now()}_${name}`);
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
    const quantity = parseInt(formData.get('quantity') as string, 10);
    const locale = formData.get('locale') as string || 'fr';

    const displayImageData = formData.get('displayImage') as string;
    const editorImageData = formData.get('editorImage') as string;
    
    const originalDisplayImageUrl = formData.get('originalDisplayImageUrl') as string || '';
    const originalEditorImageUrl = formData.get('originalEditorImageUrl') as string || '';

    if (!jewelryTypeId || !name || isNaN(price) || isNaN(quantity)) {
        return { success: false, message: "Les champs obligatoires sont manquants ou invalides." };
    }

    try {
        const displayImageUrl = await uploadImage(displayImageData, originalDisplayImageUrl, jewelryTypeId);
        const editorImageUrl = await uploadImage(editorImageData, originalEditorImageUrl, jewelryTypeId);

        const modelData = {
            name,
            price,
            quantity,
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

// --- Charm Category Actions ---

export async function saveCharmCategory(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; category?: CharmCategory }> {
    const categoryId = formData.get('categoryId') as string | null;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const locale = formData.get('locale') as string || 'fr';
    const imageData = formData.get('image') as string;
    const originalImageUrl = formData.get('originalImageUrl') as string || '';

    if (!name) {
        return { success: false, message: "Le nom de la catégorie est obligatoire." };
    }

    try {
        const imageUrl = await uploadImage(imageData, originalImageUrl, 'charmCategories');

        const categoryData = { name, description, imageUrl };
        let savedCategory: CharmCategory;

        if (categoryId) {
            const categoryRef = doc(db, 'charmCategories', categoryId);
            await updateDoc(categoryRef, categoryData);
            savedCategory = { id: categoryId, ...categoryData };
        } else {
            const docRef = await addDoc(collection(db, 'charmCategories'), categoryData);
            savedCategory = { id: docRef.id, ...categoryData };
        }

        revalidatePath(`/${locale}/admin/dashboard`);
        return { success: true, message: `La catégorie a été ${categoryId ? 'mise à jour' : 'créée'} avec succès.`, category: savedCategory };
    } catch (error) {
        console.error("Error saving charm category:", error);
        return { success: false, message: "Une erreur est survenue lors de l'enregistrement de la catégorie." };
    }
}

export async function deleteCharmCategory(formData: FormData): Promise<{ success: boolean; message: string }> {
    const categoryId = formData.get('categoryId') as string;
    const imageUrl = formData.get('imageUrl') as string;
    const locale = formData.get('locale') as string || 'fr';

    if (!categoryId) {
        return { success: false, message: "ID de catégorie manquant." };
    }

    const batch = writeBatch(db);
    const categoryRef = doc(db, 'charmCategories', categoryId);

    try {
        // Delete the category document itself
        batch.delete(categoryRef);

        // Query for charms that contain this categoryId in their categoryIds array
        const charmsQuery = query(collection(db, 'charms'), where('categoryIds', 'array-contains', categoryId));
        const charmsSnapshot = await getDocs(charmsQuery);

        // For each charm found, remove the categoryId from its array
        charmsSnapshot.forEach(charmDoc => {
            const charmData = charmDoc.data();
            const updatedCategoryIds = charmData.categoryIds.filter((id: string) => id !== categoryId);
            batch.update(charmDoc.ref, { categoryIds: updatedCategoryIds });
        });
        
        // Delete the category image from storage
        await deleteFileFromStorage(imageUrl);

        // Commit all batched writes to Firestore
        await batch.commit();

        revalidatePath(`/${locale}/admin/dashboard`);
        return { success: true, message: "La catégorie a été supprimée." };
    } catch (error) {
        console.error("Error deleting charm category:", error);
        return { success: false, message: "Une erreur est survenue lors de la suppression de la catégorie." };
    }
}


// --- Charm Actions ---

export async function saveCharm(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; charm?: Charm & { categoryName?: string } }> {
    const charmId = formData.get('charmId') as string | null;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(formData.get('price') as string);
    const quantity = parseInt(formData.get('quantity') as string, 10);
    const categoryIds = formData.getAll('categoryIds') as string[];
    const locale = formData.get('locale') as string || 'fr';
    const imageData = formData.get('image') as string;
    const originalImageUrl = formData.get('originalImageUrl') as string || '';

    if (!name || isNaN(price) || isNaN(quantity) || !categoryIds || categoryIds.length === 0) {
        return { success: false, message: "Les champs obligatoires (nom, prix, quantité, au moins une catégorie) sont manquants ou invalides." };
    }

    try {
        const categoryRefs = categoryIds.map(id => doc(db, 'charmCategories', id));
        const imageUrl = await uploadImage(imageData, originalImageUrl, `charms/${name.replace(/\s+/g, '_')}`);
        
        const charmData = {
            name,
            description,
            price,
            quantity,
            categoryIds: categoryIds, // Store array of string IDs
            imageUrl
        };
        
        let savedCharmData: any;

        if (charmId) {
            const charmRef = doc(db, 'charms', charmId);
            await updateDoc(charmRef, charmData);
            savedCharmData = { id: charmId, ...charmData };
        } else {
            const docRef = await addDoc(collection(db, 'charms'), charmData);
            savedCharmData = { id: docRef.id, ...charmData };
        }
        
        const firstCategoryDoc = await getDoc(categoryRefs[0]);
        const firstCategoryName = firstCategoryDoc.exists() ? firstCategoryDoc.data().name : 'Inconnue';

        const finalCharmObject = {
            ...savedCharmData,
            categoryName: firstCategoryName // For optimistic update, just use the first one
        };

        revalidatePath(`/${locale}/admin/dashboard`);
        return { 
            success: true, 
            message: `La breloque a été ${charmId ? 'mise à jour' : 'créée'} avec succès.`,
            charm: finalCharmObject
        };

    } catch (error) {
        console.error("Error saving charm:", error);
        return { success: false, message: "Une erreur est survenue lors de l'enregistrement de la breloque." };
    }
}


export async function deleteCharm(formData: FormData): Promise<{ success: boolean; message: string }> {
    const charmId = formData.get('charmId') as string;
    const imageUrl = formData.get('imageUrl') as string;
    const locale = formData.get('locale') as string || 'fr';

    if (!charmId) {
        return { success: false, message: "ID de breloque manquant." };
    }

    try {
        await deleteDoc(doc(db, 'charms', charmId));
        await deleteFileFromStorage(imageUrl);

        revalidatePath(`/${locale}/admin/dashboard`);
        return { success: true, message: "La breloque a été supprimée." };

    } catch (error) {
        console.error("Error deleting charm:", error);
        return { success: false, message: "Une erreur est survenue lors de la suppression." };
    }
}

// --- Preferences Actions ---

export async function getPreferences(): Promise<GeneralPreferences> {
    try {
        const docRef = doc(db, 'preferences', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as GeneralPreferences;
        } else {
            // Return default values if not set
            return { alertThreshold: 10, criticalThreshold: 5 };
        }
    } catch (error) {
        console.error("Error fetching preferences:", error);
        throw new Error("Impossible de récupérer les préférences.");
    }
}

export async function savePreferences(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; preferences?: GeneralPreferences }> {
    const alertThreshold = parseInt(formData.get('alertThreshold') as string, 10);
    const criticalThreshold = parseInt(formData.get('criticalThreshold') as string, 10);
    const locale = formData.get('locale') as string || 'fr';

    if (isNaN(alertThreshold) || isNaN(criticalThreshold)) {
        return { success: false, message: "Les valeurs doivent être des nombres." };
    }
    
    if (criticalThreshold >= alertThreshold) {
        return { success: false, message: "Le seuil critique doit être inférieur au seuil d'alerte." };
    }

    try {
        const preferencesData = { alertThreshold, criticalThreshold };
        const docRef = doc(db, 'preferences', 'general');
        await setDoc(docRef, preferencesData);

        revalidatePath(`/${locale}/admin/dashboard`);
        return { 
            success: true, 
            message: "Les préférences ont été mises à jour avec succès.",
            preferences: preferencesData
        };

    } catch (error) {
        console.error("Error saving preferences:", error);
        return { success: false, message: "Une erreur est survenue lors de l'enregistrement des préférences." };
    }
}
