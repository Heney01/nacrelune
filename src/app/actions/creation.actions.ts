

'use server';

import { revalidatePath } from 'next/cache';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, addDoc, updateDoc, collection, getDocs, query, where, documentId, orderBy, serverTimestamp, runTransaction, increment, deleteDoc, startAfter, limit } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { adminApp } from '@/lib/firebase-admin';
import type { Creation, PlacedCreationCharm, User, PlacedCharm, Charm } from '@/lib/types';
import { toDate, getCharms, getPaginatedCreations, PaginatedCreationsOptions } from '@/lib/data';


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
        const placedCharmsForDb: PlacedCreationCharm[] = simplePlacedCharms.map(spc => {
            return {
                charmId: spc.charmId,
                position: spc.position,
                rotation: spc.rotation,
            };
        });
        
        const creationData: Omit<Creation, 'id' | 'createdAt' | 'creator' | 'hydratedCharms'> = {
            creatorId: user.uid,
            name,
            jewelryTypeId,
            modelId,
            placedCharms: placedCharmsForDb,
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

async function hydrateCreations(creationDocs: any[], allCharms: Charm[]): Promise<Creation[]> {
    const charmsMap = new Map(allCharms.map(c => [c.id, c]));
    
    const userIds = Array.from(new Set(creationDocs.map(d => d.data().creatorId))) as string[];
    let creatorsMap = new Map<string, User>();
    if (userIds.length > 0) {
        // Firestore 'in' query is limited to 30 items. If you expect more, you'll need to chunk the requests.
        const userDocsSnapshot = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', userIds.slice(0, 30))));
        userDocsSnapshot.docs.forEach(doc => {
            creatorsMap.set(doc.id, { uid: doc.id, ...doc.data() } as User);
        });
    }

    const creations = await Promise.all(creationDocs.map(async (doc) => {
        const data = doc.data();
        const previewImageUrl = await getUrl(data.previewImageUrl, 'https://placehold.co/400x400.png');
        
        const hydratedCharms: PlacedCharm[] = (data.placedCharms || []).map((pc: PlacedCreationCharm, index: number) => {
            const charmData = charmsMap.get(pc.charmId);
            if (!charmData) return null;
            
            return {
                id: `${pc.charmId}-${index}`,
                charm: charmData,
                position: pc.position,
                rotation: pc.rotation,
            };
        }).filter((c: PlacedCharm | null): c is PlacedCharm => c !== null);

        return {
            id: doc.id,
            ...data,
            creator: creatorsMap.get(data.creatorId),
            previewImageUrl,
            hydratedCharms,
            placedCharms: data.placedCharms,
            createdAt: toDate(data.createdAt as any)!,
        } as Creation;
    }));
    
    return creations;
}

export async function getUserCreations(userId: string): Promise<Creation[]> {
    if (!userId) {
        return [];
    }

    try {
        console.log(`[SERVER] Fetching creations for userId: ${userId}`);
        const [creationsSnapshot, allCharms] = await Promise.all([
             getDocs(query(collection(db, 'creations'), where('creatorId', '==', userId), orderBy('createdAt', 'desc'))),
             getCharms() // Fetch all charms once
        ]);
        
        if (creationsSnapshot.empty) {
            console.log("[SERVER] No creations found.");
            return [];
        }
        console.log(`[SERVER] Found ${creationsSnapshot.docs.length} creations.`);

        const hydratedCreations = await hydrateCreations(creationsSnapshot.docs, allCharms);
        
        console.log(`[SERVER] Returning ${hydratedCreations.length} processed creations.`);
        return hydratedCreations;
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
                transaction.set(likeRef, {}); // Store an empty document to signify a like
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
    name: string
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


export async function searchCreators(searchTerm: string): Promise<{ success: boolean; creators?: User[]; error?: string }> {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return { success: true, creators: [] };
  }

  const normalizedSearchTerm = searchTerm.toLowerCase();

  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('searchableTerms', 'array-contains', normalizedSearchTerm),
      limit(10)
    );

    const querySnapshot = await getDocs(q);

    const creators: User[] = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      creators.push({
        uid: doc.id,
        displayName: data.displayName,
        email: data.email,
        photoURL: data.photoURL || null,
        // No need to return searchableTerms to the client
      });
    });

    return { success: true, creators: creators };

  } catch (error: any) {
    console.error("Error searching creators:", error);
    // This can happen if the composite index is not created yet.
    if (error.code === 'failed-precondition') {
        return { success: false, error: "La recherche est en cours de configuration. Veuillez réessayer dans quelques instants." };
    }
    return { success: false, error: "Une erreur est survenue lors de la recherche des créateurs." };
  }
}

export async function getMoreCreations(options: PaginatedCreationsOptions): Promise<{ creations: Creation[], hasMore: boolean }> {
  const { sortBy, timeFilter, cursor, cursorId } = options;
  
  const paginatedOptions: PaginatedCreationsOptions = {
    sortBy,
    timeFilter,
    cursor,
    cursorId,
  };
  
  return getPaginatedCreations(paginatedOptions);
}
