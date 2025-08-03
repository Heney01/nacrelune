
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getUserCreations } from '@/app/actions';
import { Creation } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { BrandLogo } from './icons';
import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';

export function ProfileClient({ locale }: { locale: string }) {
    const { user, firebaseUser, loading: authLoading } = useAuth();
    const [creations, setCreations] = useState<Creation[]>([]);
    const [loadingCreations, setLoadingCreations] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!authLoading) {
            if (firebaseUser) {
                const fetchCreations = async () => {
                    setLoadingCreations(true);
                    const userCreations = await getUserCreations(firebaseUser.uid);
                    console.log('[CLIENT] Received creations:', userCreations);
                    setCreations(userCreations);
                    setLoadingCreations(false);
                };
                fetchCreations();
            } else {
                router.push(`/${locale}/connexion`);
            }
        }
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
                    <h1 className="text-3xl font-headline mb-2">Mes Créations</h1>
                    <p className="text-muted-foreground mb-8">Retrouvez ici toutes les créations que vous avez publiées.</p>

                    <Card>
                        <CardHeader>
                            <CardTitle>Mes Créations Publiées</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {creations.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {creations.map(creation => (
                                        <Link href={`/${locale}/creations/${creation.id}`} key={creation.id}>
                                            <Card className="overflow-hidden group">
                                                <div className="aspect-square relative">
                                                    <Image 
                                                      src={creation.previewImageUrl} 
                                                      alt={creation.name} 
                                                      fill
                                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                                    />
                                                </div>
                                                <div className="p-4">
                                                    <h3 className="font-semibold truncate">{creation.name}</h3>
                                                    <p className="text-sm text-muted-foreground">{creation.salesCount} ventes</p>
                                                </div>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-8">Vous n'avez pas encore publié de création.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
