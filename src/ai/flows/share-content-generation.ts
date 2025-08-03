
'use server';

/**
 * @fileOverview An AI agent to generate a title and description for a jewelry creation from a photo.
 *
 * - generateShareContent: A function that handles the content generation process.
 * - GenerateShareContentInput: The input type for the generateShareContent function.
 * - GenerateShareContentOutput: The return type for the generateShareContent function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const GenerateShareContentInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a piece of jewelry, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
   locale: z.string().describe('The language for the response (e.g., "fr" or "en").'),
});
export type GenerateShareContentInput = z.infer<typeof GenerateShareContentInputSchema>;

const GenerateShareContentOutputSchema = z.object({
  title: z.string().describe('A short, catchy, and creative title for the jewelry creation (max 5 words).'),
  description: z.string().describe('A short, appealing description for social media (1-2 sentences).'),
});
export type GenerateShareContentOutput = z.infer<typeof GenerateShareContentOutputSchema>;


const contentPrompt = ai.definePrompt({
  name: 'generateShareContentPrompt',
  input: { schema: GenerateShareContentInputSchema },
  output: { schema: GenerateShareContentOutputSchema },
  model: googleAI.model('gemini-1.5-pro'),
  prompt: `You are a creative marketing expert for a custom jewelry workshop.
Your task is to generate a catchy title and a short description for a user's creation, based on a photo.
This content will be used for sharing on social media.
Your response MUST be written in the following language: {{{locale}}}.

Here is the photo of the user's creation:
{{media url=photoDataUri}}

Your task:
1.  Generate a creative and evocative title (maximum 5 words).
2.  Generate a short and appealing description (1-2 sentences) that tells a little story about the piece.
`,
});

const generateShareContentFlow = ai.defineFlow(
  {
    name: 'generateShareContentFlow',
    inputSchema: GenerateShareContentInputSchema,
    outputSchema: GenerateShareContentOutputSchema,
  },
  async (input) => {
    const llmResponse = await contentPrompt(input);
    const output = llmResponse.output;

    if (!output) {
      console.error('[AI FLOW] LLM returned no output from share content generation.');
      throw new Error("L'IA n'a retourné aucun contenu.");
    }
    
    return output;
  }
);


export async function generateShareContent(input: GenerateShareContentInput): Promise<GenerateShareContentOutput> {
  return generateShareContentFlow(input);
}
