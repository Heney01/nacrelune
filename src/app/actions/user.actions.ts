
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, runTransaction, increment } from 'firebase/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { adminApp } from '@/lib/firebase-admin';

export async function toggleLikeCreator(
    creatorId: string, 
    idToken: string
): Promise<{ success: boolean; message?: string; newLikesCount?: number }> {
    if (!idToken) {
        return { success: false, message: "Utilisateur non authentifié." };
    }
    
    if (!adminApp) {
        return { success: false, message: "Le module d'administration Firebase n'est pas configuré." };
    }
    
    let liker;
    try {
        const adminAuth = getAdminAuth(adminApp);
        liker = await adminAuth.verifyIdToken(idToken, true);
    } catch (error: any) {
        return { success: false, message: "Jeton d'authentification invalide." };
    }

    if (liker.uid === creatorId) {
        return { success: false, message: "Vous ne pouvez pas aimer votre propre profil." };
    }

    const creatorRef = doc(db, 'users', creatorId);
    const likeRef = doc(db, 'users', creatorId, 'likes', liker.uid);

    try {
        const newLikesCount = await runTransaction(db, async (transaction) => {
            const likeDoc = await transaction.get(likeRef);
            const creatorDoc = await transaction.get(creatorRef);

            if (!creatorDoc.exists()) {
                throw new Error("Le créateur n'existe pas.");
            }

            const currentLikes = creatorDoc.data().likesCount || 0;

            if (likeDoc.exists()) {
                // User has liked, so unlike
                transaction.delete(likeRef);
                transaction.update(creatorRef, { likesCount: increment(-1) });
                return currentLikes - 1;
            } else {
                // User has not liked, so like
                transaction.set(likeRef, {}); // Store an empty document to signify a like
                transaction.update(creatorRef, { likesCount: increment(1) });
                return currentLikes + 1;
            }
        });
        
        return { success: true, newLikesCount };

    } catch (error: any) {
        console.error("Error toggling creator like:", error);
        return { success: false, message: "Une erreur est survenue lors de l'opération." };
    }
}
