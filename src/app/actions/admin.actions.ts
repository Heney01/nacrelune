
'use server';

import { revalidatePath } from 'next/cache';
import { db, storage } from '@/lib/firebase';
import { doc, deleteDoc, addDoc, updateDoc, collection, getDoc, getDocs, writeBatch, query, where, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { ref, deleteObject, uploadString, getDownloadURL } from 'firebase/storage';
import type { JewelryModel, CharmCategory, Charm, GeneralPreferences } from '@/lib/types';

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


// --- Model Actions ---

export async function deleteModel(formData: FormData): Promise<{ success: boolean; message: string }> {
    try {
        const modelId = formData.get('modelId') as string;
        const jewelryTypeId = formData.get('jewelryTypeId') as string;
        const locale = formData.get('locale') as string || 'fr';
        const displayImageUrl = formData.get('displayImageUrl') as string;
        const editorImageUrl = formData.get('editorImageUrl') as string;
        
        if (!modelId || !jewelryTypeId) {
            return { success: false, message: "Informations manquantes pour la suppression." };
        }

        await deleteDoc(doc(db, jewelryTypeId, modelId));

        await Promise.allSettled([
            deleteFileFromStorage(displayImageUrl),
            deleteFileFromStorage(editorImageUrl)
        ]);
        
        revalidatePath(`/${locale}/admin/dashboard`);
        return { success: true, message: "Le modèle a été supprimé avec succès." };

    } catch (error: any) {
        return { success: false, message: error.message || "Une erreur est survenue lors de la suppression du modèle." };
    }
}


export async function saveModel(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; model?: JewelryModel }> {
    try {
        const modelId = formData.get('modelId') as string | null;
        const jewelryTypeId = formData.get('jewelryTypeId') as string;
        const name = formData.get('name') as string;
        const price = parseFloat(formData.get('price') as string);
        const quantity = parseInt(formData.get('quantity') as string, 10);
        const width = parseFloat(formData.get('width') as string) || undefined;
        const height = parseFloat(formData.get('height') as string) || undefined;
        const reorderUrl = formData.get('reorderUrl') as string;
        const locale = formData.get('locale') as string || 'fr';

        const displayImageData = formData.get('displayImage') as string;
        const editorImageData = formData.get('editorImage') as string;
        
        const originalDisplayImageUrl = formData.get('originalDisplayImageUrl') as string || '';
        const originalEditorImageUrl = formData.get('originalEditorImageUrl') as string || '';

        if (!jewelryTypeId || !name || isNaN(price) || isNaN(quantity)) {
            return { success: false, message: "Les champs obligatoires sont manquants ou invalides." };
        }

        const displayImageUrl = await uploadImage(displayImageData, originalDisplayImageUrl, jewelryTypeId);
        const editorImageUrl = await uploadImage(editorImageData, originalEditorImageUrl, jewelryTypeId);

        const modelData: Omit<JewelryModel, 'id' | 'lastOrderedAt' | 'restockedAt'> = {
            name,
            price,
            quantity,
            width,
            height,
            displayImageUrl,
            editorImageUrl,
            reorderUrl,
        };

        let savedModel: JewelryModel;

        if (modelId) {
            // Update
            const modelRef = doc(db, jewelryTypeId, modelId);
            await updateDoc(modelRef, modelData);
            const docSnap = await getDoc(modelRef);
            savedModel = { id: modelId, ...docSnap.data() } as JewelryModel;
        } else {
            // Create
            const docRef = await addDoc(collection(db, jewelryTypeId), modelData);
            savedModel = { id: docRef.id, ...modelData, lastOrderedAt: null, restockedAt: null };
        }

        revalidatePath(`/${locale}/admin/dashboard`);
        return { 
            success: true, 
            message: `Le modèle a été ${modelId ? 'mis à jour' : 'créé'} avec succès.`,
            model: savedModel
        };

    } catch (error: any) {
        console.error("Error saving model:", error);
        return { success: false, message: error.message || "Une erreur est survenue lors de l'enregistrement du modèle." };
    }
}


// --- Charm Category Actions ---

export async function saveCharmCategory(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; category?: CharmCategory }> {
    try {
        const categoryId = formData.get('categoryId') as string | null;
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        const locale = formData.get('locale') as string || 'fr';
        const imageData = formData.get('image') as string;
        const originalImageUrl = formData.get('originalImageUrl') as string || '';

        if (!name) {
            return { success: false, message: "Le nom de la catégorie est obligatoire." };
        }

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
    } catch (error: any) {
        console.error("Error saving charm category:", error);
        return { success: false, message: error.message || "Une erreur est survenue lors de l'enregistrement de la catégorie." };
    }
}

export async function deleteCharmCategory(formData: FormData): Promise<{ success: boolean; message: string }> {
    try {
        const categoryId = formData.get('categoryId') as string;
        const imageUrl = formData.get('imageUrl') as string;
        const locale = formData.get('locale') as string || 'fr';

        if (!categoryId) {
            return { success: false, message: "ID de catégorie manquant." };
        }

        const batch = writeBatch(db);
        const categoryRef = doc(db, 'charmCategories', categoryId);

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
    } catch (error: any) {
        console.error("Error deleting charm category:", error);
        return { success: false, message: error.message || "Une erreur est survenue lors de la suppression de la catégorie." };
    }
}


// --- Charm Actions ---

export async function saveCharm(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; charm?: Charm & { categoryName?: string } }> {
    try {
        const charmId = formData.get('charmId') as string | null;
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        const price = parseFloat(formData.get('price') as string);
        const quantity = parseInt(formData.get('quantity') as string, 10);
        const width = parseFloat(formData.get('width') as string) || undefined;
        const height = parseFloat(formData.get('height') as string) || undefined;
        const categoryIds = formData.getAll('categoryIds') as string[];
        const reorderUrl = formData.get('reorderUrl') as string;
        const locale = formData.get('locale') as string || 'fr';
        const imageData = formData.get('image') as string;
        const originalImageUrl = formData.get('originalImageUrl') as string || '';

        if (!name || isNaN(price) || isNaN(quantity) || !categoryIds || categoryIds.length === 0) {
            return { success: false, message: "Les champs obligatoires (nom, prix, quantité, au moins une catégorie) sont manquants ou invalides." };
        }

        const categoryRefs = categoryIds.map(id => doc(db, 'charmCategories', id));
        const imageUrl = await uploadImage(imageData, originalImageUrl, `charms/${name.replace(/\s+/g, '_')}`);
        
        const charmData: Omit<Charm, 'id' | 'lastOrderedAt' | 'restockedAt'> = {
            name,
            description,
            price,
            quantity,
            width,
            height,
            categoryIds: categoryIds, // Store array of string IDs
            imageUrl,
            reorderUrl,
        };
        
        let savedCharmData: any;

        if (charmId) {
            const charmRef = doc(db, 'charms', charmId);
            await updateDoc(charmRef, charmData);
            const docSnap = await getDoc(charmRef);
            savedCharmData = { id: charmId, ...docSnap.data() };
        } else {
            const docRef = await addDoc(collection(db, 'charms'), charmData);
            savedCharmData = { id: docRef.id, ...charmData, lastOrderedAt: null, restockedAt: null };
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

    } catch (error: any) {
        console.error("Error saving charm:", error);
        return { success: false, message: error.message || "Une erreur est survenue lors de l'enregistrement de la breloque." };
    }
}


export async function deleteCharm(formData: FormData): Promise<{ success: boolean; message: string }> {
    try {
        const charmId = formData.get('charmId') as string;
        const imageUrl = formData.get('imageUrl') as string;
        const locale = formData.get('locale') as string || 'fr';

        if (!charmId) {
            return { success: false, message: "ID de breloque manquant." };
        }

        await deleteDoc(doc(db, 'charms', charmId));
        await deleteFileFromStorage(imageUrl);

        revalidatePath(`/${locale}/admin/dashboard`);
        return { success: true, message: "La breloque a été supprimée." };

    } catch (error: any) {
        console.error("Error deleting charm:", error);
        return { success: false, message: error.message || "Une erreur est survenue." };
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
     try {
        const alertThreshold = parseInt(formData.get('alertThreshold') as string, 10);
        const criticalThreshold = parseInt(formData.get('criticalThreshold') as string, 10);
        const locale = formData.get('locale') as string || 'fr';

        if (isNaN(alertThreshold) || isNaN(criticalThreshold)) {
            return { success: false, message: "Les valeurs doivent être des nombres." };
        }
        
        if (criticalThreshold >= alertThreshold) {
            return { success: false, message: "Le seuil critique doit être inférieur au seuil d'alerte." };
        }

        const preferencesData = { alertThreshold, criticalThreshold };
        const docRef = doc(db, 'preferences', 'general');
        await setDoc(docRef, preferencesData);

        revalidatePath(`/${locale}/admin/dashboard`);
        return { 
            success: true, 
            message: "Les préférences ont été mises à jour avec succès.",
            preferences: preferencesData
        };

    } catch (error: any) {
        console.error("Error saving preferences:", error);
        return { success: false, message: error.message || "Une erreur est survenue lors de l'enregistrement des préférences." };
    }
}

export async function markAsOrdered(formData: FormData): Promise<{ success: boolean; message: string }> {
     try {
        const itemId = formData.get('itemId') as string;
        const itemType = formData.get('itemType') as string; // 'charms' or a jewelryTypeId like 'necklace'
        const locale = formData.get('locale') as string || 'fr';

        if (!itemId || !itemType) {
            return { success: false, message: "Informations manquantes." };
        }

        const itemRef = doc(db, itemType, itemId);
        await updateDoc(itemRef, {
            lastOrderedAt: serverTimestamp(),
            restockedAt: null,
        });

        revalidatePath(`/${locale}/admin/dashboard`);
        return { success: true, message: "L'article a été marqué comme commandé." };

    } catch (error: any) {
        console.error("Error marking item as ordered:", error);
        return { success: false, message: error.message || "Une erreur est survenue." };
    }
}

export async function markAsRestocked(formData: FormData): Promise<{ success: boolean; message: string; newQuantity?: number }> {
     try {
        const itemId = formData.get('itemId') as string;
        const itemType = formData.get('itemType') as string;
        const locale = formData.get('locale') as string || 'fr';
        const restockedQuantity = parseInt(formData.get('restockedQuantity') as string, 10);

        if (!itemId || !itemType || isNaN(restockedQuantity) || restockedQuantity <= 0) {
            return { success: false, message: "Informations manquantes ou quantité invalide." };
        }

        const itemRef = doc(db, itemType, itemId);

        const newQuantity = await runTransaction(db, async (transaction) => {
            const itemDoc = await transaction.get(itemRef);
            if (!itemDoc.exists()) {
                throw new Error("L'article n'existe pas !");
            }

            const currentQuantity = itemDoc.data().quantity || 0;
            const updatedQuantity = currentQuantity + restockedQuantity;

            transaction.update(itemRef, {
                quantity: updatedQuantity,
                lastOrderedAt: null,
                restockedAt: serverTimestamp(),
            });

            return updatedQuantity;
        });

        revalidatePath(`/${locale}/admin/dashboard`);
        return { 
            success: true, 
            message: "L'article a été marqué comme réapprovisionné et le stock mis à jour.",
            newQuantity: newQuantity
        };
    } catch (error: any) {
        console.error("Error marking item as restocked:", error);
        return { success: false, message: error.message || "Une erreur est survenue." };
    }
}

    
