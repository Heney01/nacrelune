"use client";

import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { getCharmSuggestions } from '@/app/actions';
import type { SuggestCharmPlacementOutput } from '@/ai/flows/charm-placement-suggestions';
import { CHARMS } from '@/lib/data';
import { Lightbulb, Sparkles, WandSparkles } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import Image from 'next/image';
import { Charm } from '@/lib/types';

interface SuggestionSidebarProps {
  jewelryType: string;
  modelDescription: string;
  onAddCharm: (charm: Charm) => void;
}

export function SuggestionSidebar({ jewelryType, modelDescription, onAddCharm }: SuggestionSidebarProps) {
  const [preferences, setPreferences] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestCharmPlacementOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuggestions(null);

    try {
      const result = await getCharmSuggestions({
        jewelryType,
        modelDescription,
        charmOptions: CHARMS.map(c => c.name),
        userPreferences: preferences,
      });
      setSuggestions(result);
    } catch (err) {
      setError('An error occurred while generating suggestions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (charmName: string) => {
    const charm = CHARMS.find(c => c.name === charmName);
    if (charm) {
      onAddCharm(charm);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
          <WandSparkles className="text-accent" />
          AI Suggestions
        </CardTitle>
        <CardDescription>
          Let our AI help you find the perfect placement for your charms.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="preferences" className="font-bold">Your Preferences (Optional)</Label>
            <Textarea
              id="preferences"
              placeholder="e.g., 'I like asymmetrical designs' or 'a minimalist look'"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              className="mt-2"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Generating...' : <> <Sparkles className="mr-2 h-4 w-4" /> Generate Ideas</>}
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
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {suggestions && (
             <div className="space-y-4">
              {suggestions.suggestions.map((suggestion, index) => {
                 const charm = CHARMS.find(c => c.name === suggestion.charm);
                 return(
                  <Card 
                    key={index} 
                    className={`cursor-pointer hover:shadow-md transition-shadow ${suggestion.shouldIntegrate ? 'border-primary' : ''}`}
                    onClick={() => handleSuggestionClick(suggestion.charm)}
                  >
                    <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-4">
                        {charm && <Image src={charm.imageUrl} alt={charm.name} width={40} height={40} className="border rounded-md p-1" data-ai-hint="jewelry charm" />}
                        <div className="flex-1">
                          <CardTitle className="text-base font-headline">{suggestion.charm}</CardTitle>
                          <p className="text-sm text-muted-foreground">{suggestion.placementDescription}</p>
                        </div>
                        {suggestion.shouldIntegrate && <Badge variant="secondary">Recommended</Badge>}
                    </CardHeader>
                  </Card>
                 )
              })}
             </div>
          )}
           {!isLoading && !suggestions && !error && (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-4 border border-dashed rounded-lg">
                <Lightbulb className="w-10 h-10 mb-4" />
                <p>Your creative suggestions will appear here.</p>
            </div>
           )}
        </div>
      </CardContent>
    </Card>
  );
}
