
'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getUserCreations } from '@/app/actions/creation.actions';
import { Creation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, PlusCircle, Award, Settings } from 'lucide-react';
import { BrandLogo } from './icons';
import Link from 'next/link';
import { useTranslations } from '@/hooks/use-translations';
import { CartWidget } from './cart-widget';
import { UserNav } from './user-nav';
import { CreationCard } from './creation-card';


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

    const onCreationUpdate = (updatedCreation: Partial<Creation>) => {
        setCreations(prev => 
            prev?.map(c => c.id === updatedCreation.id ? { ...c, ...updatedCreation } : c) || null
        );
    };

    const onCreationDelete = (creationId: string) => {
        setCreations(prev => prev?.filter(c => c.id !== creationId) || null);
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
                                Retour à la création
                            </Link>
                        </Button>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                        <div>
                             <h1 className="text-3xl font-headline">{user?.displayName || 'Mon Profil'}</h1>
                             <p className="text-muted-foreground mt-2">Retrouvez ici toutes les créations que vous avez publiées.</p>
                        </div>
                         <div className="flex items-center gap-4 self-start sm:self-center">
                             <div className="flex items-center gap-2 text-primary font-bold bg-primary/10 px-3 py-1.5 rounded-full">
                                <Award className="h-5 w-5"/>
                                <span>{user?.rewardPoints || 0} Points</span>
                            </div>
                             <Button asChild variant="outline">
                                <Link href={`/${locale}/profil/parametres`}>
                                    <Settings className="mr-2 h-4 w-4" />
                                    Gérer mon compte
                                </Link>
                            </Button>
                        </div>
                    </div>

                   {(creations && creations.length > 0) ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {creations.map(creation => (
                                <CreationCard 
                                    key={creation.id} 
                                    creation={creation} 
                                    locale={locale} 
                                    onUpdate={onCreationUpdate}
                                    onDelete={onCreationDelete}
                                    showCreatorName={false}
                                />
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
