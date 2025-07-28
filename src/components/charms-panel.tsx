
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, DocumentReference } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { Charm, CharmCategory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Search, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/hooks/use-translations';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';


interface CharmsPanelProps {
    onCharmsLoaded: (charms: Charm[]) => void;
    onAddCharm: (charm: Charm) => void;
    isMobileSheet?: boolean;
    searchTerm: string;
}

export function CharmsPanel({ onCharmsLoaded, onAddCharm, isMobileSheet = false, searchTerm }: CharmsPanelProps) {
    const t = useTranslations('Editor');
    const isMobile = useIsMobile();
    const [charms, setCharms] = useState<Charm[]>([]);
    const [charmCategories, setCharmCategories] = useState<CharmCategory[]>([]);
    const [isLoadingCharms, setIsLoadingCharms] = useState(true);

    const getUrl = async (path: string) => {
        if (path && !path.startsWith('http')) {
            try {
                const storageRef = ref(storage, path);
                return await getDownloadURL(storageRef);
            } catch (error) {
                console.error("Error getting download URL: ", error);
                return 'https://placehold.co/100x100.png'; // Fallback
            }
        }
        return path || 'https://placehold.co/100x100.png';
    }

    useEffect(() => {
        const fetchCharmsData = async () => {
            setIsLoadingCharms(true);
            try {
                const categoriesSnapshot = await getDocs(collection(db, "charmCategories"));
                const fetchedCategories = await Promise.all(categoriesSnapshot.docs.map(async (doc) => {
                    const data = doc.data();
                    const imageUrl = data.imageUrl ? await getUrl(data.imageUrl) : undefined;
                    return {
                        id: doc.id,
                        name: data.name,
                        description: data.description,
                        imageUrl: imageUrl,
                    } as CharmCategory;
                }));
                setCharmCategories(fetchedCategories);

                const charmsSnapshot = await getDocs(collection(db, "charms"));
                const fetchedCharms = await Promise.all(charmsSnapshot.docs.map(async (doc) => {
                    const data = doc.data();
                    const imageUrl = await getUrl(data.imageUrl);
                    const categoryRef = data.category as DocumentReference;
                    return {
                        id: doc.id,
                        name: data.name,
                        imageUrl: imageUrl,
                        description: data.description,
                        categoryId: categoryRef.id,
                        price: data.price || 0,
                    } as Charm;
                }));
                setCharms(fetchedCharms);
                onCharmsLoaded(fetchedCharms);
            } catch (error) {
                console.error("Error fetching charms data: ", error);
            } finally {
                setIsLoadingCharms(false);
            }
        };
        fetchCharmsData();
    }, [onCharmsLoaded]);

    const filteredCharms = useMemo(() => {
        if (!searchTerm) {
            return charms;
        }
        return charms.filter(charm =>
            charm.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, charms]);

    const charmsByCategory = useMemo(() => {
        return filteredCharms.reduce((acc, charm) => {
            const categoryId = charm.categoryId;
            if (!acc[categoryId]) {
                acc[categoryId] = [];
            }
            acc[categoryId].push(charm);
            return acc;
        }, {} as Record<string, Charm[]>);
    }, [filteredCharms]);
    
    const renderCharmItem = (charm: Charm) => {
        if (isMobileSheet) {
            return (
                <div
                    onClick={() => onAddCharm(charm)}
                    className="relative group p-1 border rounded-md flex flex-col items-center justify-center bg-card hover:bg-muted transition-colors aspect-square cursor-pointer"
                    title={charm.name}
                >
                    <Image
                        src={charm.imageUrl}
                        alt={charm.name}
                        width={48}
                        height={48}
                        className="pointer-events-none p-1"
                        data-ai-hint="jewelry charm"
                    />
                    <p className="text-xs text-center mt-1 truncate">{charm.name}</p>
                </div>
            );
        }

        return (
             <Dialog key={charm.id}>
                <DialogTrigger asChild>
                    <div
                        className="relative group p-1 border rounded-md flex flex-col items-center justify-center bg-card hover:bg-muted transition-colors aspect-square cursor-pointer"
                        title={charm.name}
                    >
                        <Image
                            src={charm.imageUrl}
                            alt={charm.name}
                            width={48}
                            height={48}
                            className="pointer-events-none p-1"
                            data-ai-hint="jewelry charm"
                        />
                        <p className="text-xs text-center mt-1 truncate">{charm.name}</p>
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <ZoomIn className="h-4 w-4" />
                        </div>
                    </div>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-headline text-2xl">{charm.name}</DialogTitle>
                        <DialogDescription>{charm.description}</DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 flex justify-center">
                        <Image src={charm.imageUrl} alt={charm.name} width={200} height={200} className="rounded-lg border p-2" />
                    </div>
                    <div className="mt-6 flex justify-end">
                        <DialogClose asChild>
                            <Button onClick={() => onAddCharm(charm)}>{t('add_to_design_button')}</Button>
                        </DialogClose>
                    </div>
                </DialogContent>
            </Dialog>
        )
    };
    
    const renderCharmGrid = () => (
         <div className="p-4">
             {isLoadingCharms ? (
                <div className="flex justify-center items-center h-full p-8">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : (
                <Accordion type="multiple" defaultValue={charmCategories.map(c => c.id)} className="w-full">
                    {charmCategories.map(category => (
                        charmsByCategory[category.id] && charmsByCategory[category.id].length > 0 && (
                            <AccordionItem value={category.id} key={category.id}>
                                <AccordionTrigger className="text-base font-headline">{category.name}</AccordionTrigger>
                                <AccordionContent>
                                    <div className={cn("grid gap-2 pt-2", isMobile ? "grid-cols-4" : "grid-cols-3")}>
                                        {charmsByCategory[category.id].map(renderCharmItem)}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    ))}
                </Accordion>
            )}
        </div>
    );

    if (isMobileSheet) {
        return renderCharmGrid();
    }

    return (
        <Card className={cn("flex flex-col h-full", "lg:col-span-3")}>
            <CardHeader>
                <CardTitle className="font-headline text-xl">{t('charms_title')}</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => (e.target as any).value}
                        className="pl-9"
                    />
                </div>
            </div>
            <Separator />
            <CardContent className="p-0 flex-grow">
                <ScrollArea>
                    {renderCharmGrid()}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
