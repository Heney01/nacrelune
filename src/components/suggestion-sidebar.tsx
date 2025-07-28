"use client";

import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import type { Suggestion, SuggestCharmPlacementOutput } from '@/ai/flows/charm-placement-suggestions';
import { Lightbulb, Sparkles, WandSparkles, PlusCircle } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import Image from 'next/image';
import { Charm } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SuggestionSidebarProps {
  onApplySuggestion: (suggestion: Suggestion) => void;
  charms: Charm[];
  isMobile?: boolean;
  suggestions: SuggestCharmPlacementOutput | null;
  isLoading: boolean;
  error: string | null;
  onGenerate: (preferences: string) => void;
}

export function SuggestionSidebar({
  onApplySuggestion,
  charms,
  isMobile = false,
  suggestions,
  isLoading,
  error,
  onGenerate
}: SuggestionSidebarProps) {
  const [preferences, setPreferences] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(preferences);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    onApplySuggestion(suggestion);
  };

  return (
    <Card className={cn("h-full flex flex-col", isMobile && "border-0 shadow-none rounded-none")}>
      <CardHeader className={cn(isMobile && "py-4")}>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
          <WandSparkles className="text-primary" />
          Suggestions de l'IA
        </CardTitle>
        <CardDescription>
          Laissez notre IA vous aider à trouver l'emplacement parfait pour vos breloques.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="preferences" className="font-bold">Vos préférences (Facultatif)</Label>
            <Textarea
              id="preferences"
              placeholder="ex: 'J'aime les designs asymétriques' ou 'un look minimaliste'"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              className="mt-2"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading || charms.length === 0}>
            {isLoading ? 'Génération en cours...' : <> <Sparkles className="mr-2 h-4 w-4" /> Générer des idées</>}
          </Button>
        </form>
        <div className="flex-grow mt-4">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Oups! Un problème est survenu.</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {suggestions && (
             <div className="space-y-2">
              {suggestions.suggestions.map((suggestion, index) => {
                 const charm = charms.find(c => c.name === suggestion.charm);
                 return(
                  <Card 
                    key={index} 
                    className={`${suggestion.shouldIntegrate ? 'border-primary' : ''}`}
                  >
                    <div className="p-4 flex items-center gap-4">
                        {charm && <Image src={charm.imageUrl} alt={charm.name} width={40} height={40} className="border rounded-md p-1 bg-white" data-ai-hint="jewelry charm" />}
                        <div className="flex-1">
                          <CardTitle className="text-base font-headline">{suggestion.charm}</CardTitle>
                          <p className="text-sm text-muted-foreground">{suggestion.placementDescription}</p>
                          {suggestion.shouldIntegrate && <Badge variant="secondary" className="mt-2">Recommandé</Badge>}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleSuggestionClick(suggestion)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Ajouter
                        </Button>
                    </div>
                  </Card>
                 )
              })}
             </div>
          )}
           {!isLoading && !suggestions && !error && (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-4 border border-dashed rounded-lg">
                <Lightbulb className="w-10 h-10 mb-4" />
                <p>Vos suggestions créatives apparaîtront ici.</p>
            </div>
           )}
        </div>
      </CardContent>
    </Card>
  );
}