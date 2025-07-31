
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

const previewPrompt = `You are a professional jewelry photographer AI. Your task is to create a stunning, photorealistic studio image of a piece of jewelry worn by a person, based on a provided reference design image.

**Reference Image:**
You will be given a simple digital reference image showing a piece of jewelry (a chain or hoop) with several flat, 2D charms placed on it. This reference dictates the *type* and *position* of the charms.

**Critical Instructions - How to interpret the reference:**
1.  **From 2D to 3D:** You MUST transform the flat 2D charms from the reference image into realistic, three-dimensional metallic or enameled objects. They should have depth, texture, and reflect light correctly.
2.  **Physical Attachment:** The charms are NOT stickers. Each charm must be physically and believably attached to the main jewelry chain or hoop, typically with a small, realistic metallic loop or bail.
3.  **Natural Draping:** The charms must hang naturally from the chain, following the laws of gravity and the curve of the body. They should not appear stiff or pasted on.
4.  **Realistic Chain:** The main chain or hoop itself must also be rendered as a realistic, high-quality metallic object.

**Overall Scene Requirements:**
-   **Jewelry Type:** The item is a {{jewelryTypeName}}. It must be worn naturally on the appropriate body part.
-   **Faithful Replication:** The number, type, and relative positions of the charms must be accurately replicated from the reference image.
-   **Photorealism:** The final output must be a high-quality, close-up studio photograph. Lighting should be soft and even, highlighting the materials' textures (metal, enamel). The model's skin should be realistic and well-lit.
-   **Background:** Use a neutral, clean, or softly blurred background (like a marble surface, a soft fabric, or a simple studio backdrop) to ensure the jewelry is the main focus.
{{#if userPrompt}}
- **User Context:** Incorporate this user-provided context into the scene: "{{userPrompt}}".
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
