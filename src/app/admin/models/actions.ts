
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
    if (!imageUrl) {
        console.log("deleteImage: No image URL provided, skipping.");
        return;
    }

    const imagePath = getFileNameFromUrl(imageUrl);
    if (!imagePath) {
        console.warn(`Could not determine file path from URL, skipping deletion: ${imageUrl}`);
        return;
    }
    console.log(`deleteImage: Attempting to delete image at path: ${imagePath}`);

    try {
        const imageRef = ref(storage, imagePath);
        await deleteObject(imageRef);
        console.log(`deleteImage: Successfully deleted ${imagePath}`);
    } catch (storageError: any) {
        // It's not critical if the image doesn't exist, so we only log other errors.
        if (storageError.code !== 'storage/object-not-found') {
            console.error(`Failed to delete image ${imagePath}:`, storageError);
            throw storageError;
        }
         console.warn(`Image not found for deletion, skipping: ${imagePath}`);
    }
}


async function uploadImage(file: { dataUrl: string, name: string } | string | null, folder: string, oldImageUrl?: string): Promise<string | null> {
    // If file is a string, it's the existing URL. No change.
    if (typeof file === 'string') {
        console.log(`uploadImage: Existing URL provided, keeping: ${file}`);
        return file;
    }
    
    // If file is null or has no dataUrl, it means no new image was uploaded.
    if (!file || !file.dataUrl) {
         console.log(`uploadImage: No new file uploaded. Keeping old image URL: ${oldImageUrl}`);
        return oldImageUrl || null;
    }

    console.log(`uploadImage: New image uploaded. Old image URL was: ${oldImageUrl}`);
    // A new image was uploaded, so delete the old one if it exists.
    if (oldImageUrl) {
        await deleteImage(oldImageUrl);
    }

    const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
    console.log(`uploadImage: Uploading to path: ${storageRef.fullPath}`);
    await uploadString(storageRef, file.dataUrl, 'data_url');
    const url = await getDownloadURL(storageRef);
    console.log(`uploadImage: New image URL: ${url}`);
    return url;
}

export async function saveModel(prevState: any, formData: FormData): Promise<{message: string | null; errors: any}> {
  console.log("--- saveModel action started ---");
  
  const rawFormData = Object.fromEntries(formData.entries());
  console.log("Raw form data:", rawFormData);

  const validatedFields = ModelSchema.safeParse({
    id: formData.get('id') as string | undefined,
    name: formData.get('name') as string,
    price: formData.get('price') as string,
    jewelryType: formData.get('jewelryType') as 'necklace' | 'bracelet' | 'earring',
    displayImage: JSON.parse(formData.get('displayImage') as string),
    editorImage: JSON.parse(formData.get('editorImage') as string),
  });
  
  console.log("Validation successful:", validatedFields.success);
  if (!validatedFields.success) {
    console.error("Validation errors:", validatedFields.error.flatten().fieldErrors);
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Erreur de validation.',
    };
  }
  
  const { id, jewelryType, displayImage, editorImage, ...modelData } = validatedFields.data;
  console.log(`Operation type: ${id ? 'UPDATE' : 'CREATE'}. Model ID: ${id || 'N/A'}`);
  
  try {
    let oldData: any = null;
    if (id) {
        console.log(`Fetching existing document from ${jewelryType}/${id}`);
        const docRef = doc(db, jewelryType, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            oldData = docSnap.data();
            console.log("Found existing data:", oldData);
        } else {
            console.warn("Tried to update, but no document found at path.");
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

    console.log("Data to be saved in Firestore:", dataToSave);

    if (id) {
      // Update
      console.log(`Updating document in '${jewelryType}' collection with ID: ${id}`);
      const docRef = doc(db, jewelryType, id);
      await updateDoc(docRef, dataToSave);
      console.log("Document updated successfully.");
    } else {
      // Create
      console.log(`Creating new document in '${jewelryType}' collection.`);
      const newDocRef = await addDoc(collection(db, jewelryType), dataToSave);
      console.log(`Document created successfully with ID: ${newDocRef.id}`);
    }
    
    console.log("Revalidating paths...");
    revalidatePath('/', 'layout');
    revalidatePath('/admin/dashboard');
    console.log("--- saveModel action finished successfully ---");
    return { message: 'Modèle enregistré avec succès.', errors: {} };

  } catch (e: any) {
    console.error("--- Error in saveModel action ---", e);
    return { message: `Erreur du serveur: ${e.message}`, errors: {} };
  }
}

export async function deleteModel(jewelryTypeId: string, modelId: string, displayImageUrl: string, editorImageUrl: string) {
    try {
        console.log(`--- deleteModel action started for modelId: ${modelId} ---`);
        // First, delete the images from storage.
        if (displayImageUrl) await deleteImage(displayImageUrl);
        if (editorImageUrl) await deleteImage(editorImageUrl);

        // Then, delete the document from Firestore.
        console.log(`Deleting document from Firestore: ${jewelryTypeId}/${modelId}`);
        await deleteDoc(doc(db, jewelryTypeId, modelId));
        console.log("Document deleted from Firestore.");

        console.log("Revalidating paths...");
        revalidatePath('/', 'layout');
        revalidatePath('/admin/dashboard');
        console.log("--- deleteModel action finished successfully ---");
        return { success: true, message: 'Modèle supprimé avec succès.' };
    } catch (e: any) {
        console.error("--- Error in deleteModel action ---", e);
        return { success: false, message: `Erreur lors de la suppression: ${e.message}` };
    }
}
