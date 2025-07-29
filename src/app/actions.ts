

// @/app/actions.ts
'use server';

import { suggestCharmPlacement, SuggestCharmPlacementInput, SuggestCharmPlacementOutput } from '@/ai/flows/charm-placement-suggestions';
import { revalidatePath } from 'next/cache';

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

// Mock function for testing the server action call
export async function deleteModel(
    jewelryTypeId: string,
    modelId: string
): Promise<{ success: boolean; message: string }> {
  console.log('--- TEST: deleteModel action was called successfully ---');
  console.log(`--- jewelryTypeId: ${jewelryTypeId}, modelId: ${modelId} ---`);

  // In a real scenario, you would revalidate the path after DB modification
  // revalidatePath('/admin/dashboard');

  return { success: true, message: "Action de suppression appelée avec succès (test)." };
}
