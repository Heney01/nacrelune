
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
  imageUrl: z.string().describe("A public URL to the charm's image."),
  position: z.object({
    x: z.number().describe('The x-coordinate percentage.'),
    y: z.number().describe('The y-coordinate percentage.'),
  }).describe('The position of the charm on the jewelry model.'),
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

const generatePrompt = (modelName: string, modelImageUri: string, charmsWithUris: {name: string, imageUrl: string, position: {x: number, y: number}}[]) => {
    const promptParts: any[] = [
        {
            text: `You are a professional jewelry photographer. Your task is to generate a realistic, high-quality image of a custom piece of jewelry being worn on a person's neck.

The base jewelry model is "${modelName}". The image for this base model is provided first.
`,
        },
        { media: { url: modelImageUri } },
        {
            text: `
The following charms have been added to the jewelry. You MUST place each charm on the model according to its specified position. The (x, y) coordinates are percentages of the base model image's dimensions, starting from the top-left corner. You must use these coordinates as precise anchor points.

Each charm is provided with its name, its position, and its corresponding image.
`
        }
    ];

    if (charmsWithUris.length === 0) {
        promptParts.push({text: "\n- No charms added. Just create a beautiful shot of the base model."});
    } else {
        charmsWithUris.forEach((charm) => {
            promptParts.push({text: `\n- Charm: "${charm.name}", Position: (x: ${charm.position.x.toFixed(2)}%, y: ${charm.position.y.toFixed(2)}%)`});
            promptParts.push({media: {url: charm.imageUrl}});
        });
    }

    promptParts.push({
        text: `
Generate a single, coherent, photorealistic image of the final piece of jewelry. The photo should be a close-up, focusing on the jewelry against the skin and collarbone. The lighting should be professional and highlight the details of the jewelry. The final image should look like a product photo from a luxury brand's website.`
    });

    return promptParts;
};


const generateCustomJewelryImageFlow = ai.defineFlow(
  {
    name: 'generateCustomJewelryImageFlow',
    inputSchema: GenerateCustomJewelryImageInputSchema,
    outputSchema: GenerateCustomJewelryImageOutputSchema,
  },
  async (input) => {
    // Convert all URLs to data URIs on the server
    const modelImageUri = await toDataURI(input.modelImage);
    const charmsWithUris = await Promise.all(
        input.charms.map(async (charm) => ({
            ...charm,
            imageUrl: await toDataURI(charm.imageUrl),
        }))
    );

    const prompt = generatePrompt(input.modelName, modelImageUri, charmsWithUris);
    
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });
    
    if (!media.url) {
      throw new Error('Image generation failed to return a data URL.');
    }

    return { imageUrl: media.url };
  }
);
