
'use server';

import { suggestCharmPlacement, SuggestCharmPlacementInput, SuggestCharmPlacementOutput } from '@/ai/flows/charm-placement-suggestions';
import { revalidatePath } from 'next/cache';
import { db, storage } from '@/lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';

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
        // Firebase Storage URLs in the format: https://firebasestorage.googleapis.com/v0/b/your-bucket.appspot.com/o/path%2Fto%2Ffile.jpg?alt=media&token=...
        if (urlObj.hostname === 'firebasestorage.googleapis.com') {
             // The pathname is like /v0/b/your-bucket/o/path%2Fto%2Ffile.jpg
            // We need to decode it and extract the path after the '/o/'
            const decodedPath = decodeURIComponent(urlObj.pathname);
            const pathRegex = /\/o\/(.*)/;
            const match = decodedPath.match(pathRegex);
            if (match && match[1]) {
                return match[1];
            }
        }
    } catch (e) {
        // Not a valid URL, might be a path already
    }
    // If it's not a full URL, assume it's a path, but don't return placeholder paths
    if (url.includes('placehold.co')) return null;
    return url;
};


export async function deleteModel(prevState: any, formData: FormData): Promise<{ success: boolean; message: string }> {
    const modelId = formData.get('modelId') as string;
    const jewelryTypeId = formData.get('jewelryTypeId') as string;
    const displayImageUrl = formData.get('displayImageUrl') as string;
    const editorImageUrl = formData.get('editorImageUrl') as string;

    if (!modelId || !jewelryTypeId) {
        return { success: false, message: "Les informations du modèle sont manquantes." };
    }

    try {
        // 1. Delete Firestore document
        await deleteDoc(doc(db, jewelryTypeId, modelId));
        
        // 2. Delete images from Storage
        const filesToDelete = [
            getFileNameFromUrl(displayImageUrl),
            getFileNameFromUrl(editorImageUrl)
        ].filter(Boolean); // filter out null/undefined values

        for (const filePath of filesToDelete) {
             if (filePath) {
                const fileRef = ref(storage, filePath);
                await deleteObject(fileRef);
            }
        }
        
        revalidatePath('/admin/dashboard'); 
        return { success: true, message: "Le modèle a été supprimé avec succès." };

    } catch (error: any) {
        console.error("Erreur lors de la suppression du modèle: ", error);
        
        let errorMessage = "Une erreur est survenue lors de la suppression du modèle.";
        if (error.code === 'storage/object-not-found') {
            errorMessage = "Le document a été supprimé, mais une ou plusieurs images associées n'ont pas été trouvées dans le stockage.";
        }
        
        return { success: false, message: errorMessage };
    }
}
