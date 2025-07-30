
'use server';

/**
 * @fileOverview Un agent IA pour suggérer le placement de breloques sur des bijoux.
 *
 * - getCharmSuggestions: Une fonction qui gère le processus de suggestion de placement de breloques.
 * - CharmSuggestionInput: Le type d'entrée pour la fonction getCharmSuggestions.
 * - CharmSuggestionOutput: Le type de retour pour la fonction getCharmSuggestions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {googleAI} from '@genkit-ai/googleai';


const CharmSuggestionInputSchema = z.object({
  jewelryType: z.string().describe('Le type de bijou (ex: "collier", "bracelet").'),
  existingCharms: z.array(z.string()).describe('La liste des noms des breloques déjà placées sur le bijou.'),
  allCharms: z.array(z.string()).describe('La liste de toutes les breloques disponibles que l\'IA peut suggérer.'),
  userPreferences: z.string().optional().describe('Les préférences de style de l\'utilisateur (ex: "minimaliste", "chargé", "asymétrique").'),
});
export type CharmSuggestionInput = z.infer<typeof CharmSuggestionInputSchema>;

const CharmSuggestionOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      charmName: z.string().describe('Le nom de la breloque à placer.'),
      position: z.object({
        x: z.number().describe('La coordonnée X en pourcentage (de 0 à 100) depuis le bord gauche.'),
        y: z.number().describe('La coordonnée Y en pourcentage (de 0 à 100) depuis le bord supérieur.'),
      }),
      justification: z.string().describe('Une courte explication (1-2 phrases) de la raison pour laquelle cette suggestion est bonne.'),
    })
  ).describe('Une liste de 3 à 5 suggestions de placement de breloques.'),
});
export type CharmSuggestionOutput = z.infer<typeof CharmSuggestionOutputSchema>;


const placementPrompt = ai.definePrompt({
  name: 'charmPlacementPrompt',
  input: { schema: CharmSuggestionInputSchema },
  output: { schema: CharmSuggestionOutputSchema },
  model: googleAI.model('gemini-1.5-pro'),
  prompt: `Tu es un expert en design de bijoux pour un atelier de création personnalisée.
Ton rôle est de suggérer des emplacements créatifs et esthétiques pour des breloques sur un bijou.

Voici la situation actuelle :
- Type de bijou : {{{jewelryType}}}
- Breloques déjà placées : {{#if existingCharms}}{{#each existingCharms}} - {{{this}}} {{/each}}{{else}}Aucune{{/if}}
- Préférences de l'utilisateur : {{{userPreferences}}}

Voici la liste complète des breloques disponibles que tu peux suggérer :
{{#each allCharms}} - {{{this}}}
{{/each}}

Ta tâche :
Propose une liste de 3 à 5 suggestions de placement de breloques. Pour chaque suggestion :
1.  Choisis une breloque pertinente dans la liste des breloques disponibles. Ne suggère pas une breloque qui est déjà placée.
2.  Détermine des coordonnées (x, y) en pourcentage pour son placement. L'origine (0,0) est en haut à gauche du canevas de l'éditeur. Le centre approximatif est (50,50). Pense à la manière dont les bijoux sont portés pour suggérer des placements naturels (par exemple, pour un collier, les breloques sont généralement sur la moitié inférieure).
3.  Fournis une brève justification pour ton choix, en expliquant pourquoi cela créerait un design harmonieux ou intéressant. Tiens compte des préférences de l'utilisateur et des breloques déjà présentes.
`,
});

const suggestCharmPlacementFlow = ai.defineFlow(
  {
    name: 'suggestCharmPlacementFlow',
    inputSchema: CharmSuggestionInputSchema,
    outputSchema: CharmSuggestionOutputSchema,
  },
  async (input) => {
    const llmResponse = await placementPrompt(input);
    const output = llmResponse.output();

    if (!output) {
      console.error('[AI FLOW] LLM returned no output.');
      throw new Error("L'IA n'a retourné aucune suggestion.");
    }
    
    return output;
  }
);


export async function getCharmSuggestions(input: CharmSuggestionInput): Promise<CharmSuggestionOutput> {
  return suggestCharmPlacementFlow(input);
}
