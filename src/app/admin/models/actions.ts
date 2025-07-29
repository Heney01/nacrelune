
'use server';

import { z } from 'zod';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { revalidatePath } from 'next/cache';

// Schéma pour la validation des données du formulaire
const ModelSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Le nom est requis."),
  price: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive("Le prix doit être un nombre positif.")
  ),
  jewelryType: z.enum(['necklace', 'bracelet', 'earring']),
  displayImage: z.any(),
  editorImage: z.any(),
});

function getFileNameFromUrl(url: string): string | null {
    if (!url) return null;
    try {
        const urlObject = new URL(url);
        // Firebase Storage URLs have the file path encoded in the pathname
        // e.g., /v0/b/your-bucket.appspot.com/o/folder%2Ffile.jpg?alt=media&token=...
        const decodedPath = decodeURIComponent(urlObject.pathname);
        const parts = decodedPath.split('/o/');
        if (parts.length > 1) {
            return parts[1];
        }
    } catch (e) {
        // Not a full URL, might be just the path
        if (url.includes('/')) {
            return url;
        }
    }
    return null;
}


async function deleteImage(imageUrl: string) {
    if (!imageUrl) return;

    const imagePath = getFileNameFromUrl(imageUrl);
    if (!imagePath) {
        console.warn(`Could not determine file path from URL, skipping deletion: ${imageUrl}`);
        return;
    }

    try {
        const imageRef = ref(storage, imagePath);
        await deleteObject(imageRef);
    } catch (storageError: any) {
        // It's not critical if the image doesn't exist, so we only log other errors.
        if (storageError.code !== 'storage/object-not-found') {
            console.error(`Failed to delete image ${imagePath}:`, storageError);
            throw storageError;
        }
         console.warn(`Image not found for deletion, skipping: ${imagePath}`);
    }
}


async function uploadImage(file: { dataUrl: string, name: string } | string | null, folder: string, oldImageUrl?: string) {
    // If file is a string, it's the existing URL. No change.
    if (typeof file === 'string') return file;
    
    // If file is null or has no dataUrl, it means no new image was uploaded.
    if (!file || !file.dataUrl) return null;

    // A new image was uploaded, so delete the old one if it exists.
    if (oldImageUrl) {
        await deleteImage(oldImageUrl);
    }

    const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
    await uploadString(storageRef, file.dataUrl, 'data_url');
    // Return the full path for future reference (deletion)
    const url = await getDownloadURL(storageRef);
    return url;
}

export async function saveModel(prevState: any, formData: FormData): Promise<{message: string | null; errors: any}> {
  const validatedFields = ModelSchema.safeParse({
    id: formData.get('id') as string | undefined,
    name: formData.get('name') as string,
    price: formData.get('price') as string,
    jewelryType: formData.get('jewelryType') as 'necklace' | 'bracelet' | 'earring',
    displayImage: JSON.parse(formData.get('displayImage') as string),
    editorImage: JSON.parse(formData.get('editorImage') as string),
  });
  
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Erreur de validation.',
    };
  }
  
  const { id, jewelryType, displayImage, editorImage, ...modelData } = validatedFields.data;
  
  try {
    let oldData: any = null;
    if (id) {
        const docRef = doc(db, jewelryType, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            oldData = docSnap.data();
        }
    }

    const newDisplayImageUrl = await uploadImage(displayImage, `${jewelryType}/display`, oldData?.displayImageUrl);
    const newEditorImageUrl = await uploadImage(editorImage, `${jewelryType}/editor`, oldData?.editorImageUrl);

    const dataToSave: any = {
      ...modelData,
    };
    
    if (newDisplayImageUrl) {
        dataToSave.displayImageUrl = newDisplayImageUrl;
    }
    if (newEditorImageUrl) {
        dataToSave.editorImageUrl = newEditorImageUrl;
    }


    if (id) {
      // Update
      const docRef = doc(db, jewelryType, id);
      await updateDoc(docRef, dataToSave);
    } else {
      // Create
      await addDoc(collection(db, jewelryType), dataToSave);
    }

    revalidatePath('/admin/dashboard');
    return { message: 'Modèle enregistré avec succès.', errors: {} };

  } catch (e: any) {
    console.error("Error saving model:", e);
    return { message: `Erreur du serveur: ${e.message}`, errors: {} };
  }
}

export async function deleteModel(jewelryTypeId: string, modelId: string, displayImageUrl: string, editorImageUrl: string) {
    try {
        // First, delete the images from storage.
        await deleteImage(displayImageUrl);
        await deleteImage(editorImageUrl);

        // Then, delete the document from Firestore.
        await deleteDoc(doc(db, jewelryTypeId, modelId));

        revalidatePath('/admin/dashboard');
        return { success: true, message: 'Modèle supprimé avec succès.' };
    } catch (e: any) {
        console.error("Error deleting model:", e);
        return { success: false, message: `Erreur lors de la suppression: ${e.message}` };
    }
}
