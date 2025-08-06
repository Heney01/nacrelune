'use client';

import { useState, useEffect, Suspense, useMemo, useCallback, useTransition } from 'react';
import { getCreatorShowcaseData } from '@/lib/data';
import { CreationCard } from '@/components/creation-card';
import { notFound, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Heart, Clock, Settings, Award, Loader2, Layers, PlusCircle, Copy, ShoppingCart } from 'lucide-react';
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { toggleLikeCreator, purchaseCreationSlot } from '@/app/actions/user.actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function CreatorShowcase({ creatorId, locale }: { creatorId: string; locale: string }) {
  const [data, setData] = useState<{ creator: Creator | null; creations: Creation[], isLikedByUser: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'likes'>('date');
  const searchParams = useSearchParams();
  const creationIdFromUrl = searchParams.get('creation');
  const { user, firebaseUser, setUser } = useAuth();
  const tAuth = useTranslations('Auth');
  const t = useTranslations('HomePage');
  const { toast } = useToast();
  const [isLikePending, startLikeTransition] = useTransition();
  const [isBuyingSlot, startSlotPurchaseTransition] = useTransition();

  const isOwner = firebaseUser?.uid === creatorId;
  const [showcaseUrl, setShowcaseUrl] = useState('');

  useEffect(() => {
    setShowcaseUrl(`https://www.atelierabijoux.com/${locale}/creators/${creatorId}`);
  }, [locale, creatorId]);

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
        const initialLiked = data?.isLikedByUser ?? false;
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
  
    const handlePurchaseSlot = () => {
        if (!firebaseUser) return;
        startSlotPurchaseTransition(async () => {
            const idToken = await firebaseUser.getIdToken();
            const result = await purchaseCreationSlot(idToken);
            if(result.success && result.newSlotCount !== undefined) {
                toast({ title: "Succès", description: "Nouvel emplacement débloqué ! Vous pouvez maintenant publier votre création."});
                if(setUser) {
                    setUser(prevUser => prevUser ? ({...prevUser, creationSlots: result.newSlotCount, rewardPoints: (prevUser.rewardPoints || 0) - 50 }) : null);
                }
            } else {
                toast({ variant: 'destructive', title: "Erreur", description: result.message});
            }
        });
    };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(showcaseUrl);
    toast({
        description: "Lien de la vitrine copié !",
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
  const emptySlots = isOwner ? Math.max(0, totalCreationSlots - creationSlotsUsed) : 0;
  const canBuySlot = (user?.rewardPoints || 0) >= 50;

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
            <div className="flex-grow text-center sm:text-left space-y-2">
              <div>
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
              <div className="flex gap-2 items-center justify-center sm:justify-start max-w-sm mx-auto sm:mx-0">
                  <Input value={showcaseUrl} readOnly className="text-xs h-8" />
                  <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleCopyLink}>
                      <Copy className="h-4 w-4" />
                  </Button>
              </div>
            </div>
             {isOwner && (
                <div className="flex flex-col sm:flex-row items-center gap-4 self-center">
                    <div className="flex items-center gap-2">
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

          {isOwner || sortedCreations.length > 0 ? (
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
              {isOwner && Array.from({ length: emptySlots }).map((_, index) => (
                  <Link href={`/${locale}`} key={`empty-${index}`} className="contents">
                      <Card className="overflow-hidden group flex flex-col h-full">
                        <div className="bg-muted/50 aspect-square relative overflow-hidden cursor-pointer flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-t-lg group-hover:border-primary group-hover:text-primary transition-colors">
                            <PlusCircle className="h-10 w-10" />
                            <p className="mt-2 font-medium text-sm">Créer</p>
                        </div>
                         <CardContent className="p-4 flex-grow flex flex-col">
                           <div className="flex-grow">
                                <h3 className="font-headline text-lg truncate invisible">Placeholder</h3>
                            </div>
                            <div className="flex justify-end items-center mt-auto pt-4 gap-4 invisible">
                                <div className="h-5 w-5"></div>
                                <div className="h-5 w-5"></div>
                                <div className="h-5 w-5"></div>
                            </div>
                        </CardContent>
                      </Card>
                  </Link>
              ))}
               {isOwner && (
                 <Card className="overflow-hidden group flex flex-col h-full bg-muted/20">
                    <div className="bg-muted/50 aspect-square relative overflow-hidden flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-t-lg">
                        <ShoppingCart className="h-10 w-10" />
                         <p className="mt-2 font-medium text-sm px-2 text-center">Acheter un emplacement</p>
                    </div>
                     <CardContent className="p-4 flex-grow flex flex-col items-center justify-center">
                       <div className="text-center">
                            <p className="font-bold text-lg">50 Points</p>
                            <p className="text-xs text-muted-foreground">Débloquez un nouvel emplacement de création.</p>
                       </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button size="sm" className="mt-3 w-full" disabled={!canBuySlot || isBuyingSlot}>
                                    {isBuyingSlot && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Acheter
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmer l'achat ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Voulez-vous vraiment dépenser 50 points pour débloquer un nouvel emplacement de création ? Le montant sera déduit de votre solde de {user?.rewardPoints || 0} points.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={handlePurchaseSlot}>Confirmer</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>
                  </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed rounded-lg">
              <h3 className="text-xl font-semibold">{`${creator.displayName} n'a pas encore publié de création.`}</h3>
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
