
"use client";

import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Lightbulb, Sparkles, WandSparkles, Loader2, PlusCircle, UploadCloud } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import Image from 'next/image';
import { Charm } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/hooks/use-translations';
import { Suggestion } from './editor';
import { ScrollArea } from './ui/scroll-area';
import { getCharmAnalysisSuggestionsAction } from '@/app/actions';

interface SuggestionSidebarProps {
  charms: Charm[];
  isMobile?: boolean;
  onGenerate: (preferences: string) => Promise<string | null>;
  isLoading: boolean;
  suggestions: Suggestion[];
  onApplySuggestion: (suggestion: Suggestion) => void;
}

export function SuggestionSidebar({
  charms,
  isMobile = false,
  onGenerate,
  isLoading,
  suggestions,
  onApplySuggestion,
}: SuggestionSidebarProps) {
  const [preferences, setPreferences] = useState('');
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('Editor');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errorMessage = await onGenerate(preferences);
    if (errorMessage) {
      if (errorMessage.includes("503") || errorMessage.includes("overloaded")) {
        setError("Le service d'IA est actuellement très demandé. Veuillez réessayer dans quelques instants.");
      } else {
        setError(errorMessage);
      }
    }
  };

  const handlePhotoAnalysis = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsAnalyzing(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async (event) => {
        const photoDataUri = event.target?.result as string;
        if (!photoDataUri) {
            setError("Impossible de lire le fichier image.");
            setIsAnalyzing(false);
            return;
        }

        setPhotoPreview(photoDataUri);

        try {
            const result = await getCharmAnalysisSuggestionsAction({
                photoDataUri: photoDataUri,
                allCharms: charms.map(c => c.name),
            });

            if (result.success && result.suggestions) {
                // This will use the parent component's state for suggestions
                const applySuggestions = await onGenerate(result.suggestions.join(', '));
                if(applySuggestions) setError(applySuggestions);
            } else {
                throw new Error(result.error || "Une erreur inconnue est survenue lors de l'analyse.");
            }
        } catch (error: any) {
            setError(error.message);
        } finally {
            setIsAnalyzing(false);
        }
    };
  }


  return (
    <Card className={cn("h-full flex flex-col", isMobile && "border-0 shadow-none rounded-none")}>
      <CardHeader className={cn(isMobile && "py-4")}>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
          <WandSparkles className="text-primary" />
          {t('ai_suggestions_title')}
        </CardTitle>
        <CardDescription>
          {t('ai_suggestions_description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4 min-h-0">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="preferences" className="font-bold">{t('preferences_label')}</Label>
            <Textarea
              id="preferences"
              placeholder={t('preferences_placeholder')}
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              className="mt-2"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading || charms.length === 0}>
             {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('generating_button')}</>
            ) : (
              <> <Sparkles className="mr-2 h-4 w-4" /> {t('generate_ideas_button')}</>
            )}
          </Button>
        </form>
        
        <div className="relative my-4">
            <div aria-hidden="true" className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">OU</span>
            </div>
        </div>

        <div className="space-y-2">
            <Label className="font-bold">Analyser une photo</Label>
            <Button variant="outline" className="w-full relative" asChild>
                <Label htmlFor="photo-upload" className="cursor-pointer">
                    {isAnalyzing ? (
                        <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyse en cours...</>
                    ): (
                        <> <UploadCloud className="mr-2 h-4 w-4" /> Importer une photo de collier</>
                    )}
                </Label>
            </Button>
            <input id="photo-upload" type="file" className="sr-only" onChange={handlePhotoAnalysis} accept="image/*" disabled={isAnalyzing} />
            {photoPreview && (
                <div className="mt-2 p-2 border rounded-md relative">
                    <p className="text-xs text-muted-foreground mb-2">Aperçu de la photo analysée :</p>
                    <Image src={photoPreview} alt="Aperçu de la photo" width={80} height={80} className="w-full h-auto object-contain rounded-md" />
                </div>
            )}
        </div>


        {error && (
            <Alert variant="destructive">
                <AlertTitle>{t('toast_error_title')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        <div className="flex-grow mt-4 min-h-0">
            {(isLoading || isAnalyzing) && (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}
            {!isLoading && !isAnalyzing && suggestions.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-4 border border-dashed rounded-lg">
                    <Lightbulb className="w-10 h-10 mb-4" />
                    <p>{t('suggestions_placeholder_title')}</p>
                </div>
            )}
             {!isLoading && !isAnalyzing && suggestions.length > 0 && (
                <ScrollArea className={cn("h-full", isMobile ? "h-[300px]" : "h-full")}>
                  <div className="space-y-4 pr-4">
                    {suggestions.map((suggestion, index) => {
                      const charm = charms.find(c => c.name === suggestion.charmName);
                      return (
                        <Card key={index} className="bg-muted/50">
                          <CardHeader className="pb-4">
                             <div className="flex items-start gap-4">
                              {charm && (
                                  <Image 
                                      src={charm.imageUrl} 
                                      alt={charm.name}
                                      width={40}
                                      height={40}
                                      className="rounded-md border bg-white p-1"
                                  />
                              )}
                              <div className="flex-grow">
                                  <CardTitle className="text-base">{suggestion.charmName}</CardTitle>
                                  <Badge variant="outline" className="mt-1 border-primary/50 text-primary bg-primary/10">{t('recommended_badge')}</Badge>
                              </div>
                             </div>
                          </CardHeader>
                          <CardContent className="pt-0 pb-4">
                            <p className="text-sm text-muted-foreground italic">"{suggestion.justification}"</p>
                          </CardContent>
                          <CardFooter>
                             <Button size="sm" className="w-full" onClick={() => onApplySuggestion(suggestion)}>
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Appliquer la suggestion
                             </Button>
                          </CardFooter>
                        </Card>
                      )
                    })}
                  </div>
                </ScrollArea>
             )}
        </div>
      </CardContent>
    </Card>
  );
}
