

'use server';

import { revalidatePath } from 'next/cache';
import { db, storage } from '@/lib/firebase';
import { doc, addDoc, updateDoc, collection, getDoc, getDocs, runTransaction, query, where, setDoc, serverTimestamp, collectionGroup, documentId, orderBy, DocumentReference, DocumentSnapshot, Timestamp, increment } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import type { JewelryModel, PlacedCharm, OrderStatus, Order, OrderItem, ShippingAddress, DeliveryMethod, MailLog, Coupon, User } from '@/lib/types';
import { toDate } from '@/lib/data';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { verifyAdmin } from '@/app/actions/auth.actions';
import { cookies } from 'next/headers';


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);


// --- Helper Functions ---

const getUrl = async (path: string | undefined | null, fallback: string): Promise<string> => {
    if (!path) return fallback;
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    try {
        const storageRef = ref(storage, path);
        return await getDownloadURL(storageRef);
    } catch (error) {
        console.error(`Error getting download URL for path "${path}":`, error);
        return fallback;
    }
};


// --- Order Actions ---

export async function createPaymentIntent(
  amount: number,
  email: string
): Promise<{ clientSecret: string | null; error?: string }> {
  if (amount <= 0) {
    return { error: 'Invalid amount.', clientSecret: null };
  }
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Amount in cents
      currency: 'eur',
      receipt_email: email,
    });
    return { clientSecret: paymentIntent.client_secret };
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return { error: error.message, clientSecret: null };
  }
}

async function refundStripePayment(paymentIntentId: string): Promise<{ success: boolean; message: string }> {
    try {
        // Handle both client_secret and payment_intent_id for backward compatibility
        const idToRefund = paymentIntentId.includes('_secret_')
            ? paymentIntentId.split('_secret_')[0]
            : paymentIntentId;

        const refund = await stripe.refunds.create({
            payment_intent: idToRefund,
        });
        if (refund.status === 'succeeded' || refund.status === 'pending') {
            return { success: true, message: `Remboursement initié avec succès (Status: ${refund.status}).` };
        } else {
             return { success: false, message: `Le remboursement a échoué avec le statut : ${refund.status}.` };
        }
    } catch (error: any) {
        console.error("Error creating Stripe refund:", error);
         if (error.code === 'charge_already_refunded') {
            return { success: true, message: 'La commande a déjà été remboursée sur Stripe.' };
        }
        return { success: false, message: error.message || "Une erreur est survenue lors du remboursement Stripe." };
    }
}

function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ATB-${year}${month}${day}-${randomPart}`;
}

export type SerializableCartItem = {
    id: string;
    model: JewelryModel;
    jewelryType: {
        id: 'necklace' | 'bracelet' | 'earring';
        name: string;
        description: string;
    };
    placedCharms: PlacedCharm[];
    previewImage: string;
    creator?: User;
    creationId?: string;
};

export type StockError = {
    unavailableModelIds: string[];
    unavailableCharmIds: string[];
}

export type CreateOrderResult = {
    success: boolean;
    message: string;
    orderNumber?: string;
    email?: string;
    stockError?: StockError;
    totalPrice?: number;
    orderId?: string;
};

export async function createOrder(
    cartItems: SerializableCartItem[], 
    email: string, 
    paymentIntentId: string,
    deliveryMethod: DeliveryMethod,
    shippingAddress?: ShippingAddress,
    coupon?: Coupon,
    userId?: string,
    pointsToUse?: number,
): Promise<CreateOrderResult> {
    if (!cartItems || cartItems.length === 0) {
        return { success: false, message: 'Le panier est vide.' };
    }

    const CLASP_PRICE = 1.20;

    try {
        // First, upload all images to storage outside of the transaction
        const uploadPromises = cartItems.map(async (item) => {
            const storageRef = ref(storage, `order_previews/${item.id}-${Date.now()}.png`);
            const uploadResult = await uploadString(storageRef, item.previewImage, 'data_url');
            return getDownloadURL(uploadResult.ref);
        });
        const previewImageUrls = await Promise.all(uploadPromises);


         const orderData = await runTransaction(db, async (transaction) => {
            // --- READ PHASE ---
            const stockUpdates: Map<DocumentReference, { newQuantity: number; name: string }> = new Map();
            const itemDocsToFetch: Map<string, DocumentReference> = new Map();
            
            const stockDeductions = new Map<string, { count: number, name: string, type: string, id: string }>();
            const creatorPointAwards: Map<string, { points: number; creatorName: string; creationName: string }> = new Map();

            for (const item of cartItems) {
                const modelKey = `${item.jewelryType.id}/${item.model.id}`;
                const currentModel = stockDeductions.get(modelKey) || { count: 0, name: item.model.name, type: item.jewelryType.id, id: item.model.id };
                stockDeductions.set(modelKey, { ...currentModel, count: currentModel.count + 1 });
                if (!itemDocsToFetch.has(modelKey)) {
                    itemDocsToFetch.set(modelKey, doc(db, item.jewelryType.id, item.model.id));
                }

                for (const pc of item.placedCharms) {
                    const charmKey = `charms/${pc.charm.id}`;
                    const currentCharm = stockDeductions.get(charmKey) || { count: 0, name: pc.charm.name, type: 'charms', id: pc.charm.id };
                    stockDeductions.set(charmKey, { ...currentCharm, count: currentCharm.count + 1 });
                    if (!itemDocsToFetch.has(charmKey)) {
                        itemDocsToFetch.set(charmKey, doc(db, 'charms', pc.charm.id));
                    }
                }
                
                if (item.creator && item.creator.uid && item.creator.displayName) {
                    const basePrice = 9.90;
                    const charmCount = item.placedCharms.length;
                    let charmsPrice = 0;
                    if (charmCount > 0) {
                        if (charmCount <= 5) {
                            charmsPrice = charmCount * 4.00;
                        } else {
                            charmsPrice = (5 * 4.00) + ((charmCount - 5) * 2.50);
                        }
                    }
                    const claspsPrice = item.placedCharms.reduce((sum, pc) => sum + (pc.withClasp ? CLASP_PRICE : 0), 0);
                    const itemPrice = basePrice + charmsPrice + claspsPrice;
                    
                    const points = Math.floor((itemPrice * 0.05) * 10);
                    if (points > 0) {
                        const currentAwards = creatorPointAwards.get(item.creator.uid) || { points: 0, creatorName: item.creator.displayName, creationName: item.model.name };
                        creatorPointAwards.set(item.creator.uid, { ...currentAwards, points: currentAwards.points + points });
                    }
                }
            }

            const itemDocRefs = Array.from(itemDocsToFetch.values());
            const itemDocsSnapshots: DocumentSnapshot[] = [];
             for (const ref of itemDocRefs) {
                itemDocsSnapshots.push(await transaction.get(ref));
            }
            const itemDocsMap = new Map(itemDocsSnapshots.map(d => [d.ref.path, d]));

            const allCreatorIds = Array.from(creatorPointAwards.keys());
            const creatorDocs = allCreatorIds.length > 0
                ? await Promise.all(allCreatorIds.map(id => transaction.get(doc(db, 'users', id))))
                : [];
            const creatorsMap = new Map(creatorDocs.map(d => [d.id, d.data() as User]));
            
            let userDoc: DocumentSnapshot | null = null;
            if(userId && pointsToUse && pointsToUse > 0) {
                userDoc = await transaction.get(doc(db, 'users', userId));
            }

            // --- VALIDATION (NO WRITES) ---
            const unavailableItems = {
                unavailableModelIds: new Set<string>(),
                unavailableCharmIds: new Set<string>(),
            };

            for (const [key, deduction] of Array.from(stockDeductions.entries())) {
                const itemDoc = itemDocsMap.get(itemDocsToFetch.get(key)!.path);
                if (!itemDoc || !itemDoc.exists()) {
                     if(deduction.type === 'charms') unavailableItems.unavailableCharmIds.add(deduction.id);
                     else unavailableItems.unavailableModelIds.add(deduction.id);
                } else {
                    const currentStock = itemDoc.data().quantity || 0;
                    if (currentStock < deduction.count) {
                        if(deduction.type === 'charms') unavailableItems.unavailableCharmIds.add(deduction.id);
                        else unavailableItems.unavailableModelIds.add(deduction.id);
                    } else {
                        stockUpdates.set(itemDoc.ref, { newQuantity: currentStock - deduction.count, name: deduction.name });
                    }
                }
            }

            if (unavailableItems.unavailableModelIds.size > 0 || unavailableItems.unavailableCharmIds.size > 0) {
                 return { success: false, message: "Certains articles de votre panier ne sont plus en stock.", stockError: { unavailableModelIds: Array.from(unavailableItems.unavailableModelIds), unavailableCharmIds: Array.from(unavailableItems.unavailableCharmIds) }};
            }
            
            if (userDoc && (!userDoc.exists() || (userDoc.data().rewardPoints || 0) < pointsToUse!)) {
                throw new Error("Points de récompense insuffisants.");
            }

            // --- WRITE PHASE ---
            for (const [ref, update] of Array.from(stockUpdates.entries())) {
                transaction.update(ref, { quantity: update.newQuantity });
            }

            const subtotal = cartItems.reduce((sum, item) => {
                const basePrice = 9.90;
                const charmCount = item.placedCharms.length;
                let charmsPrice = 0;
                if (charmCount > 0) {
                    if (charmCount <= 5) {
                        charmsPrice = charmCount * 4.00;
                    } else {
                        charmsPrice = (5 * 4.00) + ((charmCount - 5) * 2.50);
                    }
                }
                const claspsPrice = item.placedCharms.reduce((claspSum, pc) => claspSum + (pc.withClasp ? CLASP_PRICE : 0), 0);
                return sum + basePrice + charmsPrice + claspsPrice;
            }, 0);
            
            const couponDiscount = coupon ? coupon.discountType === 'percentage' ? subtotal * (coupon.value / 100) : coupon.value : 0;
            let totalAfterCoupon = Math.max(0, subtotal - couponDiscount);
            const pointsValue = pointsToUse ? pointsToUse / 10 : 0;
            const finalPrice = Math.max(0, totalAfterCoupon - pointsValue);

            if (userDoc && pointsToUse) {
                transaction.update(userDoc.ref, { rewardPoints: increment(-(pointsToUse)) });
            }

            creatorPointAwards.forEach((award, creatorId) => {
                const creatorData = creatorsMap.get(creatorId);
                if (creatorData && creatorData.email) {
                    const mailText = `Bonjour ${award.creatorName},\n\nFélicitations ! Votre création "${award.creationName}" a été achetée.\n\nVous venez de gagner ${award.points} points de récompense.\n\nContinuez à créer !`;
                    const mailHtml = `<h1>Félicitations !</h1><p>Bonjour ${award.creatorName},</p><p>Excellente nouvelle ! Votre création, <strong>"${award.creationName}"</strong>, a été achetée par un autre utilisateur.</p><p>Pour vous récompenser, nous venons de créditer votre compte de <strong>${award.points} points</strong>.</p><p>Merci pour votre contribution à la communauté !</p>`;
                    transaction.set(doc(collection(db, 'mail')), { to: [creatorData.email], message: { subject: `Votre création a été vendue ! Vous avez gagné des points.`, text: mailText, html: mailHtml } });
                }
            });

            const orderItems: Omit<OrderItem, 'modelImageUrl' | 'charms'>[] = cartItems.map((item, index) => {
                const basePrice = 9.90;
                const charmCount = item.placedCharms.length;
                let charmsPrice = 0;
                if (charmCount > 0) {
                    if (charmCount <= 5) {
                        charmsPrice = charmCount * 4.00;
                    } else {
                        charmsPrice = (5 * 4.00) + ((charmCount - 5) * 2.50);
                    }
                }
                const claspsPrice = item.placedCharms.reduce((claspSum, pc) => claspSum + (pc.withClasp ? CLASP_PRICE : 0), 0);
                const itemPrice = basePrice + charmsPrice + claspsPrice;

                if (item.creationId) {
                    transaction.update(doc(db, 'creations', item.creationId), { salesCount: increment(1) });
                }
                
                const orderItemData: any = {
                    modelId: item.model.id,
                    modelName: item.model.name,
                    jewelryTypeId: item.jewelryType.id,
                    jewelryTypeName: item.jewelryType.name,
                    charms: item.placedCharms.map(pc => ({ charmId: pc.charm.id, withClasp: !!pc.withClasp })),
                    price: itemPrice,
                    previewImageUrl: previewImageUrls[index],
                    isCompleted: false,
                };
                
                if (item.creationId) {
                    orderItemData.creationId = item.creationId;
                }
                if (item.creator?.uid) {
                    orderItemData.creatorId = item.creator.uid;
                }
                
                return orderItemData;
            });
            
            const orderNumber = generateOrderNumber();
            
            const newOrderData: any = {
                orderNumber,
                customerEmail: email,
                subtotal: subtotal,
                totalPrice: finalPrice,
                items: orderItems,
                status: 'commandée',
                paymentIntentId: paymentIntentId,
                deliveryMethod: deliveryMethod,
                createdAt: serverTimestamp()
            };
            
            if (userId) {
                newOrderData.userId = userId;
            }

            if (deliveryMethod === 'home' && shippingAddress) {
                newOrderData.shippingAddress = {
                    ...shippingAddress,
                    addressLine2: shippingAddress.addressLine2 || '',
                };
            }
            if (coupon) {
                newOrderData.couponCode = coupon.code;
                newOrderData.couponId = coupon.id;
            }
            if (pointsToUse && pointsToUse > 0) {
                newOrderData.pointsUsed = pointsToUse;
                newOrderData.pointsValue = pointsValue;
            }
            
            const newOrderRef = doc(collection(db, 'orders'));
            transaction.set(newOrderRef, newOrderData);
            
            return { success: true, message: 'Votre commande a été passée avec succès !', orderNumber, email, totalPrice: finalPrice, orderId: newOrderRef.id };
        });

        return orderData;
    } catch (error: any) {
        console.error("Error creating order:", error);
        return { success: false, message: error.message || "Une erreur est survenue lors du passage de la commande." };
    }
}

export async function sendConfirmationEmail(orderId: string, locale: string): Promise<{ success: boolean; message: string }> {
    try {
        const orderDoc = await getDoc(doc(db, 'orders', orderId));
        if (!orderDoc.exists()) {
            return { success: false, message: "Commande non trouvée pour l'envoi de l'e-mail." };
        }
        
        const orderData = orderDoc.data() as Order;
        const cartItems = orderData.items; // Simplified for email content
        const { orderNumber, customerEmail: email, totalPrice } = orderData;
        
        const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@atelierabijoux.com';
        const emailFooterText = `\n\nPour toute question, vous pouvez répondre directement à cet e-mail ou contacter notre support à ${supportEmail} en précisant votre numéro de commande (${orderNumber}).`;
        const emailFooterHtml = `<p style="font-size:12px;color:#666;">Pour toute question, vous pouvez répondre directement à cet e-mail ou contacter notre support à <a href="mailto:${supportEmail}">${supportEmail}</a> en précisant votre numéro de commande (${orderNumber}).</p>`;
        
        const referer = headers().get('referer');
        const baseUrl = referer ? new URL(referer).origin : (process.env.NEXT_PUBLIC_BASE_URL || 'https://www.atelierabijoux.com');
        const trackingUrl = `${baseUrl}/${locale}/orders/track?orderNumber=${orderNumber}`;

        const mailText = `Bonjour,\n\nNous avons bien reçu votre commande n°${orderNumber} d'un montant total de ${totalPrice.toFixed(2)}€.\n\nRécapitulatif :\n${cartItems.map(item => `- ${item.modelName} avec ${item.charms?.length || 0} breloque(s)`).join('\\n')}\n\nVous pouvez suivre votre commande ici : ${trackingUrl}\n\nVous recevrez un autre e-mail lorsque votre commande sera expédiée.\n\nL'équipe Atelier à bijoux${emailFooterText}`;
        const mailHtml = `<h1>Merci pour votre commande !</h1><p>Bonjour,</p><p>Nous avons bien reçu votre commande n°<strong>${orderNumber}</strong> d'un montant total de ${totalPrice.toFixed(2)}€.</p><h2>Récapitulatif :</h2><ul>${cartItems.map(item => `<li>${item.modelName} avec ${item.charms?.length || 0} breloque(s)</li>`).join('')}</ul><p>Vous pouvez suivre l'avancement de votre commande en cliquant sur ce lien : <a href="${trackingUrl}">${trackingUrl}</a>.</p><p>Vous recevrez un autre e-mail lorsque votre commande sera expédiée.</p><p>L'équipe Atelier à bijoux</p>${emailFooterHtml}`;
        
        await addDoc(collection(db, 'mail'), {
            to: [email],
            message: { subject: `Confirmation de votre commande n°${orderNumber}`, text: mailText.trim(), html: mailHtml.trim() }
        });

        return { success: true, message: "E-mail de confirmation en file d'attente." };
    } catch (error: any) {
        console.error("Error sending confirmation email:", error);
        return { success: false, message: "Impossible d'envoyer l'e-mail de confirmation." };
    }
}


export async function getOrderDetailsByNumber(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; order?: Order | null }> {
    const orderNumber = formData.get('orderNumber') as string;
    
    if (!orderNumber) {
        return { success: false, message: "Veuillez fournir un numéro de commande." };
    }

    try {
        const q = query(collection(db, 'orders'), where('orderNumber', '==', orderNumber.trim()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, message: "Aucune commande trouvée avec ce numéro.", order: null };
        }

        const orderDoc = querySnapshot.docs[0];
        const orderData = orderDoc.data();

        // Get all unique charm IDs from all items in the order
        const allCharmIds = orderData.items.flatMap((item: OrderItem) => item.charms.map((c: any) => c.charmId));
        const uniqueCharmIds = Array.from(new Set(allCharmIds)).filter(id => id);

        // Fetch all required charms in a single query
        let charmsMap = new Map<string, any>();
        if (uniqueCharmIds.length > 0) {
            const charmsQuery = query(collection(db, 'charms'), where(documentId(), 'in', uniqueCharmIds));
            const charmsSnapshot = await getDocs(charmsQuery);
            for (const charmDoc of charmsSnapshot.docs) {
                const charmData = charmDoc.data();
                charmsMap.set(charmDoc.id, {
                    ...charmData,
                    id: charmDoc.id,
                    imageUrl: await getUrl(charmData.imageUrl, 'https://placehold.co/100x100.png')
                } as any);
            }
        }
        
        // Fetch all required models
        const modelIds = orderData.items.map((item: OrderItem) => item.modelId);
        const uniqueModelIds = Array.from(new Set(modelIds));
        const modelsMap = new Map<string, JewelryModel>();
        
        if (uniqueModelIds.length > 0) {
            const jewelryTypeIds = Array.from(new Set(
                orderData.items.map((item: any) => item.jewelryTypeId).filter(Boolean)
            ));
            
            const modelPromises = jewelryTypeIds.map((typeId) => 
                getDocs(query(collection(db, typeId as string), where(documentId(), 'in', uniqueModelIds)))
            );
            
            const modelSnapshots = await Promise.all(modelPromises);
            
            for (const snap of modelSnapshots) {
                 for (const modelDoc of snap.docs) {
                    if (modelDoc.exists()) {
                        const modelData = modelDoc.data();
                        modelsMap.set(modelDoc.id, {
                            id: modelDoc.id,
                            ...modelData,
                            displayImageUrl: await getUrl(modelData.displayImageUrl, 'https://placehold.co/400x400.png'),
                            editorImageUrl: await getUrl(modelData.editorImageUrl, 'https://placehold.co/400x400.png'),
                        } as JewelryModel);
                    }
                 }
            }
        }

        // Enrich order items with full charm and model details
        const enrichedItems: OrderItem[] = await Promise.all(orderData.items.map(async (item: OrderItem) => {
            const model = modelsMap.get(item.modelId);
            
            const enrichedCharms = (item.charms || []).map((charmDetail: any) => {
                const charm = charmsMap.get(charmDetail.charmId);
                return charm ? { ...charm, withClasp: charmDetail.withClasp } : null;
            }).filter((c): c is any => !!c);

            return {
                ...item,
                modelImageUrl: model?.displayImageUrl,
                previewImageUrl: await getUrl(item.previewImageUrl, 'https://placehold.co/400x400.png'),
                charms: enrichedCharms,
            };
        }));
        
        const order: Order = {
            id: orderDoc.id,
            orderNumber: orderData.orderNumber,
            createdAt: (orderData.createdAt as Timestamp).toDate(),
            customerEmail: orderData.customerEmail,
            subtotal: orderData.subtotal ?? orderData.totalPrice,
            totalPrice: orderData.totalPrice,
            items: enrichedItems,
            status: orderData.status,
            deliveryMethod: orderData.deliveryMethod || 'home',
            shippingAddress: orderData.shippingAddress,
            shippingCarrier: orderData.shippingCarrier,
            trackingNumber: orderData.trackingNumber,
            paymentIntentId: orderData.paymentIntentId,
        };
        
        return { success: true, message: "Commande trouvée.", order: order };
    } catch (error) {
        console.error("Error finding order: ", error);
        return { success: false, message: "Une erreur est survenue lors de la recherche de la commande." };
    }
}

export async function getOrdersByEmail(prevState: any, formData: FormData): Promise<{ success: boolean; message: string; }> {
    const email = formData.get('email') as string;
    const locale = formData.get('locale') as string || 'fr';
    
    if (!email) {
        return { success: false, message: "Veuillez fournir une adresse e-mail." };
    }
    
    try {
        console.log(`[SERVER] Searching for orders with email: ${email}`);
        const q = query(collection(db, 'orders'), where('customerEmail', '==', email.trim()));
        const querySnapshot = await getDocs(q);
        console.log(`[SERVER] Found ${querySnapshot.docs.length} orders for ${email}`);

        const orders = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                orderNumber: data.orderNumber,
                status: data.status,
                createdAt: (data.createdAt as Timestamp).toDate().toLocaleDateString(locale),
            };
        });
        
        const referer = headers().get('referer');
        const baseUrl = referer ? new URL(referer).origin : (process.env.NEXT_PUBLIC_BASE_URL || 'https://www.atelierabijoux.com');
        const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@atelierabijoux.com';
        
        const emailFooterText = `\n\nPour toute question, vous pouvez répondre directement à cet e-mail ou contacter notre support à ${supportEmail}.`;
        const emailFooterHtml = `<p style="font-size:12px;color:#666;">Pour toute question, vous pouvez répondre directement à cet e-mail ou contacter notre support à <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>`;

        let mailText: string;
        let mailHtml: string;
        let returnMessage: string;
        
        if (orders.length > 0) {
            console.log('[SERVER] Orders found, preparing email.');
            returnMessage = `Email sent. ${orders.length} order(s) found.`;
            const ordersListText = orders.map(o => 
                `- Commande ${o.orderNumber} (du ${o.createdAt}) - Statut : ${o.status}`
            ).join('\\n');
            const ordersListHtml = orders.map(o => 
                `<li>Commande <strong>${o.orderNumber}</strong> (du ${o.createdAt}) - Statut : ${o.status} - <a href="${baseUrl}/${locale}/orders/track?orderNumber=${o.orderNumber}">Suivre cette commande</a></li>`
            ).join('');

            mailText = `Bonjour,\n\nVoici la liste de vos commandes récentes passées avec cette adresse e-mail :\n\n${ordersListText}\n\nVous pouvez cliquer sur le lien de chaque commande pour voir son statut.\n\nL'équipe Atelier à bijoux${emailFooterText}`;
            mailHtml = `<h1>Vos commandes Atelier à bijoux</h1><p>Bonjour,</p><p>Voici la liste de vos commandes récentes passées avec cette adresse e-mail :</p><ul>${ordersListHtml}</ul><p>L'équipe Atelier à bijoux</p>${emailFooterHtml}`;
        } else {
            console.log('[SERVER] No orders found, preparing notification email.');
            returnMessage = "Email sent. No orders found.";
            mailText = `Bonjour,\n\nVous avez récemment demandé à retrouver vos commandes. Aucune commande n'est associée à cette adresse e-mail (${email}).\n\nSi vous pensez qu'il s'agit d'une erreur, veuillez vérifier l'adresse e-mail ou contacter notre support.${emailFooterText}`;
            mailHtml = `<h1>Vos commandes Atelier à bijoux</h1><p>Bonjour,</p><p>Vous avez récemment demandé à retrouver vos commandes. Aucune commande n'est associée à cette adresse e-mail (${email}).</p><p>Si vous pensez qu'il s'agit d'une erreur, veuillez vérifier l'adresse e-mail ou contacter notre support.</p>${emailFooterHtml}`;
        }

        const mailDocData = {
            to: [email],
            message: {
                subject: "Vos commandes chez Atelier à bijoux",
                text: mailText.trim(),
                html: mailHtml.trim(),
            },
        };
        
        console.log('[SERVER] Creating mail document in Firestore.');
        const mailRef = doc(collection(db, 'mail'));
        await setDoc(mailRef, mailDocData);
        console.log('[SERVER] Mail document created successfully.');
        
        return { success: true, message: returnMessage };

    } catch (error: any) {
        console.error(`[SERVER] Error in getOrdersByEmail for ${email}:`, error);
        return { success: false, message: error.message };
    }
}


// --- Admin Order Actions ---

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
        const allCharmIds = ordersSnapshot.docs.flatMap(doc => doc.data().items?.flatMap((item: OrderItem) => (item.charms || []).map((c: any) => c.charmId)) || []);
        const uniqueCharmIds = Array.from(new Set(allCharmIds)).filter(id => id);

        // Fetch all required charms in a single query
        let charmsMap = new Map<string, any>();
        if (uniqueCharmIds.length > 0) {
            // Firestore 'in' query is limited to 30 items, so chunk if necessary
            const charmIdChunks = [];
            for (let i = 0; i < uniqueCharmIds.length; i += 30) {
                charmIdChunks.push(uniqueCharmIds.slice(i, i + 30));
            }
            
            for (const chunk of charmIdChunks) {
                const charmsQuery = query(collection(db, 'charms'), where(documentId(), 'in', chunk));
                const charmsSnapshot = await getDocs(charmsQuery);
                for (const charmDoc of charmsSnapshot.docs) {
                    const charmData = charmDoc.data() as Omit<any, 'id'>;
                    const imageUrl = await getUrl(charmData.imageUrl, 'https://placehold.co/100x100.png');
                    charmsMap.set(charmDoc.id, { ...charmData, id: charmDoc.id, imageUrl });
                }
            }
        }
        
        const orders: Order[] = await Promise.all(ordersSnapshot.docs.map(async(orderDoc) => {
            const data = orderDoc.data();
            
            const enrichedItems: OrderItem[] = await Promise.all((data.items || []).map(async (item: OrderItem) => {
                const enrichedCharms = (item.charms || [])
                    .map((charmDetail: any) => {
                        const charm = charmsMap.get(charmDetail.charmId);
                         if (!charm) return null;
                        return { ...charm, withClasp: charmDetail.withClasp };
                    })
                    .filter((c): c is any => !!c); // Filter out undefined charms

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

export async function updateOrderStatus(formData: FormData): Promise<{ success: boolean; message: string }> {
     try {
        const session = cookies().get('session')?.value;
        if (!session) throw new Error("Non autorisé");
        await verifyAdmin(session);
        const orderId = formData.get('orderId') as string;
        const newStatus = formData.get('status') as OrderStatus;
        const locale = formData.get('locale') as string || 'fr';

        if (!orderId || !newStatus) {
            return { success: false, message: "Informations manquantes." };
        }

        let cancellationReasonForEmail: string | null = null;

        const transactionResult = await runTransaction(db, async (transaction) => {
            const orderRef = doc(db, 'orders', orderId);
            const orderDoc = await transaction.get(orderRef);

            if (!orderDoc.exists()) {
                throw new Error("Commande non trouvée.");
            }
            
            const orderData = orderDoc.data() as Order;
            const currentStatus = orderData.status;

            if (currentStatus === newStatus) {
                throw new Error(`La commande est déjà au statut : ${newStatus}.`);
            }

            let dataToUpdate: Partial<Order> = { status: newStatus };

            if (newStatus === 'expédiée') {
                const shippingCarrier = formData.get('shippingCarrier') as string;
                const trackingNumber = formData.get('trackingNumber') as string;
                if (!shippingCarrier || !trackingNumber) {
                    throw new Error("Le transporteur et le numéro de suivi sont obligatoires pour une expédition.");
                }
                dataToUpdate.shippingCarrier = shippingCarrier;
                dataToUpdate.trackingNumber = trackingNumber;
            }

            if (newStatus === 'annulée' && currentStatus !== 'annulée') {
                cancellationReasonForEmail = formData.get('cancellationReason') as string;
                if (!cancellationReasonForEmail) {
                    throw new Error("Le motif de l'annulation est obligatoire.");
                }
                dataToUpdate.cancellationReason = cancellationReasonForEmail;

                // Refund payment
                if (orderData.paymentIntentId && orderData.paymentIntentId !== 'free_order') {
                    const refundResult = await refundStripePayment(orderData.paymentIntentId);
                    if (!refundResult.success) {
                        throw new Error(`Le remboursement a échoué: ${refundResult.message}. L'annulation a été interrompue.`);
                    }
                }

                // Restore points
                if (orderData.userId && orderData.pointsUsed && orderData.pointsUsed > 0) {
                     const userRef = doc(db, 'users', orderData.userId);
                     transaction.update(userRef, { rewardPoints: increment(orderData.pointsUsed) });
                }

                // Restore stock
                const stockToRestore = new Map<string, number>();
                for (const item of orderData.items) {
                    const modelPath = doc(db, item.jewelryTypeId, item.modelId).path;
                    stockToRestore.set(modelPath, (stockToRestore.get(modelPath) || 0) + 1);
                    for (const charmDetail of (item.charms || [])) {
                        const charmPath = doc(db, 'charms', charmDetail.id).path;
                        stockToRestore.set(charmPath, (stockToRestore.get(charmPath) || 0) + 1);
                    }
                }
                stockToRestore.forEach((quantity, path) => {
                    transaction.update(doc(db, path), { quantity: increment(quantity) });
                });
            }

            transaction.update(orderRef, dataToUpdate);
            // Return the updated order data to be used outside the transaction for email
            return { ...orderData, ...dataToUpdate };
        });

        // Send email AFTER the transaction has successfully committed
        if (transactionResult && transactionResult.status === 'annulée' && cancellationReasonForEmail) {
            const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@atelierabijoux.com';
            const emailFooterText = `\n\nPour toute question, vous pouvez répondre directement à cet e-mail ou contacter notre support à ${supportEmail} en précisant votre numéro de commande (${transactionResult.orderNumber}).`;
            const emailFooterHtml = `<p style="font-size:12px;color:#666;">Pour toute question, vous pouvez répondre directement à cet e-mail ou contacter notre support à <a href="mailto:${supportEmail}">${supportEmail}</a> en précisant votre numéro de commande (${transactionResult.orderNumber}).</p>`;
            
            const isPaidOrder = transactionResult.paymentIntentId && transactionResult.paymentIntentId !== 'free_order';
            const refundText = isPaidOrder ? `\nLe remboursement complet a été initié et devrait apparaître sur votre compte d'ici quelques jours.` : '';
            const refundHtml = isPaidOrder ? `<p>Le remboursement complet a été initié et devrait apparaître sur votre compte d'ici quelques jours.</p>` : '';

            const mailText = `Bonjour,\n\nVotre commande n°${transactionResult.orderNumber} a été annulée.\n\nMotif : ${cancellationReasonForEmail}${refundText}\n\nNous nous excusons pour ce désagrément.\n\nL'équipe Atelier à bijoux${emailFooterText}`;
            const mailHtml = `<h1>Votre commande n°${transactionResult.orderNumber} a été annulée</h1><p>Bonjour,</p><p>Votre commande n°<strong>${transactionResult.orderNumber}</strong> a été annulée.</p><p><strong>Motif de l'annulation :</strong> ${cancellationReasonForEmail}</p>${refundHtml}<p>Nous nous excusons pour ce désagrément.</p><p>L'équipe Atelier à bijoux</p>${emailFooterHtml}`;
            
            const mailDocData = {
                to: [transactionResult.customerEmail],
                message: {
                    subject: `Annulation de votre commande n°${transactionResult.orderNumber}`,
                    text: mailText.trim(),
                    html: mailHtml.trim(),
                },
            };
            await addDoc(collection(db, 'mail'), mailDocData);
        }

        revalidatePath(`/${locale}/admin/dashboard`);
        return { success: true, message: "Le statut de la commande a été mis à jour." };
    } catch (error: any) {
        console.error("Error updating order status:", error);
        return { success: false, message: error.message || "Une erreur est survenue." };
    }
}

export async function updateOrderItemStatus(formData: FormData): Promise<{ success: boolean; message: string }> {
     try {
        const session = cookies().get('session')?.value;
        if (!session) throw new Error("Non autorisé");
        await verifyAdmin(session);
        const orderId = formData.get('orderId') as string;
        const itemIndex = parseInt(formData.get('itemIndex') as string, 10);
        const isCompleted = formData.get('isCompleted') === 'true';

        if (!orderId || isNaN(itemIndex)) {
            return { success: false, message: "Informations manquantes." };
        }

        const orderRef = doc(db, 'orders', orderId);
        
        await runTransaction(db, async (transaction) => {
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists()) {
                throw new Error("La commande n'existe pas.");
            }
            
            const orderData = orderDoc.data();
            const items = orderData.items as OrderItem[];

            if (itemIndex < 0 || itemIndex >= items.length) {
                 throw new Error("Index de l'article invalide.");
            }

            items[itemIndex].isCompleted = isCompleted;
            
            transaction.update(orderRef, { items: items });
        });

        revalidatePath(`/fr/admin/dashboard`);
        return { success: true, message: "Statut de l'article mis à jour." };
    } catch (error: any) {
        return { success: false, message: error.message || "Une erreur est survenue." };
    }
}

export async function validateCoupon(code: string): Promise<{ success: boolean; message: string; coupon?: Coupon }> {
    if (!code) {
        return { success: false, message: 'Veuillez entrer un code.' };
    }
    
    try {
        const q = query(collection(db, 'coupons'), where('code', '==', code.trim().toUpperCase()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, message: "Ce code promo n'est pas valide." };
        }
        
        const couponDoc = querySnapshot.docs[0];
        const couponData = couponDoc.data();
        
        const expiresAtDate = toDate(couponData.expiresAt as Timestamp | undefined);

        if (expiresAtDate && expiresAtDate < new Date()) {
            return { success: false, message: "Ce code promo a expiré." };
        }
        
        const value = typeof couponData.value === 'string' ? parseFloat(couponData.value) : couponData.value;
        if (isNaN(value)) {
             return { success: false, message: "La valeur du code promo est invalide." };
        }

        const coupon: Coupon = { 
            id: couponDoc.id, 
            code: couponData.code,
            discountType: couponData.discountType,
            value: value,
            expiresAt: expiresAtDate || undefined,
            minPurchase: couponData.minPurchase,
        };

        return { success: true, message: 'Code promo appliqué !', coupon };

    } catch (error: any) {
        console.error("Error validating coupon:", error);
        return { success: false, message: "Une erreur est survenue lors de la validation du code." };
    }
}


    