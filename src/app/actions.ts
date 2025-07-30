









'use server';

import { suggestCharmPlacement, SuggestCharmPlacementInput, SuggestCharmPlacementOutput } from '@/ai/flows/charm-placement-suggestions';
import { revalidatePath } from 'next/cache';
import { db, storage } from '@/lib/firebase';
import { doc, deleteDoc, addDoc, updateDoc, collection, getDoc, getDocs, writeBatch, query, where, setDoc, serverTimestamp, runTransaction, Timestamp, collectionGroup, documentId, orderBy } from 'firebase/firestore';
import { ref, deleteObject, uploadString, getDownloadURL } from 'firebase/storage';
import { cookies } from 'next/headers';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { redirect } from 'next/navigation';
import type { JewelryModel, CharmCategory, Charm, GeneralPreferences, CartItem, OrderStatus, Order, OrderItem, PlacedCharm } from '@/lib/types';


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

// --- Order Actions ---

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


export async function createOrder(cartItems: SerializableCartItem[], email: string): Promise<{ success: boolean; message: string; orderNumber?: string, email?: string }> {
    if (!cartItems || cartItems.length === 0) {
        return { success: false, message: 'Le panier est vide.' };
    }

    try {
         const orderData = await runTransaction(db, async (transaction) => {
            // Step 1: Check stock and prepare updates
            const stockUpdates: { ref: any, newQuantity: number }[] = [];
            for (const item of cartItems) {
                // Check model stock
                const modelRef = doc(db, item.jewelryType.id, item.model.id);
                const modelDoc = await transaction.get(modelRef);
                if (!modelDoc.exists()) throw new Error(`Le modèle ${item.model.name} n'existe plus.`);
                const modelStock = modelDoc.data().quantity || 0;
                if (modelStock < 1) throw new Error(`Le modèle ${item.model.name} est en rupture de stock.`);
                stockUpdates.push({ ref: modelRef, newQuantity: modelStock - 1 });

                // Check charms stock
                for (const pc of item.placedCharms) {
                    const charmRef = doc(db, 'charms', pc.charm.id);
                    const charmDoc = await transaction.get(charmRef);
                    if (!charmDoc.exists()) throw new Error(`La breloque ${pc.charm.name} n'existe plus.`);
                    const charmStock = charmDoc.data().quantity || 0;
                    if (charmStock < 1) throw new Error(`La breloque ${pc.charm.name} est en rupture de stock.`);
                    stockUpdates.push({ ref: charmRef, newQuantity: charmStock - 1 });
                }
            }

            // Step 2: Upload all preview images to Firebase Storage
            const uploadPromises = cartItems.map(async (item) => {
                const storageRef = ref(storage, `order_previews/${item.id}-${Date.now()}.png`);
                const uploadResult = await uploadString(storageRef, item.previewImage, 'data_url');
                return getDownloadURL(uploadResult.ref);
            });
            const previewImageUrls = await Promise.all(uploadPromises);

            // Step 3: Apply stock updates
            stockUpdates.forEach(update => {
                transaction.update(update.ref, { quantity: update.newQuantity });
            });

            // Step 4: Prepare the order data
            const totalOrderPrice = cartItems.reduce((sum, item) => {
                const modelPrice = item.model.price || 0;
                const charmsPrice = item.placedCharms.reduce((charmSum, pc) => charmSum + (pc.charm.price || 0), 0);
                return sum + modelPrice + charmsPrice;
            }, 0);

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
            };

            const orderRef = doc(collection(db, 'orders'));
            transaction.set(orderRef, { ...newOrderData, createdAt: serverTimestamp() });
            
            // Step 5: Prepare email data
            const mailDocData = {
                to: [email],
                message: {
                    subject: `Confirmation de votre commande n°${orderNumber}`,
                    text: `Bonjour,\n\nNous avons bien reçu votre commande n°${orderNumber} d'un montant total de ${totalOrderPrice.toFixed(2)}€.\n\nRécapitulatif :\n${cartItems.map(item => `- ${item.model.name} avec ${item.placedCharms.length} breloque(s)`).join('\n')}\n\nVous recevrez un autre e-mail lorsque votre commande sera expédiée.\n\nL'équipe Atelier à bijoux`.trim(),
                    html: `<h1>Merci pour votre commande !</h1><p>Bonjour,</p><p>Nous avons bien reçu votre commande n°<strong>${orderNumber}</strong> d'un montant total de ${totalOrderPrice.toFixed(2)}€.</p><h2>Récapitulatif :</h2><ul>${cartItems.map(item => `<li>${item.model.name} avec ${item.placedCharms.length} breloque(s)</li>`).join('')}</ul><p>Vous recevrez un autre e-mail lorsque votre commande sera expédiée.</p><p>L'équipe Atelier à bijoux</p>`,
                },
            };

            const mailRef = doc(collection(db, 'mail'));
            transaction.set(mailRef, mailDocData);
            
            return { success: true, message: 'Votre commande a été passée avec succès !', orderNumber, email };
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
                charmsMap.set(charmDoc.id, { ...charmData, id: charmDoc.id });
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
                         modelsMap.set(modelDoc.id, { id: modelDoc.id, ...modelDoc.data() } as JewelryModel);
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
            shippingCarrier: orderData.shippingCarrier,
            trackingNumber: orderData.trackingNumber,
        };
        
        return { success: true, message: "Commande trouvée.", order: order };
    } catch (error) {
        return { success: false, message: "Une erreur est survenue lors de la recherche de la commande." };
    }
}

export async function getOrdersByEmail(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; orders?: Omit<Order, 'items' | 'totalPrice'>[] | null }> {
    const email = formData.get('email') as string;
    
    if (!email) {
        return { success: false, message: "Veuillez fournir une adresse e-mail." };
    }
    
    // For security reasons, we don't query the database here.
    // In a real application, you would trigger a secure, rate-limited email sending service.
    // Here, we just return a success message to the user.
    // This prevents malicious users from checking if an email has an account.

    // const q = query(
    //     collection(db, 'orders'), 
    //     where('customerEmail', '==', email.trim()),
    //     orderBy('createdAt', 'desc')
    // );
    // const querySnapshot = await getDocs(q);
    
    // if (!querySnapshot.empty) {
    //    // TODO: Send email with order numbers
    // }

    return { success: true, message: "email_sent_notice" };
}


// --- Admin Order Actions ---

export async function getOrders(): Promise<Order[]> {
    try {
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        const orders: Order[] = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                orderNumber: data.orderNumber,
                createdAt: (data.createdAt as Timestamp).toDate(),
                customerEmail: data.customerEmail,
                totalPrice: data.totalPrice,
                status: data.status,
                items: data.items, // Items are not fully enriched here
                shippingCarrier: data.shippingCarrier,
                trackingNumber: data.trackingNumber,
                cancellationReason: data.cancellationReason,
            };
        });
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
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists()) {
                throw new Error("Commande non trouvée.");
            }
            
            const orderData = orderDoc.data();
            const currentStatus = orderData.status;

            // Prevent re-cancelling or re-stocking
            if (currentStatus === 'annulée' && newStatus === 'annulée') {
                throw new Error("La commande est déjà annulée.");
            }

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

                // Restock items only if the order was not already cancelled
                if (currentStatus !== 'annulée') {
                    for (const item of orderData.items as OrderItem[]) {
                        // Restock model
                        const modelRef = doc(db, item.jewelryTypeId, item.modelId);
                        const modelDoc = await transaction.get(modelRef);
                        if (modelDoc.exists()) {
                            const newQuantity = (modelDoc.data().quantity || 0) + 1;
                            transaction.update(modelRef, { quantity: newQuantity });
                        }

                        // Restock charms
                        for (const charmId of item.charmIds) {
                            const charmRef = doc(db, 'charms', charmId);
                            const charmDoc = await transaction.get(charmRef);
                            if (charmDoc.exists()) {
                                const newQuantity = (charmDoc.data().quantity || 0) + 1;
                                transaction.update(charmRef, { quantity: newQuantity });
                            }
                        }
                    }
                }
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
