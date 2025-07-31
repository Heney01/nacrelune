
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
type PhotorealisticPreviewInput = z.infer<typeof PhotorealisticPreviewInputSchema>;

const PhotorealisticPreviewOutputSchema = z.object({
  imageDataUri: z.string().describe("The generated photorealistic image, as a data URI."),
});
type PhotorealisticPreviewOutput = z.infer<typeof PhotorealisticPreviewOutputSchema>;

const previewPrompt = `You will be provided with a reference image showing a digital design of a custom piece of jewelry. Your task is to generate a new, close-up photorealistic image of a person wearing that jewelry.

**Key requirements:**

1.  **Jewelry Type:** The jewelry item is a {{jewelryTypeName}}. It should be worn naturally on the appropriate body part (neck, wrist, or ear).
2.  **Faithful Replication:** You must faithfully replicate the number, type, and exact positions of the charms as shown in the reference image. The charms should be rendered as glossy or enameled three-dimensional objects, accurately sized and spaced.
3.  **Realism:** The overall image should look like a high-quality studio photograph suitable for a jewelry catalog. The lighting should be soft and even to enhance the material's texture and shine. The person's skin should appear realistic and well-lit.
4.  **Background:** The background should be neutral or softly blurred to maintain focus on the jewelry.
{{#if userPrompt}}
5. **User Context:** The user has provided additional context for the scene: "{{userPrompt}}". Please incorporate this into the image.
{{/if}}
`;


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
