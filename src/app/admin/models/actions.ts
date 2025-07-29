
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
  displayImage: z.any().optional(),
  editorImage: z.any().optional(),
});

function getFileNameFromUrl(url: string): string | null {
    if (!url || !url.includes('firebasestorage.googleapis.com')) {
        return null;
    }
    try {
        const urlObject = new URL(url);
        // Firebase Storage URLs have the file path encoded in the pathname
        // e.g., /v0/b/your-bucket.appspot.com/o/folder%2Ffile.jpg?alt=media&token=...
        const decodedPath = decodeURIComponent(urlObject.pathname);
        const parts = decodedPath.split('/o/');
        if (parts.length > 1) {
            // Remove any leading slashes if they exist
            return parts[1].startsWith('/') ? parts[1].substring(1) : parts[1];
        }
    } catch (e) {
        console.error(`Could not parse URL object from: ${url}`, e);
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
            throw storageError; // Re-throw to be caught by the calling function
        }
         console.warn(`Image not found for deletion, skipping: ${imagePath}`);
    }
}

async function uploadImage(fileData: any, folder: string, oldImageUrl?: string): Promise<string | null> {
    let file: { dataUrl: string, name: string } | null = null;
    if (typeof fileData === 'string') {
        try {
            file = JSON.parse(fileData);
        } catch (e) {
            // It might be just the URL string
            if (fileData.startsWith('http')) return fileData;
            return oldImageUrl || null;
        }
    }

    if (!file || !file.dataUrl) {
         console.log(`uploadImage: No new file uploaded. Keeping old image URL: ${oldImageUrl}`);
        return oldImageUrl || null;
    }

    if (file.dataUrl === oldImageUrl) {
      console.log(`uploadImage: dataUrl is the same as oldImageUrl. No change.`);
      return oldImageUrl;
    }

    console.log(`uploadImage: New image uploaded. Old image URL was: ${oldImageUrl}`);
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

export async function saveModel(prevState: any, formData: FormData): Promise<{message: string | null; errors?: any}> {
  console.log("--- saveModel action started ---");
  
  const rawFormData = {
    id: formData.get('id'),
    name: formData.get('name'),
    price: formData.get('price'),
    jewelryType: formData.get('jewelryType'),
    displayImage: formData.get('displayImage'),
    editorImage: formData.get('editorImage'),
  };
  console.log("Raw form data:", rawFormData);

  const validatedFields = ModelSchema.safeParse(rawFormData);
  
  if (!validatedFields.success) {
    console.error("Validation errors:", validatedFields.error.flatten().fieldErrors);
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Erreur de validation.',
    };
  }
  console.log("Validation successful. Validated data:", validatedFields.data);
  
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
      displayImageUrl: newDisplayImageUrl,
      editorImageUrl: newEditorImageUrl,
    };

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
    return { message: 'Modèle enregistré avec succès.'};

  } catch (e: any) {
    console.error("--- Error in saveModel action ---", e);
    return { message: `Erreur du serveur: ${e.message}` };
  }
}

export async function deleteModel(
  jewelryTypeId: string, 
  modelId: string, 
  displayImageUrl: string, 
  editorImageUrl: string
): Promise<string> {
  try {
    if (!jewelryTypeId || !modelId) {
      throw new Error('jewelryTypeId et modelId sont requis');
    }

    await Promise.all([
      deleteImage(displayImageUrl),
      deleteImage(editorImageUrl),
    ]);

    const docRef = doc(db, jewelryTypeId, modelId);
    await deleteDoc(docRef);
    
    revalidatePath('/', 'layout');
    revalidatePath('/admin/dashboard');

    return JSON.stringify({ success: true, message: 'Modèle supprimé avec succès.' });
  } catch (error: any) {
    return JSON.stringify({ success: false, message: `Erreur lors de la suppression: ${error.message}` });
  }
}
