
// @/app/actions.ts
'use server';

import { suggestCharmPlacement, SuggestCharmPlacementInput, SuggestCharmPlacementOutput } from '@/ai/flows/charm-placement-suggestions';
import { db } from '@/lib/firebase';
import type { CartItem } from '@/lib/types';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';


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

export async function placeOrder(cartItems: CartItem[]): Promise<string> {
    if (!cartItems || cartItems.length === 0) {
        throw new Error("Cart is empty");
    }

    try {
        const total = cartItems.reduce((sum, item) => {
            const modelPrice = item.model.price || 0;
            const charmsPrice = item.placedCharms.reduce((charmSum, pc) => charmSum + (pc.charm.price || 0), 0);
            return sum + modelPrice + charmsPrice;
        }, 0);

        const orderData = {
            items: cartItems.map(item => ({
                modelName: item.model.name,
                jewelryType: item.jewelryType.name,
                price: (item.model.price || 0) + item.placedCharms.reduce((charmSum, pc) => charmSum + (pc.charm.price || 0), 0),
                charms: item.placedCharms.map(pc => pc.charm.name),
                previewImage: item.previewImage,
            })),
            totalPrice: total,
            createdAt: serverTimestamp(),
            status: 'pending', 
        };

        const docRef = await addDoc(collection(db, "orders"), orderData);
        
        return docRef.id;

    } catch (error) {
        console.error("Error placing order: ", error);
        throw new Error("Could not place order.");
    }
}
