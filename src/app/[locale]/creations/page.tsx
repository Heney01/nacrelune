'use client';

import { useState, useEffect, useMemo } from 'react';
import { Creation } from '@/lib/types';
import { getAllCreations } from '@/lib/data';
import { CreationCard } from '@/components/creation-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Clock, Heart, Calendar } from 'lucide-react';
import Loading from '../loading';
import { BrandLogo } from '@/components/icons';
import { CartWidget } from '@/components/cart-widget';
import { UserNav } from '@/components/user-nav';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function AllCreationsPage({ params }: { params: { locale: string } }) {
  const [creations, setCreations] = useState<Creation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'likes'>('date');
  const [timeFilter, setTimeFilter] = useState<'all' | 'year' | 'month' | 'week'>('all');

  useEffect(() => {
    const fetchCreations = async () => {
      setLoading(true);
      const allCreations = await getAllCreations();
      setCreations(allCreations);
      setLoading(false);
    };
    fetchCreations();
  }, []);

  const sortedCreations = useMemo(() => {
    const now = new Date();
    
    let filtered = creations;

    if (timeFilter !== 'all') {
      filtered = creations.filter(creation => {
        const creationDate = new Date(creation.createdAt);
        switch (timeFilter) {
          case 'week':
            return creationDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          case 'month':
            return creationDate >= new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          case 'year':
            return creationDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    const creationsCopy = [...filtered];
    if (sortBy === 'likes') {
      return creationsCopy.sort((a, b) => b.likesCount - a.likesCount);
    }
    // Default to date sort
    return creationsCopy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [creations, sortBy, timeFilter]);

  if (loading) {
    return <Loading />;
  }

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
             <Tabs value={sortBy} onValueChange={(value) => setSortBy(value as 'date' | 'likes')}>
              <TabsList>
                <TabsTrigger value="date"><Clock className="mr-2 h-4 w-4"/>Les plus récentes</TabsTrigger>
                <TabsTrigger value="likes"><Heart className="mr-2 h-4 w-4"/>Les plus populaires</TabsTrigger>
              </TabsList>
            </Tabs>
             <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value as any)}>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {sortedCreations.map((creation) => (
              <CreationCard key={creation.id} creation={creation} locale={params.locale} showCreator={true} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
