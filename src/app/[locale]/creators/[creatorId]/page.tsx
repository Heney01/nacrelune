

'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { getCreatorShowcaseData } from '@/lib/data';
import { CreationCard } from '@/components/creation-card';
import { notFound, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Heart, Clock, Settings, Award } from 'lucide-react';
import { BrandLogo } from '@/components/icons';
import { CartWidget } from '@/components/cart-widget';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Creation, User as Creator } from '@/lib/types';
import Loading from '../../loading';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/hooks/use-auth';
import { UserNav } from '@/components/user-nav';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useTranslations } from '@/hooks/use-translations';

function CreatorShowcase({ creatorId, locale }: { creatorId: string; locale: string }) {
  const [data, setData] = useState<{ creator: Creator | null; creations: Creation[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'likes'>('date');
  const searchParams = useSearchParams();
  const creationIdFromUrl = searchParams.get('creation');
  const { user, firebaseUser } = useAuth();
  const tAuth = useTranslations('Auth');
  
  const isOwner = firebaseUser?.uid === creatorId;

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
            <UserNav locale={locale} />
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

          <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
            <Avatar className="h-20 w-20">
              <AvatarImage src={creator.photoURL || undefined} alt={creator.displayName || 'Avatar'} />
              <AvatarFallback className="text-3xl">{fallbackDisplayName.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-grow text-center sm:text-left">
              <p className="text-sm text-muted-foreground">{isOwner ? "Votre vitrine publique" : `Vitrine de`}</p>
              <h1 className="text-3xl font-headline">{creator.displayName}</h1>
            </div>
             {isOwner && (
                <div className="flex items-center gap-4 self-center">
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="flex items-center gap-2 text-primary font-bold bg-primary/10 px-3 py-1.5 rounded-full cursor-pointer hover:bg-primary/20 transition-colors">
                                <Award className="h-5 w-5"/>
                                <span>{user?.rewardPoints || 0} Points</span>
                            </div>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{tAuth('reward_points_title')}</DialogTitle>
                                <DialogDescription>{tAuth('reward_points_description')}</DialogDescription>
                            </DialogHeader>
                            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground mt-4">
                                <li>{tAuth('reward_points_explanation_1')}</li>
                                <li>{tAuth('reward_points_explanation_2')}</li>
                                <li>{tAuth('reward_points_explanation_3')}</li>
                                <li>{tAuth('reward_points_explanation_4')}</li>
                            </ul>
                            <DialogFooter>
                                <Button type="button" variant="outline" asChild><DialogTrigger>Fermer</DialogTrigger></Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button asChild variant="outline">
                        <Link href={`/${locale}/profil/parametres`}>
                            <Settings className="mr-2 h-4 w-4" />
                            Gérer mon compte
                        </Link>
                    </Button>
                </div>
            )}
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

