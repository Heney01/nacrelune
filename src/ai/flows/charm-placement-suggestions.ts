
'use server';

/**
 * @fileOverview A charm placement suggestion AI agent.
 *
 * - suggestCharmPlacement - A function that suggests charm placements.
 * - SuggestCharmPlacementInput - The input type for the suggestCharmPlacement function.
 * - SuggestCharmPlacementOutput - The return type for the suggestCharmPlacement function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';


const SuggestCharmPlacementInputSchema = z.object({
  jewelryType: z.string().describe('The type of jewelry (necklace, bracelet, earrings).'),
  modelDescription: z.string().describe('The description of the selected jewelry model.'),
  charmOptions: z.array(z.string()).describe('The available charm options.'),
  userPreferences: z.string().optional().describe('Optional user preferences for charm placement.'),
});
export type SuggestCharmPlacementInput = z.infer<typeof SuggestCharmPlacementInputSchema>;

const SuggestionSchema = z.object({
  charm: z.string().describe('The suggested charm.'),
  placementDescription: z.string().describe('The suggested placement description.'),
  position: z
    .object({
      x: z.number().describe('The x coordinate for the placement, as a percentage from 0 to 100.'),
      y: z.number().describe('The y coordinate for the placement, as a percentage from 0 to 100.'),
    })
    .describe('The suggested coordinates for the charm placement.'),
  shouldIntegrate: z.boolean().describe('Whether to recommend integrating this suggestion into the design based on aesthetics and user preferences.'),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;


const SuggestCharmPlacementOutputSchema = z.object({
  suggestions: z.array(SuggestionSchema).describe('The list of charm placement suggestions.'),
});
export type SuggestCharmPlacementOutput = z.infer<typeof SuggestCharmPlacementOutputSchema>;

export async function suggestCharmPlacement(input: SuggestCharmPlacementInput): Promise<SuggestCharmPlacementOutput> {
  try {
    const suggestions = await suggestCharmPlacementFlow(input);
    return suggestions;
  } catch (error: any) {
    console.error('Error in suggestCharmPlacement action:', error);
    // Return the actual error message to the client for better debugging
    throw new Error(error.message || 'Failed to generate suggestions.');
  }
}

const suggestCharmPlacementFlow = ai.defineFlow(
  {
    name: 'suggestCharmPlacementFlow',
    inputSchema: SuggestCharmPlacementInputSchema,
    outputSchema: SuggestCharmPlacementOutputSchema,
  },
  async (input) => {
    console.log('[AI Flow] Starting suggestCharmPlacementFlow with input:', JSON.stringify(input, null, 2));

    if (!input.charmOptions || input.charmOptions.length === 0) {
      console.log('[AI Flow] No charm options provided, returning empty suggestions.');
      return { suggestions: [] };
    }

    console.log('[AI Flow] Calling AI.generate...');
    const llmResponse = await ai.generate({
      prompt: `You are a jewelry design assistant. Your task is to suggest creative and aesthetically pleasing charm placements.

You will be given the type of jewelry, a description of the model, a list of available charms, and optional user preferences.

Your goal is to provide a few (2-4) placement suggestions for the available charms. For each suggestion:
1.  **Placement:** Describe where the charm should be placed in a descriptive way (e.g., "centered on the main pendant", "dangling from the left side").
2.  **Coordinates:** Provide precise x and y coordinates as percentages (from 0 to 100). The (0, 0) coordinate is the top-left corner, (50, 50) is the center, and (100, 100) is the bottom-right.
3.  **Recommendation:** Based on design principles (balance, symmetry, storytelling) and the user's preferences, decide if this is a good suggestion that should be integrated. Set the 'shouldIntegrate' flag to true for your best recommendations.

**IMPORTANT:** You MUST strictly adhere to any negative constraints in the user's preferences (e.g., "I hate...", "no red," "I don't like..."). Do not suggest anything that violates these constraints.

Here is the information for your task:
- Jewelry Type: ${input.jewelryType}
- Model Description: ${input.modelDescription}
- Available Charms: ${input.charmOptions.join(', ')}
- User Preferences: ${input.userPreferences || 'None'}

Please provide your suggestions in the required output format.`,
      output: {
        schema: SuggestCharmPlacementOutputSchema
      },
      config: {
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE',
          },
        ],
      }
    });
    
    const output = await llmResponse.output();
    if (!output) {
      console.error('[AI Flow] No output from prompt.');
      throw new Error('No output from prompt');
    }
    
    console.log('[AI Flow] Successfully received output from AI:', JSON.stringify(output, null, 2));
    return output;
  }
);
