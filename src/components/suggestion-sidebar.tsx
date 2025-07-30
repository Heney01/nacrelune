
"use client";

import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Lightbulb, Sparkles, WandSparkles } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import Image from 'next/image';
import { Charm } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/hooks/use-translations';

interface SuggestionSidebarProps {
  charms: Charm[];
  isMobile?: boolean;
}

export function SuggestionSidebar({
  charms,
  isMobile = false,
}: SuggestionSidebarProps) {
  const [preferences, setPreferences] = useState('');
  const t = useTranslations('Editor');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // AI generation logic is removed.
  };


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
      <CardContent className="flex-grow flex flex-col gap-4">
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
          <Button type="submit" className="w-full" disabled={true || charms.length === 0}>
            <> <Sparkles className="mr-2 h-4 w-4" /> {t('generate_ideas_button')}</>
          </Button>
        </form>
        <div className="flex-grow mt-4">
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full p-4 border border-dashed rounded-lg">
                <Lightbulb className="w-10 h-10 mb-4" />
                <p>{t('suggestions_placeholder_title')}</p>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
