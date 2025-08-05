'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Creation } from '@/lib/types';
import { getPaginatedCreations } from '@/lib/data';
import { getMoreCreations } from '@/app/actions/creation.actions';
import { CreationCard } from '@/components/creation-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Clock, Heart, Calendar, Loader2 } from 'lucide-react';
import Loading from '../loading';
import { BrandLogo } from '@/components/icons';
import { CartWidget } from '@/components/cart-widget';
import { UserNav } from '@/components/user-nav';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type SortByType = 'date' | 'likes';
type TimeFilterType = 'all' | 'year' | 'month' | 'week';

export default function AllCreationsPage({ params }: { params: { locale: string } }) {
  const [creations, setCreations] = useState<Creation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<SortByType>('date');
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('all');
  
  const loaderRef = useRef(null);
  
  const fetchInitialCreations = useCallback(async (sort: SortByType, time: TimeFilterType) => {
    setIsLoading(true);
    setCreations([]);
    setHasMore(true);
    try {
      const { creations: initialCreations, hasMore: initialHasMore } = await getPaginatedCreations({ sortBy: sort, timeFilter: time });
      setCreations(initialCreations);
      setHasMore(initialHasMore);
    } catch (error) {
      console.error("Failed to fetch initial creations:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchInitialCreations(sortBy, timeFilter);
  }, [sortBy, timeFilter, fetchInitialCreations]);

  const loadMoreCreations = useCallback(async () => {
    if (isLoadingMore || !hasMore || creations.length === 0) return;

    setIsLoadingMore(true);
    try {
      const lastCreation = creations[creations.length - 1];
      const cursor = sortBy === 'date' ? lastCreation.createdAt : lastCreation.likesCount;
      const cursorId = lastCreation.id;

      const { creations: newCreations, hasMore: newHasMore } = await getMoreCreations({ sortBy, timeFilter, cursor, cursorId });
      
      setCreations(prev => [...prev, ...newCreations]);
      setHasMore(newHasMore);
    } catch (error) {
      console.error("Failed to load more creations:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, creations, sortBy, timeFilter]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreCreations();
        }
      },
      { threshold: 1.0 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [loadMoreCreations]);


  return (
    <div className="flex flex-col min-h-screen bg-stone-50">
       <header className="p-4 border-b bg-white sticky top-0 z-20">
        <div className="container mx-auto flex justify-between items-center">
          <Link href={`/${params.locale}`} className="flex items-center gap-2">
            <BrandLogo className="h-8 w-auto text-foreground" />
          </Link>
          <div className="flex items-center gap-2">
            <CartWidget />
            <UserNav locale={params.locale} />
          </div>
        </div>
      </header>
      <main className="flex-grow p-4 md:p-8">
        <div className="container mx-auto">
          <div className="flex justify-start mb-8">
            <Button variant="ghost" asChild>
              <Link href={`/${params.locale}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à l'accueil
              </Link>
            </Button>
          </div>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-headline tracking-tight">Toutes les créations</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">Explorez l'ensemble des bijoux imaginés par notre communauté.</p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8">
             <Tabs value={sortBy} onValueChange={(value) => setSortBy(value as SortByType)}>
              <TabsList>
                <TabsTrigger value="date"><Clock className="mr-2 h-4 w-4"/>Les plus récentes</TabsTrigger>
                <TabsTrigger value="likes"><Heart className="mr-2 h-4 w-4"/>Les plus populaires</TabsTrigger>
              </TabsList>
            </Tabs>
             <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value as TimeFilterType)}>
              <SelectTrigger className="w-[200px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filtrer par période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Depuis toujours</SelectItem>
                <SelectItem value="year">Cette année</SelectItem>
                <SelectItem value="month">Ce mois-ci</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
              </SelectContent>
            </Select>
          </div>
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {creations.map((creation) => (
                        <CreationCard key={creation.id} creation={creation} locale={params.locale} showCreator={true} />
                        ))}
                    </div>
                    {hasMore && (
                        <div ref={loaderRef} className="flex justify-center items-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                    {!hasMore && creations.length > 0 && (
                        <p className="text-center text-muted-foreground py-8">Vous avez atteint la fin de la liste.</p>
                    )}
                    {!hasMore && creations.length === 0 && (
                         <p className="text-center text-muted-foreground py-8">Aucune création trouvée pour ces filtres.</p>
                    )}
                </>
            )}
        </div>
      </main>
    </div>
  );
}
