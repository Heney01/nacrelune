
'use server';

/**
 * @fileOverview An AI agent for generating photorealistic previews of jewelry.
 *
 * - generatePhotorealisticPreview: A function that handles the image generation process.
 * - PhotorealisticPreviewInput: The input type for the function.
 * - PhotorealisticPreviewOutput: The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PhotorealisticPreviewInputSchema = z.object({
  designPreviewDataUri: z
    .string()
    .describe(
      "A preview image of the user's jewelry design, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  jewelryTypeName: z.string().describe('The type of jewelry (e.g., "necklace", "bracelet").'),
  userPrompt: z.string().optional().describe('Optional user prompt for additional context (e.g., "on a beach", "in a gift box").')
});
export type PhotorealisticPreviewInput = z.infer<typeof PhotorealisticPreviewInputSchema>;

const PhotorealisticPreviewOutputSchema = z.object({
  imageDataUri: z.string().describe("The generated photorealistic image, as a data URI."),
});
export type PhotorealisticPreviewOutput = z.infer<typeof PhotorealisticPreviewOutputSchema>;

const previewPrompt = `Generate a photorealistic image of a custom piece of jewelry.

**Instructions:**
1.  The user's design is provided as an image. This is the primary reference for the jewelry's appearance, including the model and the arrangement of charms.
2.  **IMPORTANT**: The charms in the provided design image are flat, 2D representations. In the generated photorealistic image, these charms should be rendered as realistic, three-dimensional metallic or enameled objects, matching their appearance. Give them volume, texture, and realistic reflections.
3.  The jewelry type is a {{jewelryTypeName}}.
4.  Generate an image that looks like a real photograph. It should be high-quality, suitable for a product catalog.
5.  Place the jewelry in an elegant, neutral setting (e.g., on a soft fabric, a marble surface, or a simple wooden stand).
6.  Ensure the lighting is professional and highlights the details of the charms and the jewelry model.
{{#if userPrompt}}
7. The user has provided additional context: "{{userPrompt}}". Incorporate this into the scene.
{{/if}}`;


const generatePhotorealisticPreviewFlow = ai.defineFlow(
  {
    name: 'generatePhotorealisticPreviewFlow',
    inputSchema: PhotorealisticPreviewInputSchema,
    outputSchema: PhotorealisticPreviewOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        { text: previewPrompt },
        { media: { url: input.designPreviewDataUri } }
      ],
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    });

    const generatedImage = media.url;
    if (!generatedImage) {
      throw new Error('Image generation failed to produce an output.');
    }
    
    return { imageDataUri: generatedImage };
  }
);


export async function generatePhotorealisticPreview(input: PhotorealisticPreviewInput): Promise<PhotorealisticPreviewOutput> {
  return generatePhotorealisticPreviewFlow(input);
}
