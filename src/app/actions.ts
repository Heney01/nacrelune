// @/app/actions.ts
'use server';

import { suggestCharmPlacement, SuggestCharmPlacementInput, SuggestCharmPlacementOutput } from '@/ai/flows/charm-placement-suggestions';
import { generateCustomJewelryImage, GenerateCustomJewelryImageInput, GenerateCustomJewelryImageOutput } from '@/ai/flows/generate-custom-jewelry-image';
import { db } from '@/lib/firebase';
import type { Order } from '@/lib/types';
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

export async function getGeneratedJewelryImage(
  input: GenerateCustomJewelryImageInput
): Promise<GenerateCustomJewelryImageOutput> {
    try {
        const result = await generateCustomJewelryImage(input);
        return result;
    } catch (error) {
        console.error('Error generating jewelry image:', error);
        throw new Error('Failed to generate image.');
    }
}

export async function createOrder(
  order: Omit<Order, 'id' | 'createdAt'>
): Promise<{ id: string }> {
  try {
    const docRef = await addDoc(collection(db, 'orders'), {
      ...order,
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id };
  } catch (error) {
    console.error('Error creating order:', error);
    throw new Error('Failed to create order.');
  }
}
