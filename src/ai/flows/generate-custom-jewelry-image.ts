
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
    // 1. Convert all images to data URIs in parallel
    const [modelImageUri, ...charmImageUris] = await Promise.all([
      toDataURI(input.modelImage),
      ...input.charms.map(c => toDataURI(c.imageUrl))
    ]);

    // 2. Construct the prompt
    let textPrompt = `Generate a single, coherent, photorealistic image of a custom piece of jewelry being worn on a person's neck.
The base jewelry model is a "${input.modelName}". I have provided an image of it for reference.
It should be adorned with the charms I have also provided as images. Integrate them aesthetically onto the base model.
DO NOT invent or add any charms or elements that are not in the provided images.
The final image should look like a professional, close-up product photo from a luxury brand's website, focusing on the jewelry against the skin. The lighting should be soft and flattering.`;

    const promptParts: (string | { media: { url: string; }; } | { text: string; })[] = [
      { text: textPrompt },
      { media: { url: modelImageUri } },
      ...charmImageUris.map(url => ({ media: { url } }))
    ];
    
    // 3. Call the generation model
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: promptParts,
      config: {
        responseModalities: ['IMAGE'],
      },
    });
    
    if (!media || !media.url) {
      throw new Error('Image generation failed to return a data URL.');
    }

    return { imageUrl: media.url };
  }
);
