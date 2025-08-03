
'use server';

/**
 * @fileOverview An AI agent to provide a textual critique of a jewelry design from a photo.
 *
 * - getCharmDesignCritique: A function that handles the design critique process from a photo.
 * - CharmDesignCritiqueInput: The input type for the getCharmDesignCritique function.
 * - CharmDesignCritiqueOutput: The return type for the getCharmDesignCritique function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const CharmDesignCritiqueInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a piece of jewelry, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  locale: z.string().describe('The language for the response (e.g., "fr" or "en").'),
});
export type CharmDesignCritiqueInput = z.infer<typeof CharmDesignCritiqueInputSchema>;

const CharmDesignCritiqueOutputSchema = z.object({
  critique: z.string().describe('A constructive, textual critique of the jewelry design, written in a friendly and encouraging tone. It should cover aspects like balance, style, charm associations, and potential areas for improvement. The critique should be a few paragraphs long.'),
});
export type CharmDesignCritiqueOutput = z.infer<typeof CharmDesignCritiqueOutputSchema>;


const critiquePrompt = ai.definePrompt({
  name: 'charmDesignCritiquePrompt',
  input: { schema: CharmDesignCritiqueInputSchema },
  output: { schema: CharmDesignCritiqueOutputSchema },
  model: googleAI.model('gemini-1.5-pro'),
  prompt: `You are a friendly and encouraging jewelry design expert for a custom creation workshop.
Your role is to provide a constructive critique of a user's jewelry design based on a photo they provide.
Your response MUST be written in the following language: {{{locale}}}.

Here is the photo of the user's creation:
{{media url=photoDataUri}}

Your task:
Write a thoughtful and positive critique of the design. Be friendly and act as a helpful guide, not a harsh critic.
- Start by highlighting what you like about the design (e.g., "I love the playful theme you've started here!").
- Discuss the overall balance, harmony, and style of the piece.
- Talk about the story the charms seem to tell together.
- If there are areas for improvement, phrase them as gentle suggestions (e.g., "Have you considered adding a smaller charm here to create a bit more visual balance?" or "To enhance the minimalist feel, you could try spacing the charms out a bit more.").
- Conclude with an encouraging remark.
- The entire critique should be formatted as a single block of text, with paragraphs separated by newlines.
`,
});

const critiqueDesignFlow = ai.defineFlow(
  {
    name: 'critiqueDesignFlow',
    inputSchema: CharmDesignCritiqueInputSchema,
    outputSchema: CharmDesignCritiqueOutputSchema,
  },
  async (input) => {
    const llmResponse = await critiquePrompt(input);
    const output = llmResponse.output;

    if (!output) {
      console.error('[AI FLOW] LLM returned no output from critique.');
      throw new Error("L'IA n'a retourné aucune analyse.");
    }
    
    return output;
  }
);


export async function getCharmDesignCritique(input: CharmDesignCritiqueInput): Promise<CharmDesignCritiqueOutput> {
  return critiqueDesignFlow(input);
}
