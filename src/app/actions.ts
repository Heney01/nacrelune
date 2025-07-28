// @/app/actions.ts
'use server';

import { suggestCharmPlacement, SuggestCharmPlacementInput, SuggestCharmPlacementOutput } from '@/ai/flows/charm-placement-suggestions';


export async function getCharmSuggestions(
  input: SuggestCharmPlacementInput
): Promise<SuggestCharmPlacementOutput> {
  try {
    const suggestions = await suggestCharmPlacement(input);
    return suggestions;
  } catch (error) {
    console.error('Error getting charm suggestions:', error);
    // Return an empty array of suggestions instead of throwing an error
    return { suggestions: [] };
  }
}
