
'use server';

import { getCharmSuggestions as getCharmSuggestionsFlow, CharmSuggestionInput, CharmSuggestionOutput } from '@/ai/flows/charm-placement-suggestions';
import { getCharmAnalysisSuggestions as getCharmAnalysisSuggestionsFlow, CharmAnalysisSuggestionInput, CharmAnalysisSuggestionOutput } from '@/ai/flows/charm-analysis-suggestions';
import { getCharmDesignCritique as getCharmDesignCritiqueFlow, CharmDesignCritiqueInput, CharmDesignCritiqueOutput } from '@/ai/flows/charm-design-critique';
import { generateShareContent as generateShareContentFlow, GenerateShareContentInput, GenerateShareContentOutput } from '@/ai/flows/share-content-generation';
import { getCharms as fetchCharms } from '@/lib/data';
import type { Charm } from '@/lib/types';


export async function getCharmSuggestionsAction(input: CharmSuggestionInput): Promise<{
    success: boolean;
    suggestions?: CharmSuggestionOutput['suggestions'];
    error?: string;
}> {
    try {
        console.log('[SERVER ACTION] Calling getCharmSuggestionsFlow with input:', input);
        const result = await getCharmSuggestionsFlow(input);
        return { success: true, suggestions: result.suggestions };
    } catch (error: any) {
        console.error('[SERVER ACTION] Error calling AI flow:', error);
        return { success: false, error: error.message || "Une erreur est survenue lors de la génération des suggestions." };
    }
}

export async function getCharmAnalysisSuggestionsAction(input: CharmAnalysisSuggestionInput): Promise<{
    success: boolean;
    suggestions?: CharmAnalysisSuggestionOutput['suggestions'];
    error?: string;
}> {
    try {
        console.log('[SERVER ACTION] Calling getCharmAnalysisSuggestionsFlow');
        const result = await getCharmAnalysisSuggestionsFlow(input);
        return { success: true, suggestions: result.suggestions };
    } catch (error: any) {
        console.error('[SERVER ACTION] Error calling AI analysis flow:', error);
        return { success: false, error: error.message || "Une erreur est survenue lors de l'analyse de l'image." };
    }
}

export async function getCharmDesignCritiqueAction(input: CharmDesignCritiqueInput): Promise<{
    success: boolean;
    critique?: string;
    error?: string;
}> {
    try {
        console.log('[SERVER ACTION] Calling getCharmDesignCritiqueFlow');
        const result = await getCharmDesignCritiqueFlow(input);
        return { success: true, critique: result.critique };
    } catch (error: any) {
        console.error('[SERVER ACTION] Error calling AI critique flow:', error);
        return { success: false, error: error.message || "Une erreur est survenue lors de l'analyse." };
    }
}

export async function generateShareContentAction(input: GenerateShareContentInput): Promise<{
    success: boolean;
    content?: GenerateShareContentOutput;
    error?: string;
}> {
    try {
        console.log('[SERVER ACTION] Calling generateShareContentFlow');
        const result = await generateShareContentFlow(input);
        return { success: true, content: result };
    } catch (error: any) {
        console.error('[SERVER ACTION] Error calling AI share content flow:', error);
        return { success: false, error: error.message || "Une erreur est survenue lors de la génération du contenu." };
    }
}


export async function getRefreshedCharms(): Promise<{ success: boolean; charms?: Charm[], error?: string; }> {
    try {
        const charms = await fetchCharms();
        return { success: true, charms };
    } catch (error: any) {
        console.error('[SERVER ACTION] Error refreshing charms:', error);
        return { success: false, error: error.message || "Une erreur est survenue lors du rafraîchissement des breloques." };
    }
}

    
