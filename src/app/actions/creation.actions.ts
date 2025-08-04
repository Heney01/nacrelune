
'use server';

import { revalidatePath } from 'next/cache';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, addDoc, updateDoc, collection, getDocs, query, where, documentId, orderBy, serverTimestamp, runTransaction, increment, deleteDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { adminApp } from '@/lib/firebase-admin';
import type { Creation, CreationCharm, PlacedCreationCharm } from '@/lib/types';
import { toDate } from '@/lib/data';


// --- Helper Functions ---

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
                createdAt: toDate(data.createdAt as any)!,
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
    
export async function updateCreation(
    idToken: string,
    creationId: string,
    name: string,
    description: string
): Promise<{ success: boolean; message: string; }> {
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

    if (!name.trim()) {
        return { success: false, message: "Le nom de la création est obligatoire." };
    }

    const creationRef = doc(db, 'creations', creationId);

    try {
        const creationDoc = await getDoc(creationRef);
        if (!creationDoc.exists() || creationDoc.data().creatorId !== user.uid) {
            return { success: false, message: "Vous n'êtes pas autorisé à modifier cette création." };
        }

        await updateDoc(creationRef, {
            name,
            description,
        });
        
        revalidatePath('/fr/profil');
        return { success: true, message: "Votre création a été mise à jour avec succès." };

    } catch (error: any) {
        console.error("Error updating creation:", error);
        return { success: false, message: "Une erreur est survenue lors de la mise à jour." };
    }
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

    