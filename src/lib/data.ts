
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, DocumentReference } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import type { JewelryModel, JewelryType, Charm, CharmCategory } from '@/lib/types';

const getUrl = async (path: string, fallback: string) => {
    if (path && !path.startsWith('http')) {
        try {
            const storageRef = ref(storage, path);
            return await getDownloadURL(storageRef);
        } catch (error) {
            console.error("Error getting download URL: ", error);
            return fallback;
        }
    }
    return path || fallback;
};

export async function getJewelryTypesAndModels(
    baseTypes: Omit<JewelryType, 'models' | 'icon'>[]
): Promise<Omit<JewelryType, 'icon'>[]> {
    const typesWithModels: Omit<JewelryType, 'icon'>[] = [];
    
    for (const typeInfo of baseTypes) {
        try {
            const querySnapshot = await getDocs(collection(db, typeInfo.id));
            const models = await Promise.all(
                querySnapshot.docs.map(async (doc) => {
                    const data = doc.data();
                    const displayImageUrl = await getUrl(data.displayImageUrl, 'https://placehold.co/800x800.png');
                    const editorImageUrl = await getUrl(data.editorImageUrl, 'https://placehold.co/800x800.png');
                    
                    return {
                        id: doc.id,
                        name: data.name,
                        displayImageUrl: displayImageUrl,
                        editorImageUrl: editorImageUrl,
                        snapPath: data.snapPath || '',
                        price: data.price || 0,
                    } as JewelryModel;
                })
            );
            typesWithModels.push({ ...typeInfo, models });
        } catch (error) {
            console.error(`Error fetching models for ${typeInfo.id}: `, error);
            typesWithModels.push({ ...typeInfo, models: [] }); // Add type with empty models on error
        }
    }
    return typesWithModels;
}

export async function getCharms(): Promise<Charm[]> {
     try {
        const charmsSnapshot = await getDocs(collection(db, "charms"));
        const fetchedCharms = await Promise.all(charmsSnapshot.docs.map(async (doc) => {
            const data = doc.data();
            const imageUrl = await getUrl(data.imageUrl, 'https://placehold.co/100x100.png');
            const categoryRef = data.category as DocumentReference;
            return {
                id: doc.id,
                name: data.name,
                imageUrl: imageUrl,
                description: data.description,
                categoryId: categoryRef.id,
                price: data.price || 0,
            } as Charm;
        }));
        return fetchedCharms;
    } catch (error) {
        console.error("Error fetching charms data: ", error);
        return [];
    }
}


export async function getCharmCategories(): Promise<CharmCategory[]> {
    try {
        const categoriesSnapshot = await getDocs(collection(db, "charmCategories"));
        const fetchedCategories = await Promise.all(categoriesSnapshot.docs.map(async (doc) => {
            const data = doc.data();
            const imageUrl = data.imageUrl ? await getUrl(data.imageUrl, 'https://placehold.co/100x100.png') : undefined;
            return {
                id: doc.id,
                name: data.name,
                description: data.description,
                imageUrl: imageUrl,
            } as CharmCategory;
        }));
        return fetchedCategories;
    } catch (error) {
        console.error("Error fetching charm categories: ", error);
        return [];
    }
}
