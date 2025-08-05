

'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { getCreatorShowcaseData } from '@/lib/data';
import { CreationCard } from '@/components/creation-card';
import { notFound, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Heart, Clock } from 'lucide-react';
import { BrandLogo } from '@/components/icons';
import { CartWidget } from '@/components/cart-widget';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Creation, User as Creator } from '@/lib/types';
import Loading from '../../loading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


function CreatorShowcase({ creatorId, locale }: { creatorId: string; locale: string }) {
  const [data, setData] = useState<{ creator: Creator | null; creations: Creation[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'likes'>('date');
  const searchParams = useSearchParams();
  const creationIdFromUrl = searchParams.get('creation');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await getCreatorShowcaseData(creatorId);
      setData(result);
      setLoading(false);
    };
    fetchData();
  }, [creatorId]);
  
  const sortedCreations = useMemo(() => {
    if (!data?.creations) return [];
    
    const creationsCopy = [...data.creations];
    
    if (sortBy === 'likes') {
      return creationsCopy.sort((a, b) => b.likesCount - a.likesCount);
    }
    
    // Default to date sort
    return creationsCopy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data?.creations, sortBy]);

  if (loading) {
    return <Loading />;
  }

  if (!data?.creator) {
    notFound();
  }

  const { creator, creations } = data;
  const fallbackDisplayName = creator.displayName?.charAt(0) || creator.email?.charAt(0) || '?';

  return (
    <div className="flex flex-col min-h-screen bg-stone-50">
      <header className="p-4 border-b bg-white sticky top-0 z-20">
        <div className="container mx-auto flex justify-between items-center">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <BrandLogo className="h-8 w-auto text-foreground" />
          </Link>
          <div className="flex items-center gap-2">
            <CartWidget />
          </div>
        </div>
      </header>

      <main className="flex-grow p-4 md:p-8">
        <div className="container mx-auto">
          <div className="flex justify-start mb-8">
            <Button variant="ghost" asChild>
              <Link href={`/${locale}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à l'accueil
              </Link>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
            <Avatar className="h-16 w-16">
              <AvatarImage src={creator.photoURL || undefined} alt={creator.displayName || 'Avatar'} />
              <AvatarFallback className="text-2xl">{fallbackDisplayName.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Vitrine de</p>
              <h1 className="text-3xl font-headline">{creator.displayName}</h1>
            </div>
          </div>

          <Separator className="my-8" />
          
          <div className="mb-8">
            <Tabs value={sortBy} onValueChange={(value) => setSortBy(value as 'date' | 'likes')}>
              <TabsList>
                <TabsTrigger value="date"><Clock className="mr-2 h-4 w-4"/>Les plus récentes</TabsTrigger>
                <TabsTrigger value="likes"><Heart className="mr-2 h-4 w-4"/>Les plus populaires</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {sortedCreations.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {sortedCreations.map(creation => (
                <CreationCard 
                  key={creation.id} 
                  creation={creation} 
                  locale={locale}
                  openOnLoad={creation.id === creationIdFromUrl}
                  showCreator={false}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed rounded-lg">
              <h3 className="text-xl font-semibold">{creator.displayName} n'a pas encore publié de création.</h3>
              <p className="text-muted-foreground mt-2">Revenez bientôt !</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


export default function CreatorShowcasePage({ params }: { params: { creatorId: string; locale: string } }) {
  const { creatorId, locale } = params;

  return (
    <Suspense fallback={<Loading />}>
      <CreatorShowcase creatorId={creatorId} locale={locale} />
    </Suspense>
  )
}
