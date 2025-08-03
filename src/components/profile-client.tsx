

'use client';

import { useEffect, useState, useOptimistic } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getUserCreations, toggleLikeCreation } from '@/app/actions';
import { Creation } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, PlusCircle, Heart } from 'lucide-react';
import { BrandLogo } from './icons';
import { Button } from './ui/button';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';


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
            return state!.map(c => 
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
    
    const handleLikeClick = async (creationId: string, currentLikes: number) => {
        if (!firebaseUser) {
            toast({
                variant: 'destructive',
                title: "Vous n'êtes pas connecté",
                description: "Vous devez être connecté pour aimer une création.",
            });
            return;
        }
        
        // Optimistic update - for now, we assume the like will succeed
        // A more advanced implementation would track if the user has liked it before
        // For simplicity, we just increment. A proper check happens on the server.
        // The server will return the true new count.
        setOptimisticCreations({ creationId, newLikesCount: currentLikes + 1 });

        try {
            const idToken = await firebaseUser.getIdToken();
            const result = await toggleLikeCreation(creationId, idToken);
            if (!result.success) {
                // Revert optimistic update if server fails
                setOptimisticCreations({ creationId, newLikesCount: currentLikes });
                toast({
                    variant: 'destructive',
                    title: "Erreur",
                    description: result.message,
                });
            }
        } catch (error) {
             setOptimisticCreations({ creationId, newLikesCount: currentLikes });
             toast({
                variant: 'destructive',
                title: "Erreur",
                description: "Une erreur inattendue est survenue.",
            });
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
                                <Card key={creation.id} className="flex flex-col">
                                    <CardHeader className="p-0">
                                        <div className="aspect-square relative w-full bg-muted/50">
                                            <Image 
                                                src={creation.previewImageUrl} 
                                                alt={creation.name} 
                                                fill 
                                                className="object-contain"
                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                            />
                                        </div>
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
                                            onClick={() => handleLikeClick(creation.id, creation.likesCount || 0)}
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
