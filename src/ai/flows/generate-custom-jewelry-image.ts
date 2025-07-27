
'use server';

/**
 * @fileOverview A custom jewelry image generation AI agent.
 *
 * - generateCustomJewelryImage - A function that generates an image of the customized jewelry.
 * - GenerateCustomJewelryImageInput - The input type for the generateCustomJewelryImage function.
 * - GenerateCustomJewelryImageOutput - The return type for the generateCustomJewelryImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Helper to convert an image URL to a data URI on the server
async function toDataURI(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image ${url}: ${response.statusText}`);
  }
  const blob = await response.blob();
  const buffer = Buffer.from(await blob.arrayBuffer());
  return `data:${blob.type};base64,${buffer.toString('base64')}`;
}

const CharmInputSchema = z.object({
  name: z.string().describe('The name of the charm.'),
  // The following fields are not used by the new prompt, 
  // but we keep them for potential future use and to avoid breaking the client-side call.
  imageUrl: z.string(), 
  position: z.object({ x: z.number(), y: z.number() }),
});

const GenerateCustomJewelryImageInputSchema = z.object({
  modelName: z.string().describe('The name of the jewelry model.'),
  modelImage: z.string().describe("A public URL to the jewelry model's image."),
  charms: z.array(CharmInputSchema).describe('The charms placed on the model.'),
  locale: z.string().optional().describe('The locale for the response language (e.g., "en", "fr").'),
});
export type GenerateCustomJewelryImageInput = z.infer<typeof GenerateCustomJewelryImageInputSchema>;

const GenerateCustomJewelryImageOutputSchema = z.object({
  imageUrl: z.string().describe('The data URI of the generated image.'),
});
export type GenerateCustomJewelryImageOutput = z.infer<typeof GenerateCustomJewelryImageOutputSchema>;

export async function generateCustomJewelryImage(input: GenerateCustomJewelryImageInput): Promise<GenerateCustomJewelryImageOutput> {
  return generateCustomJewelryImageFlow(input);
}

const generateCustomJewelryImageFlow = ai.defineFlow(
  {
    name: 'generateCustomJewelryImageFlow',
    inputSchema: GenerateCustomJewelryImageInputSchema,
    outputSchema: GenerateCustomJewelryImageOutputSchema,
  },
  async (input) => {
    const modelImageUri = await toDataURI(input.modelImage);

    const charmNames = input.charms.map(c => c.name).join(', ');

    let textPrompt = `Generate a single, coherent, photorealistic image of a custom piece of jewelry being worn on a person's neck.
The base jewelry model is a "${input.modelName}".
It is adorned with the following charms: ${charmNames || 'no charms'}.
The photo should be a close-up, focusing on the jewelry against the skin and collarbone. The lighting should be professional and highlight the details of the jewelry. The final image should look like a product photo from a luxury brand's website.
Refer to the provided image for the style of the base jewelry model.`;

    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        { media: { url: modelImageUri } },
        { text: textPrompt },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });
    
    if (!media || !media.url) {
      throw new Error('Image generation failed to return a data URL.');
    }

    return { imageUrl: media.url };
  }
);
