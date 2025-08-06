

'use client';

import { useState, useEffect, Suspense, useMemo, useCallback, useTransition } from 'react';
import { getCreatorShowcaseData } from '@/lib/data';
import { CreationCard } from '@/components/creation-card';
import { notFound, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Heart, Clock, Settings, Award, Loader2, Layers } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { toggleLikeCreator } from '@/app/actions/user.actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function CreatorShowcase({ creatorId, locale }: { creatorId: string; locale: string }) {
  const [data, setData] = useState<{ creator: Creator | null; creations: Creation[], isLikedByUser: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'likes'>('date');
  const searchParams = useSearchParams();
  const creationIdFromUrl = searchParams.get('creation');
  const { user, firebaseUser } = useAuth();
  const tAuth = useTranslations('Auth');
  const t = useTranslations('HomePage');
  const { toast } = useToast();
  const [isLikePending, startLikeTransition] = useTransition();

  const isOwner = firebaseUser?.uid === creatorId;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await getCreatorShowcaseData(creatorId, firebaseUser?.uid);
      setData(result);
      setLoading(false);
    };
    fetchData();
  }, [creatorId, firebaseUser?.uid]);
  
  const sortedCreations = useMemo(() => {
    if (!data?.creations) return [];
    
    const creationsCopy = [...data.creations];
    
    if (sortBy === 'likes') {
      return creationsCopy.sort((a, b) => b.likesCount - a.likesCount);
    }
    
    // Default to date sort
    return creationsCopy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data?.creations, sortBy]);

  const handleUpdateCreation = useCallback((updatedCreation: Partial<Creation>) => {
    setData(prevData => {
      if (!prevData) return null;
      return {
        ...prevData,
        creations: prevData.creations.map(c => 
          c.id === updatedCreation.id ? { ...c, ...updatedCreation } : c
        )
      };
    });
  }, []);

  const handleDeleteCreation = useCallback((creationId: string) => {
    setData(prevData => {
      if (!prevData) return null;
      return {
        ...prevData,
        creations: prevData.creations.filter(c => c.id !== creationId)
      };
    });
  }, []);

  const handleLikeCreator = () => {
    if (!firebaseUser) {
        toast({ variant: 'destructive', title: "Connexion requise", description: "Vous devez être connecté pour aimer un créateur." });
        return;
    }

    startLikeTransition(async () => {
        const initialLiked = data?.isLikedByUser;
        const initialLikesCount = data?.creator?.likesCount ?? 0;

        setData(prev => {
            if (!prev || !prev.creator) return prev;
            return {
                ...prev,
                isLikedByUser: !prev.isLikedByUser,
                creator: {
                    ...prev.creator,
                    likesCount: prev.isLikedByUser ? initialLikesCount - 1 : initialLikesCount + 1,
                }
            };
        });

        try {
            const idToken = await firebaseUser.getIdToken();
            const result = await toggleLikeCreator(creatorId, idToken);
            if (!result.success) {
                 setData(prev => {
                    if (!prev || !prev.creator) return prev;
                    return { ...prev, isLikedByUser: initialLiked, creator: { ...prev.creator, likesCount: initialLikesCount } };
                });
                toast({ variant: 'destructive', title: "Erreur", description: result.message });
            } else if (result.newLikesCount !== undefined && data?.creator) {
                 setData(prev => {
                    if (!prev || !prev.creator) return prev;
                    return { ...prev, creator: { ...prev.creator, likesCount: result.newLikesCount! } };
                });
            }
        } catch (e) {
            setData(prev => {
                if (!prev || !prev.creator) return prev;
                return { ...prev, isLikedByUser: initialLiked, creator: { ...prev.creator, likesCount: initialLikesCount } };
            });
            toast({ variant: 'destructive', title: "Erreur", description: "Une erreur inattendue est survenue." });
        }
    });
  };

  if (loading) {
    return <Loading />;
  }

  if (!data?.creator) {
    notFound();
  }

  const { creator, creations, isLikedByUser } = data;
  const fallbackDisplayName = creator.displayName?.charAt(0) || creator.email?.charAt(0) || '?';
  
  const creationSlotsUsed = creations.length;
  const totalCreationSlots = user?.creationSlots || 0;

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
              <div className="flex items-center gap-4 justify-center sm:justify-start">
                  <h1 className="text-3xl font-headline">{creator.displayName}</h1>
                  {!isOwner && (
                       <button
                          onClick={handleLikeCreator}
                          disabled={isLikePending || !firebaseUser}
                          className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors disabled:cursor-not-allowed"
                      >
                          {isLikePending ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                              <Heart className={cn("h-6 w-6", isLikedByUser && "text-primary fill-current")} />
                          )}
                          <span className="text-base font-medium">{creator.likesCount ?? 0}</span>
                      </button>
                  )}
              </div>
            </div>
             {isOwner && (
                <div className="flex flex-col sm:flex-row items-center gap-4 self-center">
                    <div className="flex items-center gap-2">
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                     <div className="flex items-center gap-2 text-muted-foreground font-bold bg-muted/60 px-3 py-1.5 rounded-full">
                                        <Layers className="h-5 w-5"/>
                                        <span>{creationSlotsUsed} / {totalCreationSlots} {t('slots_label')}</span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{tAuth('slots_tooltip')}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

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
                    </div>
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
                  onUpdate={isOwner ? handleUpdateCreation : undefined}
                  onDelete={isOwner ? handleDeleteCreation : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed rounded-lg">
              <h3 className="text-xl font-semibold">{isOwner ? "Vous n'avez pas encore publié de création." : `${creator.displayName} n'a pas encore publié de création.`}</h3>
              <p className="text-muted-foreground mt-2">{isOwner ? "Commencez à créer pour la partager ici !" : "Revenez bientôt !"} </p>
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
