
'use server';

/**
 * @fileOverview An AI agent to suggest charm placements on jewelry based on a photo.
 *
 * - getCharmAnalysisSuggestions: A function that handles the charm suggestion process from a photo.
 * - CharmAnalysisSuggestionInput: The input type for the getCharmAnalysisSuggestions function.
 * - CharmAnalysisSuggestionOutput: The return type for the getCharmAnalysisSuggestions function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const CharmAnalysisSuggestionInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a piece of jewelry, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  allCharms: z.array(z.string()).describe('A list of all available charms the AI can suggest.'),
});
export type CharmAnalysisSuggestionInput = z.infer<typeof CharmAnalysisSuggestionInputSchema>;

const CharmAnalysisSuggestionOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of 3 to 5 charm names that would complement the jewelry in the photo.'),
});
export type CharmAnalysisSuggestionOutput = z.infer<typeof CharmAnalysisSuggestionOutputSchema>;


const analysisPrompt = ai.definePrompt({
  name: 'charmAnalysisPrompt',
  input: { schema: CharmAnalysisSuggestionInputSchema },
  output: { schema: CharmAnalysisSuggestionOutputSchema },
  model: googleAI.model('gemini-1.5-pro'),
  prompt: `You are a jewelry design expert for a custom creation workshop.
Your role is to analyze a photo of a piece of jewelry provided by a user and suggest charms that would complement it.

Here is the photo of the jewelry:
{{media url=photoDataUri}}

Here is the complete list of available charms you can suggest:
{{#each allCharms}} - {{{this}}}
{{/each}}

Your task:
Based on the style, shape, and existing elements of the jewelry in the photo, suggest a list of 3 to 5 relevant charms from the available list that would create a harmonious or interesting design.
Provide only the names of the suggested charms.
`,
});

const suggestCharmAnalysisFlow = ai.defineFlow(
  {
    name: 'suggestCharmAnalysisFlow',
    inputSchema: CharmAnalysisSuggestionInputSchema,
    outputSchema: CharmAnalysisSuggestionOutputSchema,
  },
  async (input) => {
    const llmResponse = await analysisPrompt(input);
    const output = llmResponse.output;

    if (!output) {
      console.error('[AI FLOW] LLM returned no output from analysis.');
      throw new Error("L'IA n'a retourné aucune suggestion d'analyse.");
    }
    
    return output;
  }
);


export async function getCharmAnalysisSuggestions(input: CharmAnalysisSuggestionInput): Promise<CharmAnalysisSuggestionOutput> {
  return suggestCharmAnalysisFlow(input);
}
