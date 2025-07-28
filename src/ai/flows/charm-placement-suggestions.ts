
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
import { defineTool } from 'genkit';


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
  shouldIntegrate: z.boolean().describe('Whether to integrate this suggestion into the design.'),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;


const SuggestCharmPlacementOutputSchema = z.object({
  suggestions: z.array(SuggestionSchema).describe('The list of charm placement suggestions.'),
});
export type SuggestCharmPlacementOutput = z.infer<typeof SuggestCharmPlacementOutputSchema>;

const shouldIntegrateCharmTool = defineTool({
  name: 'shouldIntegrateCharm',
  description: 'Determines whether a given charm suggestion should be contextually relevant.',
  inputSchema: z.object({
    charm: z.string().describe('The charm being suggested.'),
    placementDescription: z.string().describe('The description of the suggested placement.'),
    jewelryType: z.string().describe('The type of jewelry.'),
    modelDescription: z.string().describe('The description of the jewelry model.'),
    userPreferences: z.string().optional().describe('User preferences, if available.'),
  }),
  outputSchema: z.boolean(),
}, async (input) => {
  // Implement logic to determine whether the charm suggestion is contextually relevant
  // based on the input provided.  For example, check if the charm type matches
  // the jewelry type, or if the placement makes sense given user preferences.
  // For now, we'll just return true.
  return true;
});

export async function suggestCharmPlacement(input: SuggestCharmPlacementInput): Promise<SuggestCharmPlacementOutput> {
  return suggestCharmPlacementFlow(input);
}

const suggestCharmPlacementFlow = ai.flow(
  {
    name: 'suggestCharmPlacementFlow',
    inputSchema: SuggestCharmPlacementInputSchema,
    outputSchema: SuggestCharmPlacementOutputSchema,
  },
  async (input) => {
     if (input.charmOptions.length === 0) {
      return { suggestions: [] };
    }

    const llmResponse = await ai.generate({
      prompt: `You are a jewelry design assistant. Your task is to suggest charm placements based on the provided information, including specific coordinates.

When suggesting a placement, you MUST provide precise x and y coordinates as percentages (from 0 to 100) for where the charm should be placed on the jewelry model.
- The (0, 0) coordinate is the top-left corner of the canvas.
- The (100, 100) coordinate is the bottom-right corner.
- The (50, 50) is the center.

Think like a designer. Consider balance, symmetry, and aesthetic appeal based on the jewelry type and user preferences.

IMPORTANT: You MUST strictly adhere to the user's preferences. If the user expresses a negative constraint (e.g., "I hate...", "no red", "I don't like..."), you MUST NOT suggest any charm that violates this constraint. This is a strict rule.

Jewelry Type: ${input.jewelryType}
Model Name: ${input.modelDescription}
Available Charms: ${input.charmOptions.join(', ')}
User Preferences: ${input.userPreferences}

Suggest placements for a few of the available charms. For each suggestion, provide a brief description of where the charm should be placed, and the x/y coordinates. Use the shouldIntegrateCharm tool to determine if the charm suggestion should be integrated into the design.`,
      tools: [shouldIntegrateCharmTool],
      output: {
        schema: SuggestCharmPlacementOutputSchema
      }
    });

    const output = llmResponse.output();
    if (!output) {
      throw new Error('No output from prompt');
    }
    const suggestionsWithIntegration = await Promise.all(
      output.suggestions.map(async suggestion => {
        const shouldIntegrate = await shouldIntegrateCharmTool({
          charm: suggestion.charm,
          placementDescription: suggestion.placementDescription,
          jewelryType: input.jewelryType,
          modelDescription: input.modelDescription,
          userPreferences: input.userPreferences,
        });
        return {
          ...suggestion,
          shouldIntegrate,
        };
      })
    );

    return {
      suggestions: suggestionsWithIntegration,
    };
  }
);
