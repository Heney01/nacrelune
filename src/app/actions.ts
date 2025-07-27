// @/app/actions.ts
'use server';

import { suggestCharmPlacement, SuggestCharmPlacementInput, SuggestCharmPlacementOutput } from '@/ai/flows/charm-placement-suggestions';
import { generateCustomJewelryImage, GenerateCustomJewelryImageInput, GenerateCustomJewelryImageOutput } from '@/ai/flows/generate-custom-jewelry-image';


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
