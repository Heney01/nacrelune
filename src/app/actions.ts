

// @/app/actions.ts
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

// Helper function to extract file name from Firebase Storage URL
const getFileNameFromUrl = (url: string): string | null => {
    try {
        const urlObj = new URL(url);
        // The pathname is like /v0/b/your-bucket/o/path%2Fto%2Ffile.jpg
        // We need to decode it and extract the path after the '/o/'
        const decodedPath = decodeURIComponent(urlObj.pathname);
        const pathRegex = /\/o\/(.*)/;
        const match = decodedPath.match(pathRegex);
        if (match && match[1]) {
            // The matched part can still have a query string like ?alt=media&token=...
            // We only want the part before the question mark.
            return match[1].split('?')[0];
        }
        return null;
    } catch (e) {
        console.error("Invalid URL provided to getFileNameFromUrl", url, e);
        return null;
    }
};

// Helper function to delete an image from Firebase Storage
const deleteImage = async (imageUrl: string) => {
    // Don't try to delete placeholder images
    if (imageUrl.includes('placehold.co')) {
        console.log(`Skipping placeholder image deletion: ${imageUrl}`);
        return;
    }

    const fileName = getFileNameFromUrl(imageUrl);
    if (!fileName) {
        console.warn(`Could not determine file name from URL, skipping delete: ${imageUrl}`);
        return;
    }

    try {
        const imageRef = ref(storage, fileName);
        await deleteObject(imageRef);
        console.log(`Successfully deleted image: ${fileName}`);
    } catch (error: any) {
        // It's okay if the object doesn't exist (e.g., it was already deleted or never existed)
        if (error.code === 'storage/object-not-found') {
            console.warn(`Image not found, could not delete: ${fileName}`);
        } else {
            // For other errors, we should log them
            console.error(`Error deleting image ${fileName}:`, error);
            // We re-throw the error to be caught by the main deleteModel function
            throw new Error(`Failed to delete image ${fileName}.`);
        }
    }
};


export async function deleteModel(
    prevState: any,
    formData: FormData
): Promise<{ success: boolean; message: string }> {
    const jewelryTypeId = formData.get('jewelryTypeId') as string;
    const modelId = formData.get('modelId') as string;
    const displayImageUrl = formData.get('displayImageUrl') as string;
    const editorImageUrl = formData.get('editorImageUrl') as string;

    if (!jewelryTypeId || !modelId) {
        return { success: false, message: "Informations manquantes pour la suppression." };
    }
    
    console.log(`Attempting to delete model ${modelId} from ${jewelryTypeId}`);

    try {
        // Delete images from Storage first
        // We wrap them in Promise.all to run them in parallel, but with a catch on each
        // so that one failure doesn't prevent the other from attempting to run.
        await Promise.all([
          deleteImage(displayImageUrl).catch(e => console.error("Failed to delete display image:", e)),
          deleteImage(editorImageUrl).catch(e => console.error("Failed to delete editor image:", e))
        ]);

        // Delete the document from Firestore
        await deleteDoc(doc(db, jewelryTypeId, modelId));
        
        console.log(`Successfully deleted model ${modelId}`);
        revalidatePath('/admin/dashboard'); // Revalidate the admin page to show changes
        return { success: true, message: "Le modèle a été supprimé avec succès." };

    } catch (error: any) {
        console.error("Error in deleteModel action:", error);
        return { success: false, message: `Erreur lors de la suppression du modèle: ${error.message}` };
    }
}
