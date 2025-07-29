
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, DocumentReference } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import type { JewelryModel, JewelryType, Charm, CharmCategory } from '@/lib/types';

const getUrl = async (path: string, fallback: string) => {
    if (path && (path.startsWith('http://') || path.startsWith('https://'))) {
        return path; // It's already a full URL
    }
    if (path && !path.startsWith('http')) {
        try {
            const storageRef = ref(storage, path);
            return await getDownloadURL(storageRef);
        } catch (error) {
            console.error(`Error getting download URL for path "${path}":`, error);
            return fallback;
        }
    }
    return fallback;
};


export async function getJewelryTypesAndModels(
    baseTypes: Omit<JewelryType, 'models' | 'icon'>[]
): Promise<Omit<JewelryType, 'icon'>[]> {
    const typesWithModels: Omit<JewelryType, 'icon'>[] = [];
    
    for (const typeInfo of baseTypes) {
        try {
            const querySnapshot = await getDocs(collection(db, typeInfo.id));
            const docs = querySnapshot.docs;

            // Get all image URLs in parallel
            const imageUrlPromises = docs.map(doc => {
                const data = doc.data();
                return Promise.all([
                    getUrl(data.displayImageUrl, 'https://placehold.co/800x800.png'),
                    getUrl(data.editorImageUrl, 'https://placehold.co/800x800.png')
                ]);
            });

            const imageUrls = await Promise.all(imageUrlPromises);

            const models = docs.map((doc, index) => {
                const data = doc.data();
                const [displayImageUrl, editorImageUrl] = imageUrls[index];
                
                return {
                    id: doc.id,
                    name: data.name,
                    displayImageUrl: displayImageUrl,
                    editorImageUrl: editorImageUrl,
                    snapPath: data.snapPath || '',
                    price: data.price || 0,
                } as JewelryModel;
            });
            
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
        const docs = charmsSnapshot.docs;

        // Get all image URLs in parallel
        const imageUrlPromises = docs.map(doc => getUrl(doc.data().imageUrl, 'https://placehold.co/100x100.png'));
        const imageUrls = await Promise.all(imageUrlPromises);

        const fetchedCharms = docs.map((doc, index) => {
            const data = doc.data();
            const categoryRef = data.category as DocumentReference;
            return {
                id: doc.id,
                name: data.name,
                imageUrl: imageUrls[index],
                description: data.description,
                categoryId: categoryRef.id,
                price: data.price || 0,
            } as Charm;
        });

        return fetchedCharms;
    } catch (error) {
        console.error("Error fetching charms data: ", error);
        return [];
    }
}


export async function getCharmCategories(): Promise<CharmCategory[]> {
    try {
        const categoriesSnapshot = await getDocs(collection(db, "charmCategories"));
        const docs = categoriesSnapshot.docs;

        // Get all image URLs in parallel
        const imageUrlPromises = docs.map(doc => {
            const imageUrl = doc.data().imageUrl;
            return imageUrl ? getUrl(imageUrl, 'https://placehold.co/100x100.png') : Promise.resolve(undefined);
        });
        const imageUrls = await Promise.all(imageUrlPromises);

        const fetchedCategories = docs.map((doc, index) => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                description: data.description,
                imageUrl: imageUrls[index],
            } as CharmCategory;
        });

        return fetchedCategories;
    } catch (error) {
        console.error("Error fetching charm categories: ", error);
        return [];
    }
}
