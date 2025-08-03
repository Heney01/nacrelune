

'use server';

import { revalidatePath } from 'next/cache';
import { db, storage } from '@/lib/firebase';
import { doc, deleteDoc, addDoc, updateDoc, collection, getDoc, getDocs, writeBatch, query, where, setDoc, serverTimestamp, runTransaction, Timestamp, collectionGroup, documentId, orderBy, DocumentReference, DocumentSnapshot, increment } from 'firebase/firestore';
import { ref, deleteObject, uploadString, getDownloadURL } from 'firebase/storage';
import { cookies } from 'next/headers';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { redirect } from 'next/navigation';
import type { JewelryModel, CharmCategory, Charm, GeneralPreferences, CartItem, OrderStatus, Order, OrderItem, PlacedCharm, ShippingAddress, DeliveryMethod, MailLog, User, Coupon, Creation, CreationCharm, PlacedCreationCharm } from '@/lib/types';
import { getCharmSuggestions as getCharmSuggestionsFlow, CharmSuggestionInput, CharmSuggestionOutput } from '@/ai/flows/charm-placement-suggestions';
import { getCharmAnalysisSuggestions as getCharmAnalysisSuggestionsFlow, CharmAnalysisSuggestionInput, CharmAnalysisSuggestionOutput } from '@/ai/flows/charm-analysis-suggestions';
import { getCharmDesignCritique as getCharmDesignCritiqueFlow, CharmDesignCritiqueInput, CharmDesignCritiqueOutput } from '@/ai/flows/charm-design-critique';
import { generateShareContent as generateShareContentFlow, GenerateShareContentInput, GenerateShareContentOutput } from '@/ai/flows/share-content-generation';
import { z } from 'zod';
import { getCharms as fetchCharms, toDate } from '@/lib/data';
import Stripe from 'stripe';
import { Auth, getAuth as getAdminAuth } from 'firebase-admin/auth';
import { adminApp } from '@/lib/firebase-admin';


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

const getUrl = async (path: string | undefined | null, fallback: string): Promise<string> => {
    if (!path) return fallback;
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    try {
        const storageRef = ref(storage, path);
        return await getDownloadURL(storageRef);
    } catch (error) {
        console.error(`Error getting download URL for path "${path}":`, error);
        return fallback;
    }
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

    try {
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
        return { success: false, message: "Une erreur est survenue lors de l'enregistrement du modèle." };
    }
}


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

        const userData: Omit<User, 'uid'> = {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
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
      const newUser: Omit<User, 'uid'> = {
        email,
        displayName,
        photoURL,
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


export async function logout(formData: FormData) {
  const locale = formData.get('locale') as string || 'fr';
  cookies().delete('session');
  redirect(`/${locale}/connexion`);
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

    try {
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
        return { success: false, message: "Une erreur est survenue." };
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

// --- Order Actions ---

export async function createPaymentIntent(
  amount: number
): Promise<{ clientSecret: string | null; error?: string }> {
  if (amount <= 0) {
    return { error: 'Invalid amount.', clientSecret: null };
  }
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Amount in cents
      currency: 'eur',
      payment_method_types: ['card'],
    });
    return { clientSecret: paymentIntent.client_secret };
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return { error: error.message, clientSecret: null };
  }
}

async function refundStripePayment(paymentIntentId: string): Promise<{ success: boolean; message: string }> {
    try {
        const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
        });
        if (refund.status === 'succeeded' || refund.status === 'pending') {
            return { success: true, message: `Remboursement initié avec succès (Status: ${refund.status}).` };
        } else {
             return { success: false, message: `Le remboursement a échoué avec le statut : ${refund.status}.` };
        }
    } catch (error: any) {
        console.error("Error creating Stripe refund:", error);
        return { success: false, message: error.message || "Une erreur est survenue lors du remboursement Stripe." };
    }
}


function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ATB-${year}${month}${day}-${randomPart}`;
}

export type SerializableCartItem = {
    id: string;
    model: JewelryModel;
    jewelryType: {
        id: 'necklace' | 'bracelet' | 'earring';
        name: string;
        description: string;
    };
    placedCharms: PlacedCharm[];
    previewImage: string;
};

export type StockError = {
    unavailableModelIds: string[];
    unavailableCharmIds: string[];
}

export type CreateOrderResult = {
    success: boolean;
    message: string;
    orderNumber?: string;
    email?: string;
    stockError?: StockError;
    totalPrice?: number;
};

export async function markAsOrdered(formData: FormData): Promise<{ success: boolean; message: string }> {
    const itemId = formData.get('itemId') as string;
    const itemType = formData.get('itemType') as string; // 'charms' or a jewelryTypeId like 'necklace'
    const locale = formData.get('locale') as string || 'fr';

    if (!itemId || !itemType) {
        return { success: false, message: "Informations manquantes." };
    }

    try {
        const itemRef = doc(db, itemType, itemId);
        await updateDoc(itemRef, {
            lastOrderedAt: serverTimestamp(),
            restockedAt: null,
        });

        revalidatePath(`/${locale}/admin/dashboard`);
        return { success: true, message: "L'article a été marqué comme commandé." };

    } catch (error) {
        console.error("Error marking item as ordered:", error);
        return { success: false, message: "Une erreur est survenue." };
    }
}

export async function markAsRestocked(formData: FormData): Promise<{ success: boolean; message: string; newQuantity?: number }> {
    const itemId = formData.get('itemId') as string;
    const itemType = formData.get('itemType') as string;
    const locale = formData.get('locale') as string || 'fr';
    const restockedQuantity = parseInt(formData.get('restockedQuantity') as string, 10);

    if (!itemId || !itemType || isNaN(restockedQuantity) || restockedQuantity <= 0) {
        return { success: false, message: "Informations manquantes ou quantité invalide." };
    }

    try {
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
    } catch (error) {
        console.error("Error marking item as restocked:", error);
        return { success: false, message: "Une erreur est survenue." };
    }
}

export async function validateCoupon(code: string): Promise<{ success: boolean; message: string; coupon?: Coupon }> {
    if (!code) {
        return { success: false, message: 'Veuillez entrer un code.' };
    }
    
    try {
        const q = query(collection(db, 'coupons'), where('code', '==', code.trim().toUpperCase()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, message: "Ce code promo n'est pas valide." };
        }
        
        const couponDoc = querySnapshot.docs[0];
        const couponData = couponDoc.data() as Omit<Coupon, 'id'>;
        
        if (!couponData.isActive) {
            return { success: false, message: "Ce code promo a expiré." };
        }

        if (couponData.validUntil && toDate(couponData.validUntil as any)! < new Date()) {
             return { success: false, message: "Ce code promo a expiré." };
        }

        const coupon = { id: couponDoc.id, ...couponData } as Coupon;
        return { success: true, message: 'Code promo appliqué !', coupon };

    } catch (error: any) {
        console.error("Error validating coupon:", error);
        return { success: false, message: "Une erreur est survenue lors de la validation du code." };
    }
}


export async function createOrder(
    cartItems: SerializableCartItem[], 
    email: string, 
    locale: string, 
    paymentIntentId: string, // Can be a placeholder for now
    deliveryMethod: DeliveryMethod,
    shippingAddress?: ShippingAddress,
    coupon?: Coupon
): Promise<CreateOrderResult> {
    if (!cartItems || cartItems.length === 0) {
        return { success: false, message: 'Le panier est vide.' };
    }

    try {
         const orderData = await runTransaction(db, async (transaction) => {
            const stockUpdates: Map<DocumentReference, { newQuantity: number; name: string }> = new Map();
            const itemDocsToFetch: Map<string, DocumentReference> = new Map();
            
            const stockDeductions = new Map<string, { count: number, name: string, type: string, id: string }>();

            for (const item of cartItems) {
                const modelKey = `${item.jewelryType.id}/${item.model.id}`;
                const currentModel = stockDeductions.get(modelKey) || { count: 0, name: item.model.name, type: item.jewelryType.id, id: item.model.id };
                stockDeductions.set(modelKey, { ...currentModel, count: currentModel.count + 1 });
                if (!itemDocsToFetch.has(modelKey)) {
                    itemDocsToFetch.set(modelKey, doc(db, item.jewelryType.id, item.model.id));
                }

                for (const pc of item.placedCharms) {
                    const charmKey = `charms/${pc.charm.id}`;
                    const currentCharm = stockDeductions.get(charmKey) || { count: 0, name: pc.charm.name, type: 'charms', id: pc.charm.id };
                    stockDeductions.set(charmKey, { ...currentCharm, count: currentCharm.count + 1 });
                    if (!itemDocsToFetch.has(charmKey)) {
                        itemDocsToFetch.set(charmKey, doc(db, 'charms', pc.charm.id));
                    }
                }
            }

            const itemDocRefs = Array.from(itemDocsToFetch.values());
            const itemDocsSnapshots: DocumentSnapshot[] = [];
             for (const ref of itemDocRefs) {
                const docSnap = await transaction.get(ref);
                itemDocsSnapshots.push(docSnap);
            }
            const itemDocsMap = new Map(itemDocsSnapshots.map(d => [d.ref.path, d]));

            const unavailableItems = {
                unavailableModelIds: new Set<string>(),
                unavailableCharmIds: new Set<string>(),
            };

            for (const [key, deduction] of Array.from(stockDeductions.entries())) {
                const itemDoc = itemDocsMap.get(itemDocsToFetch.get(key)!.path);
                if (!itemDoc || !itemDoc.exists()) {
                     if(deduction.type === 'charms') {
                        unavailableItems.unavailableCharmIds.add(deduction.id);
                     } else {
                        unavailableItems.unavailableModelIds.add(deduction.id);
                     }
                } else {
                    const currentStock = itemDoc.data().quantity || 0;
                    if (currentStock < deduction.count) {
                        if(deduction.type === 'charms') {
                           unavailableItems.unavailableCharmIds.add(deduction.id);
                        } else {
                           unavailableItems.unavailableModelIds.add(deduction.id);
                        }
                    } else {
                        stockUpdates.set(itemDoc.ref, { newQuantity: currentStock - deduction.count, name: deduction.name });
                    }
                }
            }

            if (unavailableItems.unavailableModelIds.size > 0 || unavailableItems.unavailableCharmIds.size > 0) {
                 return { 
                    success: false, 
                    message: "Certains articles de votre panier ne sont plus en stock.",
                    stockError: {
                        unavailableModelIds: Array.from(unavailableItems.unavailableModelIds),
                        unavailableCharmIds: Array.from(unavailableItems.unavailableCharmIds),
                    }
                };
            }

            const uploadPromises = cartItems.map(async (item) => {
                const storageRef = ref(storage, `order_previews/${item.id}-${Date.now()}.png`);
                const uploadResult = await uploadString(storageRef, item.previewImage, 'data_url');
                return getDownloadURL(uploadResult.ref);
            });
            const previewImageUrls = await Promise.all(uploadPromises);

            for (const [ref, update] of Array.from(stockUpdates.entries())) {
                transaction.update(ref, { quantity: update.newQuantity });
            }

            let totalOrderPrice = cartItems.reduce((sum, item) => {
                const modelPrice = item.model.price || 0;
                const charmsPrice = item.placedCharms.reduce((charmSum, pc) => charmSum + (pc.charm.price || 0), 0);
                return sum + modelPrice + charmsPrice;
            }, 0);
            
            if (coupon) {
                const discountAmount = coupon.discountType === 'percentage'
                    ? totalOrderPrice * (coupon.value / 100)
                    : coupon.value;
                totalOrderPrice = Math.max(0, totalOrderPrice - discountAmount);
            }

            const orderItems: Omit<OrderItem, 'modelImageUrl' | 'charms'>[] = cartItems.map((item, index) => {
                const itemPrice = (item.model.price || 0) + item.placedCharms.reduce((charmSum, pc) => charmSum + (pc.charm.price || 0), 0);
                return {
                    modelId: item.model.id,
                    modelName: item.model.name,
                    jewelryTypeId: item.jewelryType.id,
                    jewelryTypeName: item.jewelryType.name,
                    charmIds: item.placedCharms.map(pc => pc.charm.id),
                    price: itemPrice,
                    previewImageUrl: previewImageUrls[index],
                    isCompleted: false,
                };
            });
            
            const initialStatus: OrderStatus = 'commandée';
            const orderNumber = generateOrderNumber();
            
            const newOrderData: Omit<Order, 'id' | 'createdAt'> = {
                orderNumber,
                customerEmail: email,
                totalPrice: totalOrderPrice,
                items: orderItems,
                status: initialStatus,
                paymentIntentId: paymentIntentId,
                deliveryMethod: deliveryMethod,
                shippingAddress: deliveryMethod === 'home' ? shippingAddress : undefined,
                ...(coupon && { couponCode: coupon.code, couponId: coupon.id })
            };

            const orderRef = doc(collection(db, 'orders'));
            transaction.set(orderRef, { ...newOrderData, createdAt: serverTimestamp() });
            
            const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@atelierabijoux.com';
            const emailFooterText = `\n\nPour toute question, vous pouvez répondre directement à cet e-mail ou contacter notre support à ${supportEmail} en précisant votre numéro de commande (${orderNumber}).`;
            const emailFooterHtml = `<p style="font-size:12px;color:#666;">Pour toute question, vous pouvez répondre directement à cet e-mail ou contacter notre support à <a href="mailto:${supportEmail}">${supportEmail}</a> en précisant votre numéro de commande (${orderNumber}).</p>`;
            const trackingUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.atelierabijoux.com'}/${locale}/orders/track?orderNumber=${orderNumber}`;

            const mailText = `Bonjour,\n\nNous avons bien reçu votre commande n°${orderNumber} d'un montant total de ${totalOrderPrice.toFixed(2)}€.\n\nRécapitulatif :\n${cartItems.map(item => `- ${item.model.name} avec ${item.placedCharms.length} breloque(s)`).join('\\n')}\n\nVous pouvez suivre votre commande ici : ${trackingUrl}\n\nVous recevrez un autre e-mail lorsque votre commande sera expédiée.\n\nL'équipe Atelier à bijoux${emailFooterText}`;
            const mailHtml = `<h1>Merci pour votre commande !</h1><p>Bonjour,</p><p>Nous avons bien reçu votre commande n°<strong>${orderNumber}</strong> d'un montant total de ${totalOrderPrice.toFixed(2)}€.</p><h2>Récapitulatif :</h2><ul>${cartItems.map(item => `<li>${item.model.name} avec ${item.placedCharms.length} breloque(s)</li>`).join('')}</ul><p>Vous pouvez suivre l'avancement de votre commande en cliquant sur ce lien : <a href="${trackingUrl}">${trackingUrl}</a>.</p><p>Vous recevrez un autre e-mail lorsque votre commande sera expédiée.</p><p>L'équipe Atelier à bijoux</p>${emailFooterHtml}`;

            const mailDocData = {
                to: [email],
                message: {
                    subject: `Confirmation de votre commande n°${orderNumber}`,
                    text: mailText.trim(),
                    html: mailHtml.trim(),
                },
            };

            const mailRef = doc(collection(db, 'mail'));
            transaction.set(mailRef, mailDocData);
            
            return { success: true, message: 'Votre commande a été passée avec succès !', orderNumber, email, totalPrice: totalOrderPrice };
        });

        return orderData;
    } catch (error: any) {
        console.error("Error creating order:", error);
        return { success: false, message: error.message || "Une erreur est survenue lors du passage de la commande." };
    }
}

export async function getOrderDetailsByNumber(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; order?: Order | null }> {
    const orderNumber = formData.get('orderNumber') as string;
    
    if (!orderNumber) {
        return { success: false, message: "Veuillez fournir un numéro de commande." };
    }

    try {
        const q = query(collection(db, 'orders'), where('orderNumber', '==', orderNumber.trim()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, message: "Aucune commande trouvée avec ce numéro.", order: null };
        }

        const orderDoc = querySnapshot.docs[0];
        const orderData = orderDoc.data();

        // Get all unique charm IDs from all items in the order
        const allCharmIds = orderData.items.flatMap((item: OrderItem) => item.charmIds);
        const uniqueCharmIds = Array.from(new Set(allCharmIds)).filter(id => id);

        // Fetch all required charms in a single query
        let charmsMap = new Map<string, Charm>();
        if (uniqueCharmIds.length > 0) {
            const charmsQuery = query(collection(db, 'charms'), where(documentId(), 'in', uniqueCharmIds));
            const charmsSnapshot = await getDocs(charmsQuery);
            for (const charmDoc of charmsSnapshot.docs) {
                const charmData = charmDoc.data() as Omit<Charm, 'id'>;
                charmsMap.set(charmDoc.id, {
                    ...charmData,
                    id: charmDoc.id,
                    imageUrl: await getUrl(charmData.imageUrl, 'https://placehold.co/100x100.png')
                });
            }
        }
        
        // Fetch all required models
        const modelIds = orderData.items.map((item: OrderItem) => item.modelId);
        const uniqueModelIds = Array.from(new Set(modelIds));
        const modelsMap = new Map<string, JewelryModel>();
        
        if (uniqueModelIds.length > 0) {
            const jewelryTypeIds = Array.from(new Set(
                orderData.items.map((item: any) => item.jewelryTypeId).filter(Boolean)
            ));
            
            const modelPromises = jewelryTypeIds.map((typeId) => 
                getDocs(query(collection(db, typeId as string), where(documentId(), 'in', uniqueModelIds)))
            );
            
            const modelSnapshots = await Promise.all(modelPromises);
            
            for (const snap of modelSnapshots) {
                 for (const modelDoc of snap.docs) {
                    if (modelDoc.exists()) {
                        const modelData = modelDoc.data();
                        modelsMap.set(modelDoc.id, {
                            id: modelDoc.id,
                            ...modelData,
                            displayImageUrl: await getUrl(modelData.displayImageUrl, 'https://placehold.co/400x400.png'),
                            editorImageUrl: await getUrl(modelData.editorImageUrl, 'https://placehold.co/400x400.png'),
                        } as JewelryModel);
                    }
                 }
            }
        }

        // Enrich order items with full charm and model details
        const enrichedItems: OrderItem[] = await Promise.all(orderData.items.map(async (item: OrderItem) => {
            const model = modelsMap.get(item.modelId);
            
            const enrichedCharms = (item.charmIds || []).map(id => {
                const charm = charmsMap.get(id);
                return charm;
            }).filter((c): c is Charm => !!c);

            return {
                ...item,
                modelImageUrl: model?.displayImageUrl,
                previewImageUrl: await getUrl(item.previewImageUrl, 'https://placehold.co/400x400.png'),
                charms: enrichedCharms,
            };
        }));
        
        const order: Order = {
            id: orderDoc.id,
            orderNumber: orderData.orderNumber,
            createdAt: (orderData.createdAt as Timestamp).toDate(),
            customerEmail: orderData.customerEmail,
            totalPrice: orderData.totalPrice,
            items: enrichedItems,
            status: orderData.status,
            deliveryMethod: orderData.deliveryMethod || 'home',
            shippingAddress: orderData.shippingAddress,
            shippingCarrier: orderData.shippingCarrier,
            trackingNumber: orderData.trackingNumber,
        };
        
        return { success: true, message: "Commande trouvée.", order: order };
    } catch (error) {
        console.error("Error finding order: ", error);
        return { success: false, message: "Une erreur est survenue lors de la recherche de la commande." };
    }
}

export async function getOrdersByEmail(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; }> {
    const email = formData.get('email') as string;
    const locale = formData.get('locale') as string || 'fr';
    
    if (!email) {
        return { success: false, message: "Veuillez fournir une adresse e-mail." };
    }
    
    try {
        console.log(`[SERVER] Searching for orders with email: ${email}`);
        const q = query(collection(db, 'orders'), where('customerEmail', '==', email.trim()));
        const querySnapshot = await getDocs(q);
        console.log(`[SERVER] Found ${querySnapshot.docs.length} orders for ${email}`);

        const orders = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                orderNumber: data.orderNumber,
                status: data.status,
                createdAt: (data.createdAt as Timestamp).toDate().toLocaleDateString(locale),
            };
        });

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.atelierabijoux.com';
        const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@atelierabijoux.com';
        
        const emailFooterText = `\n\nPour toute question, vous pouvez répondre directement à cet e-mail ou contacter notre support à ${supportEmail}.`;
        const emailFooterHtml = `<p style="font-size:12px;color:#666;">Pour toute question, vous pouvez répondre directement à cet e-mail ou contacter notre support à <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>`;

        let mailText: string;
        let mailHtml: string;
        let returnMessage: string;
        
        if (orders.length > 0) {
            console.log('[SERVER] Orders found, preparing email.');
            returnMessage = `Email sent. ${orders.length} order(s) found.`;
            const ordersListText = orders.map(o => 
                `- Commande ${o.orderNumber} (du ${o.createdAt}) - Statut : ${o.status}`
            ).join('\\n');
            const ordersListHtml = orders.map(o => 
                `<li>Commande <strong>${o.orderNumber}</strong> (du ${o.createdAt}) - Statut : ${o.status} - <a href="${baseUrl}/${locale}/orders/track?orderNumber=${o.orderNumber}">Suivre cette commande</a></li>`
            ).join('');

            mailText = `Bonjour,\n\nVoici la liste de vos commandes récentes passées avec cette adresse e-mail :\n\n${ordersListText}\n\nVous pouvez cliquer sur le lien de chaque commande pour voir son statut.\n\nL'équipe Atelier à bijoux${emailFooterText}`;
            mailHtml = `<h1>Vos commandes Atelier à bijoux</h1><p>Bonjour,</p><p>Voici la liste de vos commandes récentes passées avec cette adresse e-mail :</p><ul>${ordersListHtml}</ul><p>L'équipe Atelier à bijoux</p>${emailFooterHtml}`;
        } else {
            console.log('[SERVER] No orders found, preparing notification email.');
            returnMessage = "Email sent. No orders found.";
            mailText = `Bonjour,\n\nVous avez récemment demandé à retrouver vos commandes. Aucune commande n'est associée à cette adresse e-mail (${email}).\n\nSi vous pensez qu'il s'agit d'une erreur, veuillez vérifier l'adresse e-mail ou contacter notre support.${emailFooterText}`;
            mailHtml = `<h1>Vos commandes Atelier à bijoux</h1><p>Bonjour,</p><p>Vous avez récemment demandé à retrouver vos commandes. Aucune commande n'est associée à cette adresse e-mail (${email}).</p><p>Si vous pensez qu'il s'agit d'une erreur, veuillez vérifier l'adresse e-mail ou contacter notre support.</p>${emailFooterHtml}`;
        }

        const mailDocData = {
            to: [email],
            message: {
                subject: "Vos commandes chez Atelier à bijoux",
                text: mailText.trim(),
                html: mailHtml.trim(),
            },
        };
        
        console.log('[SERVER] Creating mail document in Firestore.');
        const mailRef = doc(collection(db, 'mail'));
        await setDoc(mailRef, mailDocData);
        console.log('[SERVER] Mail document created successfully.');
        
        return { success: true, message: returnMessage };

    } catch (error: any) {
        console.error(`[SERVER] Error in getOrdersByEmail for ${email}:`, error);
        return { success: false, message: error.message };
    }
}


// --- Admin Order Actions ---

export async function getOrders(): Promise<Order[]> {
    try {
        const [ordersSnapshot, mailSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'))),
            getDocs(collection(db, 'mail'))
        ]);

        if (ordersSnapshot.empty) {
            return [];
        }

        const mailLogsByOrderNumber = new Map<string, MailLog[]>();
        mailSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const subject = data.message?.subject || '';
            const orderNumberMatch = subject.match(/n°\s*([A-Z0-9-]+)/);
            if (orderNumberMatch && orderNumberMatch[1]) {
                const orderNumber = orderNumberMatch[1];
                const delivery = data.delivery;
                const log: MailLog = {
                    id: doc.id,
                    to: data.to,
                    subject: subject,
                    delivery: delivery ? {
                        state: delivery.state,
                        startTime: toDate(delivery.startTime),
                        endTime: toDate(delivery.endTime),
                        error: delivery.error,
                        attempts: delivery.attempts
                    } : null
                };
                if (!mailLogsByOrderNumber.has(orderNumber)) {
                    mailLogsByOrderNumber.set(orderNumber, []);
                }
                mailLogsByOrderNumber.get(orderNumber)!.push(log);
            }
        });

        // Get all unique charm IDs from all orders first
        const allCharmIds = ordersSnapshot.docs.flatMap(doc => doc.data().items?.flatMap((item: OrderItem) => item.charmIds) || []);
        const uniqueCharmIds = Array.from(new Set(allCharmIds)).filter(id => id);

        // Fetch all required charms in a single query
        let charmsMap = new Map<string, Charm>();
        if (uniqueCharmIds.length > 0) {
            const charmsQuery = query(collection(db, 'charms'), where(documentId(), 'in', uniqueCharmIds));
            const charmsSnapshot = await getDocs(charmsQuery);
            for (const charmDoc of charmsSnapshot.docs) {
                const charmData = charmDoc.data() as Omit<Charm, 'id'>;
                const imageUrl = await getUrl(charmData.imageUrl, 'https://placehold.co/100x100.png');
                charmsMap.set(charmDoc.id, { ...charmData, id: charmDoc.id, imageUrl });
            }
        }
        
        const orders: Order[] = await Promise.all(ordersSnapshot.docs.map(async(orderDoc) => {
            const data = orderDoc.data();
            
            const enrichedItems: OrderItem[] = (data.items || []).map((item: OrderItem) => {
                const enrichedCharms = (item.charmIds || [])
                    .map(id => charmsMap.get(id))
                    .filter((c): c is Charm => !!c); // Filter out undefined charms

                return {
                    ...item,
                    charms: enrichedCharms,
                };
            });
            
            const previewImageUrls = await Promise.all(
                (data.items || []).map((item: OrderItem) => getUrl(item.previewImageUrl, 'https://placehold.co/400x400.png'))
            );

            enrichedItems.forEach((item, index) => {
                item.previewImageUrl = previewImageUrls[index];
            });
            
            const orderNumber = data.orderNumber;
            const mailHistory = mailLogsByOrderNumber.get(orderNumber) || [];

            return {
                id: orderDoc.id,
                orderNumber,
                createdAt: (data.createdAt as Timestamp).toDate(),
                customerEmail: data.customerEmail,
                totalPrice: data.totalPrice,
                status: data.status,
                items: enrichedItems,
                deliveryMethod: data.deliveryMethod || 'home',
                shippingAddress: data.shippingAddress,
                shippingCarrier: data.shippingCarrier,
                trackingNumber: data.trackingNumber,
                cancellationReason: data.cancellationReason,
                mailHistory: mailHistory,
            };
        }));

        return orders;
    } catch (error) {
        console.error("Error fetching orders:", error);
        return [];
    }
}

export async function updateOrderStatus(formData: FormData): Promise<{ success: boolean; message: string }> {
    const orderId = formData.get('orderId') as string;
    const newStatus = formData.get('status') as OrderStatus;
    const locale = formData.get('locale') as string || 'fr';

    if (!orderId || !newStatus) {
        return { success: false, message: "Informations manquantes." };
    }

    try {
        const orderRef = doc(db, 'orders', orderId);
        
        await runTransaction(db, async (transaction) => {
            // --- READ PHASE ---
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists()) {
                throw new Error("Commande non trouvée.");
            }
            
            const orderData = orderDoc.data();
            const currentStatus = orderData.status;

            if (currentStatus === 'annulée' && newStatus === 'annulée') {
                throw new Error("La commande est déjà annulée.");
            }
            
            let itemRefsToUpdate: DocumentReference[] = [];
            const stockToRestore = new Map<string, number>();

            if (newStatus === 'annulée' && currentStatus !== 'annulée') {
                const itemRefsToFetch = new Map<string, DocumentReference>();
                
                // Consolidate stock restoration requests
                for (const item of orderData.items as OrderItem[]) {
                    const modelRef = doc(db, item.jewelryTypeId, item.modelId);
                    if (!itemRefsToFetch.has(modelRef.path)) itemRefsToFetch.set(modelRef.path, modelRef);
                    stockToRestore.set(modelRef.path, (stockToRestore.get(modelRef.path) || 0) + 1);

                    for (const charmId of item.charmIds) {
                        const charmRef = doc(db, 'charms', charmId);
                        if (!itemRefsToFetch.has(charmRef.path)) itemRefsToFetch.set(charmRef.path, charmRef);
                        stockToRestore.set(charmRef.path, (stockToRestore.get(charmRef.path) || 0) + 1);
                    }
                }
                itemRefsToUpdate = Array.from(itemRefsToFetch.values());
            }
            
            const itemDocsPromises = itemRefsToUpdate.map(ref => transaction.get(ref));
            const itemDocs = await Promise.all(itemDocsPromises);
            
            // --- WRITE PHASE ---
            let dataToUpdate: Partial<Order> = { status: newStatus };

            if (newStatus === 'expédiée') {
                const shippingCarrier = formData.get('shippingCarrier') as string;
                const trackingNumber = formData.get('trackingNumber') as string;
                if (!shippingCarrier || !trackingNumber) {
                    throw new Error("Le transporteur et le numéro de suivi sont obligatoires pour une expédition.");
                }
                dataToUpdate.shippingCarrier = shippingCarrier;
                dataToUpdate.trackingNumber = trackingNumber;
            }

            if (newStatus === 'annulée') {
                const cancellationReason = formData.get('cancellationReason') as string;
                if (!cancellationReason) {
                    throw new Error("Le motif de l'annulation est obligatoire.");
                }
                dataToUpdate.cancellationReason = cancellationReason;

                // If the order has a paymentIntentId, process a refund.
                if (orderData.paymentIntentId) {
                    const refundResult = await refundStripePayment(orderData.paymentIntentId);
                    if (!refundResult.success) {
                        throw new Error(`Le remboursement a échoué: ${refundResult.message}. L'annulation a été interrompue.`);
                    }
                }

                if (currentStatus !== 'annulée') {
                    for (const itemDoc of itemDocs) {
                         if (itemDoc.exists()) {
                            const quantityToRestore = stockToRestore.get(itemDoc.ref.path) || 0;
                            const newQuantity = (itemDoc.data().quantity || 0) + quantityToRestore;
                            transaction.update(itemDoc.ref, { quantity: newQuantity });
                        }
                    }
                }

                // Send cancellation email
                const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@atelierabijoux.com';
                const emailFooterText = `\n\nPour toute question, vous pouvez répondre directement à cet e-mail ou contacter notre support à ${supportEmail} en précisant votre numéro de commande (${orderData.orderNumber}).`;
                const emailFooterHtml = `<p style="font-size:12px;color:#666;">Pour toute question, vous pouvez répondre directement à cet e-mail ou contacter notre support à <a href="mailto:${supportEmail}">${supportEmail}</a> en précisant votre numéro de commande (${orderData.orderNumber}).</p>`;

                const mailText = `Bonjour,\n\nVotre commande n°${orderData.orderNumber} a été annulée.\n\nMotif : ${cancellationReason}\n\nLe remboursement complet a été initié et devrait apparaître sur votre compte d'ici quelques jours.\n\nNous nous excusons pour ce désagrément.\n\nL'équipe Atelier à bijoux${emailFooterText}`;
                const mailHtml = `<h1>Votre commande n°${orderData.orderNumber} a été annulée</h1><p>Bonjour,</p><p>Votre commande n°<strong>${orderData.orderNumber}</strong> a été annulée.</p><p><strong>Motif de l'annulation :</strong> ${cancellationReason}</p><p>Le remboursement complet a été initié et devrait apparaître sur votre compte d'ici quelques jours.</p><p>Nous nous excusons pour ce désagrément.</p><p>L'équipe Atelier à bijoux</p>${emailFooterHtml}`;
                
                const mailDocData = {
                    to: [orderData.customerEmail],
                    message: {
                        subject: `Annulation de votre commande n°${orderData.orderNumber}`,
                        text: mailText.trim(),
                        html: mailHtml.trim(),
                    },
                };
                const mailRef = doc(collection(db, 'mail'));
                transaction.set(mailRef, mailDocData);
            }
            
            transaction.update(orderRef, dataToUpdate);
        });

        revalidatePath(`/${locale}/admin/dashboard`);
        return { success: true, message: "Le statut de la commande a été mis à jour." };
    } catch (error: any) {
        console.error("Error updating order status:", error);
        return { success: false, message: error.message || "Une erreur est survenue." };
    }
}

export async function updateOrderItemStatus(formData: FormData): Promise<{ success: boolean; message: string }> {
    const orderId = formData.get('orderId') as string;
    const itemIndex = parseInt(formData.get('itemIndex') as string, 10);
    const isCompleted = formData.get('isCompleted') === 'true';

    if (!orderId || isNaN(itemIndex)) {
        return { success: false, message: "Informations manquantes." };
    }

    try {
        const orderRef = doc(db, 'orders', orderId);
        
        await runTransaction(db, async (transaction) => {
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists()) {
                throw new Error("La commande n'existe pas.");
            }
            
            const orderData = orderDoc.data();
            const items = orderData.items as OrderItem[];

            if (itemIndex < 0 || itemIndex >= items.length) {
                 throw new Error("Index de l'article invalide.");
            }

            items[itemIndex].isCompleted = isCompleted;
            
            transaction.update(orderRef, { items: items });
        });

        revalidatePath(`/fr/admin/dashboard`);
        return { success: true, message: "Statut de l'article mis à jour." };
    } catch (error: any) {
        return { success: false, message: error.message || "Une erreur est survenue." };
    }
}

// AI Actions
export async function getCharmSuggestionsAction(input: CharmSuggestionInput): Promise<{
    success: boolean;
    suggestions?: CharmSuggestionOutput['suggestions'];
    error?: string;
}> {
    try {
        console.log('[SERVER ACTION] Calling getCharmSuggestionsFlow with input:', input);
        const result = await getCharmSuggestionsFlow(input);
        return { success: true, suggestions: result.suggestions };
    } catch (error: any) {
        console.error('[SERVER ACTION] Error calling AI flow:', error);
        return { success: false, error: error.message || "Une erreur est survenue lors de la génération des suggestions." };
    }
}

export async function getCharmAnalysisSuggestionsAction(input: CharmAnalysisSuggestionInput): Promise<{
    success: boolean;
    suggestions?: CharmAnalysisSuggestionOutput['suggestions'];
    error?: string;
}> {
    try {
        console.log('[SERVER ACTION] Calling getCharmAnalysisSuggestionsFlow');
        const result = await getCharmAnalysisSuggestionsFlow(input);
        return { success: true, suggestions: result.suggestions };
    } catch (error: any) {
        console.error('[SERVER ACTION] Error calling AI analysis flow:', error);
        return { success: false, error: error.message || "Une erreur est survenue lors de l'analyse de l'image." };
    }
}

export async function getCharmDesignCritiqueAction(input: CharmDesignCritiqueInput): Promise<{
    success: boolean;
    critique?: string;
    error?: string;
}> {
    try {
        console.log('[SERVER ACTION] Calling getCharmDesignCritiqueFlow');
        const result = await getCharmDesignCritiqueFlow(input);
        return { success: true, critique: result.critique };
    } catch (error: any) {
        console.error('[SERVER ACTION] Error calling AI critique flow:', error);
        return { success: false, error: error.message || "Une erreur est survenue lors de l'analyse." };
    }
}

export async function generateShareContentAction(input: GenerateShareContentInput): Promise<{
    success: boolean;
    content?: GenerateShareContentOutput;
    error?: string;
}> {
    try {
        console.log('[SERVER ACTION] Calling generateShareContentFlow');
        const result = await generateShareContentFlow(input);
        return { success: true, content: result };
    } catch (error: any) {
        console.error('[SERVER ACTION] Error calling AI share content flow:', error);
        return { success: false, error: error.message || "Une erreur est survenue lors de la génération du contenu." };
    }
}


export async function getRefreshedCharms(): Promise<{ success: boolean; charms?: Charm[], error?: string; }> {
    try {
        const charms = await fetchCharms();
        return { success: true, charms };
    } catch (error: any) {
        console.error('[SERVER ACTION] Error refreshing charms:', error);
        return { success: false, error: error.message || "Une erreur est survenue lors du rafraîchissement des breloques." };
    }
}


// --- Creation Actions ---

export async function saveCreation(
    idToken: string,
    name: string,
    description: string,
    creationPayload: string
): Promise<{ success: boolean; message: string; creationId?: string }> {

    if (!idToken) {
        return { success: false, message: "Jeton d'authentification manquant." };
    }
    
    if (!adminApp) {
      return { success: false, message: "Le module d'administration Firebase n'est pas configuré. Veuillez définir la variable d'environnement FIREBASE_SERVICE_ACCOUNT." };
    }
    
    let user;
    try {
        const adminAuth = getAdminAuth(adminApp);
        user = await adminAuth.verifyIdToken(idToken, true);
    } catch (error: any) {
        return { success: false, message: error.message || "Erreur d'authentification." };
    }
    
    if (!user) {
         return { success: false, message: "Vous devez être connecté pour publier une création." };
    }

    const {
        jewelryTypeId,
        modelId,
        placedCharms: simplePlacedCharms,
        previewImageUrl,
    } = JSON.parse(creationPayload) as {
        jewelryTypeId: string;
        modelId: string;
        placedCharms: {
            charmId: string;
            position: { x: number; y: number };
            rotation: number;
        }[];
        previewImageUrl: string;
    };
    
    if (!name.trim()) {
        return { success: false, message: "Le nom de la création est obligatoire." };
    }

    try {
        const charmIds = simplePlacedCharms.map(pc => pc.charmId);
        const charmDocs = charmIds.length > 0 ? await getDocs(query(collection(db, 'charms'), where(documentId(), 'in', charmIds))) : { docs: [] };
        
        const charmsMap = new Map(charmDocs.docs.map(doc => [doc.id, doc.data()]));

        const placedCharms: PlacedCreationCharm[] = simplePlacedCharms.map(spc => {
            const charmData = charmsMap.get(spc.charmId);
            if (!charmData) throw new Error(`Charm with id ${spc.charmId} not found`);

            const cleanCharm: CreationCharm = {
                id: spc.charmId,
                name: charmData.name,
                imageUrl: charmData.imageUrl,
                description: charmData.description,
                categoryIds: charmData.categoryIds,
                price: charmData.price,
                width: charmData.width,
                height: charmData.height,
            };

            return {
                id: `${spc.charmId}-${Date.now()}-${Math.random()}`,
                charm: cleanCharm,
                position: spc.position,
                rotation: spc.rotation,
            };
        });
        
        const creationData: Omit<Creation, 'id' | 'createdAt'> = {
            creatorId: user.uid,
            creatorName: user.name || user.email || "Créateur anonyme",
            name,
            description,
            jewelryTypeId,
            modelId,
            placedCharms: placedCharms,
            previewImageUrl: previewImageUrl,
            salesCount: 0,
            likesCount: 0,
        };

        let finalPreviewUrl = creationData.previewImageUrl;
        if (finalPreviewUrl.startsWith('data:image')) {
            const storageRef = ref(storage, `creation_previews/${user.uid}-${Date.now()}.png`);
            const uploadResult = await uploadString(storageRef, finalPreviewUrl, 'data_url');
            finalPreviewUrl = await getDownloadURL(uploadResult.ref);
        }

        const docRef = await addDoc(collection(db, 'creations'), {
            ...creationData,
            previewImageUrl: finalPreviewUrl,
            createdAt: serverTimestamp()
        });
        
        revalidatePath(`/${'fr'}/profil`);

        return { success: true, message: "Votre création a été publiée avec succès !", creationId: docRef.id };

    } catch (error: any) {
        console.error("Error saving creation:", error);
        return { success: false, message: "Une erreur est survenue lors de la publication de la création." };
    }
}

export async function getUserCreations(userId: string): Promise<Creation[]> {
    if (!userId) {
        return [];
    }

    const creationsRef = collection(db, 'creations');
    const q = query(creationsRef, where('creatorId', '==', userId), orderBy('createdAt', 'desc'));
    
    try {
        console.log(`[SERVER] Fetching creations for userId: ${userId}`);
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            console.log("[SERVER] No creations found.");
            return [];
        }
        console.log(`[SERVER] Found ${querySnapshot.docs.length} creations.`);

        const creations = await Promise.all(querySnapshot.docs.map(async (doc) => {
            const data = doc.data();
            const previewImageUrl = await getUrl(data.previewImageUrl, 'https://placehold.co/400x400.png');
            
            const resolvedPlacedCharms = await Promise.all(
                (data.placedCharms || []).map(async (pc: PlacedCreationCharm) => {
                    const charmImageUrl = await getUrl(pc.charm.imageUrl, 'https://placehold.co/100x100.png');
                    return {
                        ...pc,
                        charm: {
                            ...pc.charm,
                            imageUrl: charmImageUrl
                        }
                    };
                })
            );

            return {
                id: doc.id,
                ...data,
                previewImageUrl,
                placedCharms: resolvedPlacedCharms,
                createdAt: toDate(data.createdAt as Timestamp)!,
            } as Creation;
        }));
        
        console.log(`[SERVER] Returning ${creations.length} processed creations.`);
        return creations;
    } catch (error: any) {
        console.error("[SERVER] Error fetching user creations:", error);
        return [];
    }
}

export async function toggleLikeCreation(creationId: string, idToken: string): Promise<{ success: boolean; message?: string; newLikesCount?: number }> {
    if (!idToken) {
        return { success: false, message: "Utilisateur non authentifié." };
    }
    
    if (!adminApp) {
        return { success: false, message: "Le module d'administration Firebase n'est pas configuré." };
    }
    
    let user;
    try {
        const adminAuth = getAdminAuth(adminApp);
        user = await adminAuth.verifyIdToken(idToken, true);
    } catch (error: any) {
        return { success: false, message: "Jeton d'authentification invalide." };
    }

    const creationRef = doc(db, 'creations', creationId);
    const likeRef = doc(db, 'creations', creationId, 'likes', user.uid);

    try {
        const newLikesCount = await runTransaction(db, async (transaction) => {
            const likeDoc = await transaction.get(likeRef);
            const creationDoc = await transaction.get(creationRef);

            if (!creationDoc.exists()) {
                throw new Error("La création n'existe pas.");
            }

            const currentLikes = creationDoc.data().likesCount || 0;

            if (likeDoc.exists()) {
                // User has liked, so unlike
                transaction.delete(likeRef);
                transaction.update(creationRef, { likesCount: increment(-1) });
                return currentLikes - 1;
            } else {
                // User has not liked, so like
                transaction.set(likeRef, { createdAt: serverTimestamp() });
                transaction.update(creationRef, { likesCount: increment(1) });
                return currentLikes + 1;
            }
        });
        
        revalidatePath('/fr/profil');
        return { success: true, newLikesCount };

    } catch (error: any) {
        console.error("Error toggling like:", error);
        return { success: false, message: "Une erreur est survenue lors de l'opération." };
    }
}
    
export async function updateCreation() {
    // TODO: Implement creation update logic
}

export async function deleteCreation(idToken: string, creationId: string): Promise<{ success: boolean; message: string; }> {
    if (!idToken) {
        return { success: false, message: "Utilisateur non authentifié." };
    }
    if (!adminApp) {
        return { success: false, message: "Le module d'administration Firebase n'est pas configuré." };
    }
    
    let user;
    try {
        const adminAuth = getAdminAuth(adminApp);
        user = await adminAuth.verifyIdToken(idToken, true);
    } catch (error: any) {
        return { success: false, message: "Jeton d'authentification invalide." };
    }
    
    const creationRef = doc(db, 'creations', creationId);

    try {
        const creationDoc = await getDoc(creationRef);
        if (!creationDoc.exists()) {
            return { success: false, message: "La création n'existe pas." };
        }

        const creationData = creationDoc.data() as Creation;
        if (creationData.creatorId !== user.uid) {
            return { success: false, message: "Vous n'êtes pas autorisé à supprimer cette création." };
        }
        
        // Delete preview image from storage
        await deleteFileFromStorage(creationData.previewImageUrl);
        
        // TODO: In a real app, we should also delete all likes in the subcollection.
        // This is a more complex operation (batched writes or a cloud function).
        // For now, we'll just delete the main document.

        // Delete the creation document
        await deleteDoc(creationRef);
        
        revalidatePath('/fr/profil');
        
        return { success: true, message: "La création a été supprimée avec succès." };

    } catch (error: any) {
        console.error("Error deleting creation:", error);
        return { success: false, message: "Une erreur est survenue lors de la suppression." };
    }
}
