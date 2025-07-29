
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
        if (urlObj.hostname === 'firebasestorage.googleapis.com') {
            const decodedPath = decodeURIComponent(urlObj.pathname);
            const pathRegex = /\/o\/(.*)/;
            const match = decodedPath.match(pathRegex);
            if (match && match[1]) {
                return match[1];
            }
        }
    } catch (e) {
        // Not a valid URL
    }
    if (url.includes('placehold.co')) return null;
    return url;
};

export async function deleteModel(formData: FormData): Promise<{ success: boolean; message: string }> {
    console.log("--- [SERVER] deleteModel action called ---");
    const modelId = formData.get('modelId') as string;
    const jewelryTypeId = formData.get('jewelryTypeId') as string;
    const displayImageUrl = formData.get('displayImageUrl') as string;
    const editorImageUrl = formData.get('editorImageUrl') as string;

    console.log(`--- [SERVER] Received data: modelId=${modelId}, jewelryTypeId=${jewelryTypeId}`);

    if (!modelId || !jewelryTypeId) {
        const errorMsg = "Les informations du modèle sont manquantes.";
        console.error(`--- [SERVER] Error: ${errorMsg}`);
        return { success: false, message: errorMsg };
    }

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
        
        revalidatePath('/admin/dashboard'); 
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
