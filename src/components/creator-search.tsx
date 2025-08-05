
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useDebounce } from '@/hooks/use-debounce';
import { searchCreators } from '@/app/actions/creation.actions';
import { Input } from '@/components/ui/input';
import { Loader2, Search, User } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useTranslations } from '@/hooks/use-translations';
import type { User as Creator } from '@/lib/types';
import { Card, CardContent } from './ui/card';

export function CreatorSearch({ locale }: { locale: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const t = useTranslations('HomePage');

  const performSearch = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    const { success, creators } = await searchCreators(term);
    if (success && creators) {
      setResults(creators);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    performSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, performSearch]);

  const fallbackDisplayName = (creator: Creator) => creator.displayName?.charAt(0) || creator.email?.charAt(0) || '?';

  return (
    <section>
        <div className="relative max-w-lg mx-auto">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={t('creator_search_placeholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    className="pl-9"
                />
                {isLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
            </div>

            {isFocused && (searchTerm.length > 1) && (
                <div className="absolute top-full mt-2 w-full z-10">
                    <Card>
                        <CardContent className="p-2 max-h-60 overflow-y-auto">
                            {!isLoading && results.length === 0 && (
                                <p className="p-4 text-center text-sm text-muted-foreground">{t('no_creators_found')}</p>
                            )}
                            {results.map((creator) => (
                                <Link
                                    key={creator.uid}
                                    href={`/${locale}/creators/${creator.uid}`}
                                    className="block p-2 rounded-md hover:bg-muted"
                                    onClick={() => setNavigatingTo(creator.uid)}
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={creator.photoURL || undefined} alt={creator.displayName || 'Avatar'} />
                                            <AvatarFallback>{fallbackDisplayName(creator).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex items-center justify-between flex-grow">
                                            <span className="font-medium">{creator.displayName}</span>
                                            {navigatingTo === creator.uid && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    </section>
  );
}
