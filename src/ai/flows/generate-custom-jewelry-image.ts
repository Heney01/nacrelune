
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

const CharmInputSchema = z.object({
  name: z.string().describe('The name of the charm.'),
  imageUrl: z.string().describe("A data URI of the charm's image."),
  position: z.object({
    x: z.number().describe('The x-coordinate percentage.'),
    y: z.number().describe('The y-coordinate percentage.'),
  }).describe('The position of the charm on the jewelry model.'),
});

const GenerateCustomJewelryImageInputSchema = z.object({
  modelName: z.string().describe('The name of the jewelry model.'),
  modelImage: z.string().describe("A data URI of the jewelry model's image."),
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

const generatePrompt = (input: GenerateCustomJewelryImageInput) => {
    let promptText = `You are a professional jewelry photographer. Your task is to generate a realistic, high-quality image of a custom piece of jewelry.

Base Jewelry Model: ${input.modelName}
The base image for the model is provided.

The following charms have been added to the jewelry. You MUST place them on the model according to their specified positions (x, y percentages from the top-left corner of the image). The charms are provided with their names and images.

Charms:
`;

    if (input.charms.length === 0) {
        promptText += "- No charms added. Just create a beautiful shot of the base model.";
    } else {
        input.charms.forEach(charm => {
            promptText += `- Charm: "${charm.name}", Position: (x: ${charm.position.x.toFixed(2)}%, y: ${charm.position.y.toFixed(2)}%)\n`;
        });
    }

    promptText += `
Generate a single, coherent, photorealistic image of the final piece of jewelry on a clean, elegant, neutral background (like light gray, off-white, or a soft texture). The lighting should be professional and highlight the details of the jewelry. The final image should look like a product photo from a luxury brand's website.`;

    const promptParts: any[] = [{ text: promptText }, { media: { url: input.modelImage } }];
    input.charms.forEach(charm => {
        promptParts.push({ media: { url: charm.imageUrl } });
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
    const prompt = generatePrompt(input);
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
