

import { db, storage } from '@/lib/firebase';
import { collection, getDocs, DocumentReference, getDoc, doc, Timestamp, query, orderBy, where, documentId, limit, startAfter, QueryConstraint } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import type { JewelryModel, JewelryType, Charm, CharmCategory, GeneralPreferences, Order, OrderItem, MailLog, MailDelivery, Creation, PlacedCreationCharm, User, PlacedCharm } from '@/lib/types';

const getUrl = async (path: string | undefined | null, fallback: string): Promise<string> => {
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

export const toDate = (timestamp: Timestamp | null | undefined): Date | null => {
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
                    width: data.width || null,
                    height: data.height || null,
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
                width: data.width || null,
                height: data.height || null,
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
                width: data.width || null,
                height: data.height || null,
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

export async function getMailLogs(): Promise<MailLog[]> {
    try {
        const mailSnapshot = await getDocs(query(collection(db, 'mail'), orderBy('delivery.startTime', 'desc')));
        if (mailSnapshot.empty) {
            return [];
        }

        const mailLogs: MailLog[] = mailSnapshot.docs.map(doc => {
            const data = doc.data();
            const delivery = data.delivery;
            return {
                id: doc.id,
                to: data.to,
                subject: data.message?.subject || 'Sans objet',
                delivery: delivery ? {
                    state: delivery.state || 'PENDING',
                    startTime: toDate(delivery.startTime),
                    endTime: toDate(delivery.endTime),
                    error: delivery.error || null,
                    attempts: delivery.attempts || 0,
                } : null,
            };
        });
        
        return mailLogs;
    } catch (e) {
        console.error('Error fetching mail logs: ', e);
        // This might fail if the index doesn't exist. Let's try fetching without ordering.
        try {
             const mailSnapshot = await getDocs(collection(db, 'mail'));
             const mailLogs: MailLog[] = mailSnapshot.docs.map(doc => {
                const data = doc.data();
                const delivery = data.delivery;
                return {
                    id: doc.id,
                    to: data.to,
                    subject: data.message?.subject || 'Sans objet',
                    delivery: delivery ? {
                        state: delivery.state || 'PENDING',
                        startTime: toDate(delivery.startTime),
                        endTime: toDate(delivery.endTime),
                        error: delivery.error || null,
                        attempts: delivery.attempts || 0,
                    } : null,
                };
            });
            // Manual sort as a fallback
            return mailLogs.sort((a, b) => {
                const timeA = a.delivery?.startTime?.getTime() || 0;
                const timeB = b.delivery?.startTime?.getTime() || 0;
                return timeB - timeA;
            });
        } catch (finalError) {
             console.error('Failed to fetch mail logs even without sorting: ', finalError);
             return [];
        }
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
            
            const enrichedItems: OrderItem[] = await Promise.all((data.items || []).map(async (item: OrderItem) => {
                const enrichedCharms = (item.charmIds || [])
                    .map(id => charmsMap.get(id))
                    .filter((c): c is Charm => !!c);

                return {
                    ...item,
                    charms: enrichedCharms,
                    previewImageUrl: await getUrl(item.previewImageUrl, 'https://placehold.co/400x400.png'),
                };
            }));
            
            const orderNumber = data.orderNumber;
            const mailHistory = mailLogsByOrderNumber.get(orderNumber) || [];

            return {
                id: orderDoc.id,
                orderNumber,
                createdAt: (data.createdAt as Timestamp).toDate(),
                customerEmail: data.customerEmail,
                subtotal: data.subtotal ?? data.totalPrice, // Fallback for old orders
                totalPrice: data.totalPrice,
                status: data.status,
                items: enrichedItems,
                deliveryMethod: data.deliveryMethod || 'home',
                shippingAddress: data.shippingAddress,
                shippingCarrier: data.shippingCarrier,
                trackingNumber: data.trackingNumber,
                cancellationReason: data.cancellationReason,
                mailHistory: mailHistory,
                paymentIntentId: data.paymentIntentId,
                couponCode: data.couponCode,
                pointsUsed: data.pointsUsed,
                pointsValue: data.pointsValue
            };
        }));

        return orders;
    } catch (error) {
        console.error("Error fetching orders:", error);
        return [];
    }
}


async function hydrateCreations(creationDocs: any[], allCharms: Charm[]): Promise<Creation[]> {
    const charmsMap = new Map(allCharms.map(c => [c.id, c]));
    
    const userIds = Array.from(new Set(creationDocs.map(d => d.data().creatorId))) as string[];
    let creatorsMap = new Map<string, User>();
    if (userIds.length > 0) {
        // Firestore 'in' query is limited to 30 items. If you expect more, you'll need to chunk the requests.
        const userDocsSnapshot = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', userIds.slice(0, 30))));
        userDocsSnapshot.docs.forEach(doc => {
            creatorsMap.set(doc.id, { uid: doc.id, ...doc.data() } as User);
        });
    }

    const creations = await Promise.all(creationDocs.map(async (doc) => {
        const data = doc.data();
        const previewImageUrl = await getUrl(data.previewImageUrl, 'https://placehold.co/400x400.png');
        
        const hydratedCharms: PlacedCharm[] = (data.placedCharms || []).map((pc: PlacedCreationCharm, index: number) => {
            const charmData = charmsMap.get(pc.charmId);
            if (!charmData) return null;
            
            return {
                id: `${pc.charmId}-${index}`,
                charm: charmData,
                position: pc.position,
                rotation: pc.rotation,
            };
        }).filter((c: PlacedCharm | null): c is PlacedCharm => c !== null);

        return {
            id: doc.id,
            ...data,
            creator: creatorsMap.get(data.creatorId),
            previewImageUrl,
            hydratedCharms,
            placedCharms: data.placedCharms,
            createdAt: toDate(data.createdAt as any)!,
        } as Creation;
    }));
    
    return creations;
}

export async function getRecentCreations(): Promise<Creation[]> {
    try {
        const [creationsSnapshot, allCharms] = await Promise.all([
            getDocs(query(collection(db, 'creations'), orderBy('createdAt', 'desc'), limit(10))),
            getCharms()
        ]);
        
        if (creationsSnapshot.empty) {
            return [];
        }
        
        return await hydrateCreations(creationsSnapshot.docs, allCharms);
    } catch (error) {
        console.error("Error fetching recent creations:", error);
        return [];
    }
}

const CREATIONS_PER_PAGE = 20;

export interface PaginatedCreationsOptions {
  sortBy: 'date' | 'likes';
  timeFilter: 'all' | 'year' | 'month' | 'week';
  cursor?: any;
  cursorId?: string;
}

export async function getPaginatedCreations(options: PaginatedCreationsOptions): Promise<{ creations: Creation[], hasMore: boolean }> {
  const { sortBy, timeFilter, cursor, cursorId } = options;
  const constraints: QueryConstraint[] = [];

  // Time filter
  if (timeFilter !== 'all') {
    const now = new Date();
    let startDate;
    switch (timeFilter) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }
    constraints.push(where('createdAt', '>=', startDate));
  }

  // Sorting
  // For 'likes' sort, we also add a secondary sort by date to ensure consistent ordering for items with the same like count
  if (sortBy === 'likes') {
    constraints.push(orderBy('likesCount', 'desc'));
  }
  constraints.push(orderBy('createdAt', 'desc'));

  // Pagination cursor
  if (cursor !== undefined && cursor !== null && cursorId) {
    const cursorDoc = await getDoc(doc(db, 'creations', cursorId));
    if (cursorDoc.exists()) {
        constraints.push(startAfter(cursorDoc));
    }
  }

  constraints.push(limit(CREATIONS_PER_PAGE + 1)); // Fetch one extra to check if there's a next page
  
  try {
    const q = query(collection(db, 'creations'), ...constraints);
    const [creationsSnapshot, allCharms] = await Promise.all([
      getDocs(q),
      getCharms()
    ]);

    const hasMore = creationsSnapshot.docs.length > CREATIONS_PER_PAGE;
    const docsToProcess = hasMore ? creationsSnapshot.docs.slice(0, -1) : creationsSnapshot.docs;

    if (docsToProcess.length === 0) {
      return { creations: [], hasMore: false };
    }
    
    const hydratedCreations = await hydrateCreations(docsToProcess, allCharms);
    return { creations: hydratedCreations, hasMore };

  } catch (error) {
    console.error("Error fetching paginated creations:", error);
    // This can happen if a composite index is required.
    // Firestore error messages are usually helpful here.
    return { creations: [], hasMore: false };
  }
}


export async function getAllCreations(): Promise<Creation[]> {
    try {
        const [creationsSnapshot, allCharms] = await Promise.all([
            getDocs(query(collection(db, 'creations'), orderBy('createdAt', 'desc'))),
            getCharms()
        ]);
        
        if (creationsSnapshot.empty) {
            return [];
        }
        
        return await hydrateCreations(creationsSnapshot.docs, allCharms);
    } catch (error) {
        console.error("Error fetching all creations:", error);
        return [];
    }
}


export async function getCreatorShowcaseData(creatorId: string): Promise<{ creator: User | null, creations: Creation[] }> {
    try {
        const [userDoc, creationsSnapshot, allCharms] = await Promise.all([
            getDoc(doc(db, 'users', creatorId)),
            getDocs(query(collection(db, 'creations'), where('creatorId', '==', creatorId), orderBy('createdAt', 'desc'))),
            getCharms()
        ]);

        let creator: User | null = null;
        if (userDoc.exists()) {
            const data = userDoc.data();
            creator = {
                uid: userDoc.id,
                displayName: data.displayName,
                email: data.email,
                photoURL: data.photoURL,
            };
        }

        const hydratedCreations = await hydrateCreations(creationsSnapshot.docs, allCharms);

        // Manually assign the fetched creator to each creation to ensure consistency
        const finalCreations = hydratedCreations.map(c => ({ ...c, creator }));

        return { creator, creations: finalCreations };
    } catch (error) {
        console.error(`Error fetching showcase data for creator ${creatorId}:`, error);
        return { creator: null, creations: [] };
    }
}
