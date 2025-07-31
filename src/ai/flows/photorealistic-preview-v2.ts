
'use server';

/**
 * @fileOverview An AI agent for generating photorealistic previews of jewelry (V2).
 * This version uses a structured, coordinate-based approach for placing charms.
 *
 * - generatePhotorealisticPreviewV2: A function that handles the image generation process.
 * - PhotorealisticPreviewV2Input: The input type for the function.
 * - PhotorealisticPreviewV2Output: The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CharmPlacementSchema = z.object({
  charmName: z.string().describe('The name of the charm.'),
  charmImageUri: z.string().describe('The data URI of the charm\'s image.'),
  position: z.object({
    x: z.number().describe('The X coordinate in percentage (0-100) from the left edge.'),
    y: z.number().describe('The Y coordinate in percentage (0-100) from the top edge.'),
  }),
});

export const PhotorealisticPreviewV2InputSchema = z.object({
  baseJewelryImageUri: z.string().describe(
    "The data URI of the base jewelry image (necklace, bracelet, etc.)."
  ),
  jewelryTypeName: z.string().describe('The type of jewelry (e.g., "necklace", "bracelet").'),
  charms: z.array(CharmPlacementSchema).describe('An array of charms to be placed on the jewelry.'),
  userPrompt: z.string().optional().describe('Optional user prompt for additional context (e.g., "on a beach", "in a gift box").')
});
export type PhotorealisticPreviewV2Input = z.infer<typeof PhotorealisticPreviewV2InputSchema>;

export const PhotorealisticPreviewV2OutputSchema = z.object({
  imageDataUri: z.string().describe("The generated photorealistic image, as a data URI."),
});
export type PhotorealisticPreviewV2Output = z.infer<typeof PhotorealisticPreviewV2OutputSchema>;

const previewPrompt = `
You are a master digital artist specializing in creating photorealistic images for a high-end jewelry catalog. Your task is to compose a single, stunning studio photograph based on a set of provided assets and precise placement instructions.

### Your Mission: Create a Flawless Jewelry Photograph

You will be given a base image of a jewelry piece (like a necklace or bracelet) and a list of individual charm images with their exact coordinates. You must combine these elements into one cohesive, photorealistic image of a person wearing the final, assembled piece of jewelry.

### Step-by-Step Instructions (Mandatory):

1.  **Analyze the Base Image:**
    *   You are provided with a base image of a \`{{jewelryTypeName}}\`. This is your canvas.
    *   Render this base jewelry piece realistically, worn by a person on the appropriate body part (neck for a necklace, wrist for a bracelet, etc.). The final image must look like a high-quality studio photograph.

2.  **Process and Place Each Charm:**
    *   You will receive a list of charms to place on the jewelry. For each charm in the list, you must perform the following actions:
        *   **Examine the Charm Image:** Look at the provided image for the charm named \`{{this.charmName}}\`.
        *   **Transform to 3D:** Render this charm as a realistic, three-dimensional object with proper texture, depth, and lighting. It should look like it's made of high-quality metal or enamel, not a flat sticker.
        *   **Attach Physically:** Create a small, realistic metallic loop (a bail) that physically attaches the charm to the base chain. This is critical. The charm must not look like it's floating or pasted on.
        *   **Position with Precision:** Place the center of the charm at the exact coordinates specified: **x: {{this.position.x}}%** and **y: {{this.position.y}}%**. The origin (0,0) is the top-left corner of the image. The charm must hang naturally from this point, respecting gravity.

3.  **Compose the Final Image:**
    *   Ensure all placed charms appear naturally on the jewelry, following the curve of the model's body.
    *   The lighting must be consistent across the entire scene—the model, the base jewelry, and all the charms must be lit from the same source. Use soft, even studio lighting.
    *   The background must be neutral and clean (e.g., soft gray, marble, studio backdrop) to keep the focus entirely on the jewelry.
    {{#if userPrompt}}
    *   **User Context:** Incorporate this user-provided context into the scene: "{{userPrompt}}".
    {{/if}}

4.  **Final Quality Check:**
    *   Before outputting, verify:
        *   Have I placed exactly the number of charms provided in the list? Yes/No.
        *   Is each charm rendered as a 3D object and attached physically with a loop? Yes/No.
        *   Is the final image a single, cohesive, high-quality photograph? Yes/No.
    *   If the answer to any of these is No, you must restart your generation process to correct the errors. Your output must be perfect.

### Image Assets and Placement Data:

-   **Base Jewelry Image:** {{media url=baseJewelryImageUri}}
-   **Charms to Place:**
    {{#each charms}}
    -   **Charm:** \`{{this.charmName}}\`
    -   **Image:** {{media url=this.charmImageUri}}
    -   **Position:** (x: {{this.position.x}}%, y: {{this.position.y}}%)
    {{/each}}
`;


const generatePhotorealisticPreviewV2Flow = ai.defineFlow(
  {
    name: 'generatePhotorealisticPreviewV2Flow',
    inputSchema: PhotorealisticPreviewV2InputSchema,
    outputSchema: PhotorealisticPreviewV2OutputSchema,
  },
  async (input) => {
    
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        { text: previewPrompt },
        // Although the prompt template references the images,
        // we may still need to provide them in the parts array for the model to "see" them.
        // Let's include the base image. Charm images are numerous, let's see if the model can get them from the prompt.
        { media: { url: input.baseJewelryImageUri } }
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


export async function generatePhotorealisticPreviewV2(input: PhotorealisticPreviewV2Input): Promise<PhotorealisticPreviewV2Output> {
  return generatePhotorealisticPreviewV2Flow(input);
}
