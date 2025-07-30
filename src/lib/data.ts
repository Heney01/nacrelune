

import { db, storage } from '@/lib/firebase';
import { collection, getDocs, DocumentReference, getDoc, doc, Timestamp, query, orderBy, where, documentId } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import type { JewelryModel, JewelryType, Charm, CharmCategory, GeneralPreferences, Order, OrderItem, MailLog, MailDelivery } from '@/lib/types';

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

const toDate = (timestamp: Timestamp | null | undefined): Date | null => {
    return timestamp ? timestamp.toDate() : null;
}


export async function getJewelryTypesAndModels(
    baseTypes: Omit<JewelryType, 'models' | 'icon'>[]
): Promise<Omit<JewelryType, 'icon'>[]> {
    const typesWithModels: Omit<JewelryType, 'icon'>[] = [];
    
    for (const typeInfo of baseTypes) {
        try {
            const querySnapshot = await getDocs(collection(db, typeInfo.id));
            const docs = querySnapshot.docs;

            const models = await Promise.all(docs.map(async (doc) => {
                const data = doc.data();
                
                const [displayImageUrl, editorImageUrl] = await Promise.all([
                    getUrl(data.displayImageUrl, 'https://placehold.co/800x800.png'),
                    getUrl(data.editorImageUrl, 'https://placehold.co/800x800.png')
                ]);
                
                return {
                    id: doc.id,
                    name: data.name,
                    displayImageUrl: displayImageUrl,
                    editorImageUrl: editorImageUrl,
                    snapPath: data.snapPath || '',
                    price: data.price || 0,
                    quantity: data.quantity || 0,
                    reorderUrl: data.reorderUrl || '',
                    lastOrderedAt: toDate(data.lastOrderedAt),
                    restockedAt: toDate(data.restockedAt),
                } as JewelryModel;
            }));
            
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
            const categoryRefs = data.categoryIds as string[] || [];
            return {
                id: doc.id,
                name: data.name,
                imageUrl: imageUrls[index],
                description: data.description,
                categoryIds: categoryRefs,
                price: data.price || 0,
                quantity: data.quantity || 0,
                reorderUrl: data.reorderUrl || '',
                lastOrderedAt: toDate(data.lastOrderedAt),
                restockedAt: toDate(data.restockedAt),
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

        const fetchedCategories = await Promise.all(docs.map(async (doc) => {
            const data = doc.data();
            const imageUrl = await getUrl(data.imageUrl, 'https://placehold.co/100x100.png');
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


export async function getFullCharmData(): Promise<{ charms: (Charm & { categoryName?: string })[], charmCategories: CharmCategory[] }> {
    try {
        const [charmsDocs, categoriesDocs] = await Promise.all([
            getDocs(collection(db, "charms")),
            getDocs(collection(db, "charmCategories"))
        ]);

        const charmCategories: CharmCategory[] = await Promise.all(categoriesDocs.docs.map(async (doc) => {
             const data = doc.data();
             const imageUrl = await getUrl(data.imageUrl, 'https://placehold.co/100x100.png');
             return {
                id: doc.id,
                name: data.name,
                description: data.description,
                imageUrl: imageUrl,
            };
        }));
        
        const categoriesMap = new Map(charmCategories.map(cat => [cat.id, cat.name]));

        const charms: (Charm & { categoryName?: string })[] = await Promise.all(charmsDocs.docs.map(async (doc) => {
            const data = doc.data();
            const categoryIds = (data.categoryIds || []) as string[];
            const imageUrl = await getUrl(data.imageUrl, 'https://placehold.co/100x100.png');
            
            return {
                id: doc.id,
                name: data.name,
                imageUrl: imageUrl,
                description: data.description,
                categoryIds: categoryIds,
                price: data.price || 0,
                quantity: data.quantity || 0,
                reorderUrl: data.reorderUrl || '',
                lastOrderedAt: toDate(data.lastOrderedAt),
                restockedAt: toDate(data.restockedAt),
                // The concept of a single categoryName is no longer accurate.
                // We'll keep the property for compatibility but it may need to be handled differently in the UI.
                categoryName: categoryIds.length > 0 ? categoriesMap.get(categoryIds[0]) || 'Uncategorized' : 'Uncategorized',
            };
        }));
        
        return { charms, charmCategories };

    } catch (error) {
        console.error("Error fetching full charm data: ", error);
        return { charms: [], charmCategories: [] };
    }
}


export async function getPreferences(): Promise<GeneralPreferences> {
    try {
        const docRef = doc(db, 'preferences', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as GeneralPreferences;
        } else {
            // Return default values if not set
            return { alertThreshold: 10, criticalThreshold: 5 };
        }
    } catch (error) {
        console.error("Error fetching preferences:", error);
        // In case of error, return default values to avoid breaking the app
        return { alertThreshold: 10, criticalThreshold: 5 };
    }
}


export async function getOrders(): Promise<Order[]> {
    try {
        const [ordersSnapshot, mailSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'))),
            getDocs(collection(db, 'mail'))
        ]);

        if (ordersSnapshot.empty) {
            return [];
        }

        const mailLogsByOrderNumber = new Map<string, MailLog[]>();
        mailSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const subject = data.message?.subject || '';
            const orderNumberMatch = subject.match(/n°\s*([A-Z0-9-]+)/);
            if (orderNumberMatch && orderNumberMatch[1]) {
                const orderNumber = orderNumberMatch[1];
                const delivery = data.delivery;
                const log: MailLog = {
                    id: doc.id,
                    to: data.to,
                    subject: subject,
                    delivery: delivery ? {
                        state: delivery.state,
                        startTime: toDate(delivery.startTime),
                        endTime: toDate(delivery.endTime),
                        error: delivery.error,
                        attempts: delivery.attempts
                    } : null
                };
                if (!mailLogsByOrderNumber.has(orderNumber)) {
                    mailLogsByOrderNumber.set(orderNumber, []);
                }
                mailLogsByOrderNumber.get(orderNumber)!.push(log);
            }
        });

        // Get all unique charm IDs from all orders first
        const allCharmIds = ordersSnapshot.docs.flatMap(doc => doc.data().items?.flatMap((item: OrderItem) => item.charmIds) || []);
        const uniqueCharmIds = Array.from(new Set(allCharmIds)).filter(id => id);

        // Fetch all required charms in a single query
        let charmsMap = new Map<string, Charm>();
        if (uniqueCharmIds.length > 0) {
            const charmsQuery = query(collection(db, 'charms'), where(documentId(), 'in', uniqueCharmIds));
            const charmsSnapshot = await getDocs(charmsQuery);
            for (const charmDoc of charmsSnapshot.docs) {
                const charmData = charmDoc.data() as Omit<Charm, 'id'>;
                const imageUrl = await getUrl(charmData.imageUrl, 'https://placehold.co/100x100.png');
                charmsMap.set(charmDoc.id, { ...charmData, id: charmDoc.id, imageUrl });
            }
        }
        
        const orders: Order[] = await Promise.all(ordersSnapshot.docs.map(async(orderDoc) => {
            const data = orderDoc.data();
            
            const enrichedItems: OrderItem[] = (data.items || []).map((item: OrderItem) => {
                const enrichedCharms = (item.charmIds || [])
                    .map(id => charmsMap.get(id))
                    .filter((c): c is Charm => !!c); // Filter out undefined charms

                return {
                    ...item,
                    charms: enrichedCharms,
                };
            });
            
            const previewImageUrls = await Promise.all(
                (data.items || []).map((item: OrderItem) => getUrl(item.previewImageUrl, 'https://placehold.co/400x400.png'))
            );

            enrichedItems.forEach((item, index) => {
                item.previewImageUrl = previewImageUrls[index];
            });
            
            const orderNumber = data.orderNumber;
            const mailHistory = mailLogsByOrderNumber.get(orderNumber) || [];

            return {
                id: orderDoc.id,
                orderNumber,
                createdAt: (data.createdAt as Timestamp).toDate(),
                customerEmail: data.customerEmail,
                totalPrice: data.totalPrice,
                status: data.status,
                items: enrichedItems,
                shippingCarrier: data.shippingCarrier,
                trackingNumber: data.trackingNumber,
                cancellationReason: data.cancellationReason,
                mailHistory: mailHistory,
            };
        }));

        return orders;
    } catch (error) {
        console.error("Error fetching orders:", error);
        return [];
    }
}
