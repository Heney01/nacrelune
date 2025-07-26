
'use server';

/**
 * @fileOverview A charm placement suggestion AI agent.
 *
 * - suggestCharmPlacement - A function that suggests charm placements.
 * - SuggestCharmPlacementInput - The input type for the suggestCharmPlacement function.
 * - SuggestCharmPlacementOutput - The return type for the suggestCharmPlacement function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestCharmPlacementInputSchema = z.object({
  jewelryType: z.string().describe('The type of jewelry (necklace, bracelet, earrings).'),
  modelDescription: z.string().describe('The description of the selected jewelry model.'),
  charmOptions: z.array(z.string()).describe('The available charm options.'),
  userPreferences: z.string().optional().describe('Optional user preferences for charm placement.'),
});
export type SuggestCharmPlacementInput = z.infer<typeof SuggestCharmPlacementInputSchema>;

const SuggestCharmPlacementOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      charm: z.string().describe('The suggested charm.'),
      placementDescription: z.string().describe('The suggested placement description.'),
      shouldIntegrate: z.boolean().describe('Whether to integrate this suggestion into the design.'),
    })
  ).describe('The list of charm placement suggestions.'),
});
export type SuggestCharmPlacementOutput = z.infer<typeof SuggestCharmPlacementOutputSchema>;

const shouldIntegrateCharmTool = ai.defineTool({
  name: 'shouldIntegrateCharm',
  description: 'Determines whether a given charm suggestion should be integrated into the design based on contextual relevance.',
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

const prompt = ai.definePrompt({
  name: 'suggestCharmPlacementPrompt',
  input: {schema: SuggestCharmPlacementInputSchema},
  output: {schema: SuggestCharmPlacementOutputSchema},
  tools: [shouldIntegrateCharmTool],
  prompt: `You are a jewelry design assistant. Your task is to suggest charm placements based on the provided information.

Jewelry Type: {{{jewelryType}}}
Model Name: {{{modelDescription}}}
Available Charms: {{#each charmOptions}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
User Preferences: {{{userPreferences}}}

Carefully review the user's preferences. If the user expresses a dislike for something (e.g., "I hate lemons," "no stars"), you MUST NOT suggest any charms related to that preference. Your suggestions should strictly adhere to the user's stated likes and dislikes.

Suggest placements for a few of the available charms that align with the user's preferences. For each suggestion, consider the overall aesthetic and provide a brief description of where the charm should be placed and why.

Use the shouldIntegrateCharm tool to determine if the charm suggestion should be integrated into the design.

Output your suggestions in JSON format.`, 
});

const suggestCharmPlacementFlow = ai.defineFlow(
  {
    name: 'suggestCharmPlacementFlow',
    inputSchema: SuggestCharmPlacementInputSchema,
    outputSchema: SuggestCharmPlacementOutputSchema,
  },
  async input => {
     if (input.charmOptions.length === 0) {
      return { suggestions: [] };
    }
    const {output} = await prompt(input);
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

    
