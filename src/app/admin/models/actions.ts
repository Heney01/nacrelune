
'use server';

import { z } from 'zod';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
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

function getFileName(filePath: string) {
    try {
        const url = new URL(filePath);
        // Firebase Storage URLs have the file path encoded in the pathname
        const decodedPath = decodeURIComponent(url.pathname);
        // The actual file path is after '/o/'
        const parts = decodedPath.split('/o/');
        if (parts.length > 1) {
            // Remove query parameters if any
            return parts[1].split('?')[0];
        }
    } catch (e) {
        // Not a URL, might be a direct path
    }
    return filePath;
}


async function uploadImage(file: { dataUrl: string, name: string }, folder: string) {
    if (typeof file === 'string') return file;
    if (!file || !file.dataUrl) return null;

    const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
    await uploadString(storageRef, file.dataUrl, 'data_url');
    const downloadUrl = await getDownloadURL(storageRef);
    
    // Return the storage path, not the full URL
    return storageRef.fullPath;
}

export async function saveModel(prevState: any, formData: FormData) {
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
    const displayImagePath = await uploadImage(displayImage, `${jewelryType}/display`);
    const editorImagePath = await uploadImage(editorImage, `${jewelryType}/editor`);

    const dataToSave: any = {
      ...modelData,
    };

    if (displayImagePath) dataToSave.displayImageUrl = displayImagePath;
    if (editorImagePath) dataToSave.editorImageUrl = editorImagePath;

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
    console.error(e);
    return { message: `Erreur du serveur: ${e.message}`, errors: {} };
  }
}

export async function deleteModel(jewelryTypeId: string, modelId: string, displayImageUrl: string, editorImageUrl: string) {
    try {
        await deleteDoc(doc(db, jewelryTypeId, modelId));

        // Delete images from storage
        if (displayImageUrl) {
             try {
                const displayImageRef = ref(storage, getFileName(displayImageUrl));
                await deleteObject(displayImageRef);
            } catch (storageError: any) {
                if (storageError.code !== 'storage/object-not-found') throw storageError;
                console.warn(`Display image not found for deletion: ${displayImageUrl}`);
            }
        }
        if (editorImageUrl) {
            try {
                const editorImageRef = ref(storage, getFileName(editorImageUrl));
                await deleteObject(editorImageRef);
            } catch (storageError: any) {
                if (storageError.code !== 'storage/object-not-found') throw storageError;
                 console.warn(`Editor image not found for deletion: ${editorImageUrl}`);
            }
        }

        revalidatePath('/admin/dashboard');
        return { success: true, message: 'Modèle supprimé avec succès.' };
    } catch (e: any) {
        return { success: false, message: `Erreur: ${e.message}` };
    }
}
