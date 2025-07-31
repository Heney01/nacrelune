
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

const previewPrompt = `You are an expert image generation AI with a specialized task. Your mission is to transform a 2D jewelry design into a photorealistic image of that jewelry being worn. You must follow the instructions with perfect precision.

### Context: The Reference Image
You will be provided with a reference image. This image is a simple 2D preview showing a flat representation of a {{jewelryTypeName}} with several charms placed on it. This reference image is the absolute source of truth for the design.

### Your Task: Transformation from 2D to 3D Photorealism

Your job is to create a single, high-quality, photorealistic studio photograph of this exact piece of jewelry, worn by a person.

### Step-by-Step Instructions (Mandatory):

1.  **Identify and Replicate:**
    *   Carefully examine the reference image. Identify **each and every charm** present.
    *   You MUST replicate **only** the charms you see in the reference image.
    *   Do NOT add, remove, or change any charms. The final image must contain the **exact same number and type of charms** as the reference.
    *   The relative positioning of the charms on the chain must be faithfully preserved.

2.  **Render in 3D:**
    *   Transform the flat, 2D charms into realistic, three-dimensional objects. They must have depth, texture, and reflect light correctly as if they were made of metal or enamel.
    *   Render the main chain or hoop as a realistic, high-quality metallic object.

3.  **Ensure Physical Realism:**
    *   Each charm is NOT a sticker. You must render a small, realistic metallic loop or bail that physically attaches each charm to the main chain.
    *   The charms must hang naturally from the chain, obeying the laws of gravity and following the curve of the model's body. They must not appear stiff or pasted on.

4.  **Compose the Final Photograph:**
    *   The jewelry is a {{jewelryTypeName}}. It must be worn naturally on the appropriate body part (neck, wrist, etc.).
    *   The final image must be a close-up studio photograph with soft, even lighting.
    *   The background must be neutral and clean (e.g., soft gray, marble, studio backdrop) to keep the focus entirely on the jewelry.
    {{#if userPrompt}}
    *   **User Context:** Incorporate this user-provided context into the scene: "{{userPrompt}}".
    {{/if}}

### Final Quality Check (Before Output):
Before generating the final image, verify:
- Does my result have the exact same charms as the reference image? Yes/No.
- Are the charms attached physically and hanging realistically? Yes/No.
- Is the overall image a high-quality, photorealistic photograph? Yes/No.
If the answer to any of these is No, you must restart your generation process to correct the errors.
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
