

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getUserCreations } from '@/app/actions';
import { Creation } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, PlusCircle } from 'lucide-react';
import { BrandLogo } from './icons';
import { Button } from './ui/button';
import { useTranslations } from '@/hooks/use-translations';


export function ProfileClient({ locale }: { locale: string }) {
    const { user, firebaseUser, loading: authLoading } = useAuth();
    const [creations, setCreations] = useState<Creation[] | null>(null);
    const [loadingCreations, setLoadingCreations] = useState(true);
    const router = useRouter();
    const t = useTranslations('Auth');

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

                   {(creations && creations.length > 0) ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {creations.map(creation => (
                                <Card key={creation.id}>
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
                                    <CardContent className="p-4">
                                        <CardTitle className="text-lg font-headline">{creation.name}</CardTitle>
                                        <CardDescription>{creation.description}</CardDescription>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Publiée le {new Date(creation.createdAt).toLocaleDateString()}
                                        </p>
                                    </CardContent>
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
