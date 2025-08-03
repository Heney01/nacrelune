

'use client';

import { useEffect, useState, useOptimistic } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getUserCreations, toggleLikeCreation } from '@/app/actions';
import { Creation } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, PlusCircle, Heart, MoreHorizontal } from 'lucide-react';
import { BrandLogo } from './icons';
import { Button } from './ui/button';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


export function ProfileClient({ locale }: { locale: string }) {
    const { user, firebaseUser, loading: authLoading } = useAuth();
    const [creations, setCreations] = useState<Creation[] | null>(null);
    const [loadingCreations, setLoadingCreations] = useState(true);
    const router = useRouter();
    const t = useTranslations('Auth');
    const { toast } = useToast();

    // Optimistic UI for likes
    const [optimisticCreations, setOptimisticCreations] = useOptimistic(
        creations,
        (state, { creationId, newLikesCount }: { creationId: string; newLikesCount: number }) => {
            if (!state) return state;
            return state.map(c => 
                c.id === creationId ? { ...c, likesCount: newLikesCount } : c
            );
        }
    );

    useEffect(() => {
        if (authLoading) {
            return;
        }
        if (!firebaseUser) {
            router.push(`/${locale}/connexion`);
            return;
        }

        const fetchCreations = async () => {
            setLoadingCreations(true);
            const userCreations = await getUserCreations(firebaseUser.uid);
            setCreations(userCreations);
            setLoadingCreations(false);
        };
        
        fetchCreations();

    }, [authLoading, firebaseUser, router, locale]);
    
    const handleLikeClick = async (creationId: string) => {
        if (!firebaseUser) {
            toast({
                variant: 'destructive',
                title: "Vous n'êtes pas connecté",
                description: "Vous devez être connecté pour aimer une création.",
            });
            return;
        }
        
        const currentCreation = creations?.find(c => c.id === creationId);
        if (!currentCreation) return;
        
        const newLikesCount = (currentCreation.likesCount || 0) + 1;
        
        setOptimisticCreations({creationId, newLikesCount});

        try {
            const idToken = await firebaseUser.getIdToken();
            const result = await toggleLikeCreation(creationId, idToken);
            if (result.success && result.newLikesCount !== undefined) {
                 setCreations(prev => 
                    prev!.map(c => 
                        c.id === creationId ? { ...c, likesCount: result.newLikesCount! } : c
                    )
                );
            }
            else {
                toast({
                    variant: 'destructive',
                    title: "Erreur",
                    description: result.message,
                });
                 setCreations(prev => 
                    prev!.map(c => 
                        c.id === creationId ? { ...c, likesCount: currentCreation.likesCount || 0 } : c
                    )
                );
            }
        } catch (error) {
             toast({
                variant: 'destructive',
                title: "Erreur",
                description: "Une erreur inattendue est survenue.",
            });
             setCreations(prev => 
                prev!.map(c => 
                    c.id === creationId ? { ...c, likesCount: currentCreation.likesCount || 0 } : c
                )
            );
        }
    };


    if (authLoading || loadingCreations) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }
    
    if (!firebaseUser) {
        return null; // Should be redirected, but as a fallback.
    }

    return (
        <div className="flex flex-col min-h-screen bg-stone-50">
             <header className="p-4 border-b bg-white">
                <div className="container mx-auto flex justify-between items-center">
                    <Link href={`/${locale}`} className="flex items-center gap-2">
                        <BrandLogo className="h-8 w-auto text-foreground" />
                    </Link>
                </div>
            </header>
            <main className="flex-grow p-4 md:p-8">
                <div className="container mx-auto">
                     <div className="flex justify-start mb-8">
                        <Button variant="ghost" asChild>
                            <Link href={`/${locale}`}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Retour à la création
                            </Link>
                        </Button>
                    </div>
                    <h1 className="text-3xl font-headline mb-2">{t('my_creations')}</h1>
                    <p className="text-muted-foreground mb-8">Retrouvez ici toutes les créations que vous avez publiées.</p>

                   {(optimisticCreations && optimisticCreations.length > 0) ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {optimisticCreations.map(creation => (
                                <Card key={creation.id} className="flex flex-col group">
                                    <CardHeader className="p-0 relative">
                                        <div className="aspect-square relative w-full bg-muted/50">
                                            <Image 
                                                src={creation.previewImageUrl} 
                                                alt={creation.name} 
                                                fill 
                                                className="object-contain"
                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                            />
                                        </div>
                                         {firebaseUser?.uid === creation.creatorId && (
                                            <div className="absolute top-2 right-2">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="secondary" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem>Modifier</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                         )}
                                    </CardHeader>
                                    <CardContent className="p-4 flex-grow">
                                        <CardTitle className="text-base font-headline">{creation.name}</CardTitle>
                                        {creation.description && <CardDescription className="text-xs mt-1">{creation.description}</CardDescription>}
                                    </CardContent>
                                    <CardFooter className="p-4 pt-0 flex justify-between items-center">
                                         <p className="text-xs text-muted-foreground">
                                            Publiée le {new Date(creation.createdAt).toLocaleDateString()}
                                        </p>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary"
                                            onClick={() => handleLikeClick(creation.id)}
                                        >
                                            <Heart className={cn("h-4 w-4", (creation.likesCount || 0) > 0 && "text-primary fill-current")} />
                                            <span className="font-mono text-sm">{creation.likesCount || 0}</span>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                   ) : (
                       <div className="text-center py-16 border border-dashed rounded-lg">
                           <h3 className="text-xl font-semibold">Aucune création publiée</h3>
                           <p className="text-muted-foreground mt-2">Il est temps de laisser parler votre créativité !</p>
                           <Button asChild className="mt-6">
                               <Link href={`/${locale}`}>
                                   <PlusCircle className="mr-2 h-4 w-4" />
                                   Créer un bijou
                               </Link>
                           </Button>
                       </div>
                   )}
                </div>
            </main>
        </div>
    );
}
