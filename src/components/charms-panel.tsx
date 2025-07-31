
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Charm, CharmCategory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Search, ZoomIn, PlusCircle, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from './ui/input';
import { getCharmCategories } from '@/lib/data';
import { useTranslations } from '@/hooks/use-translations';
import { Badge } from './ui/badge';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';

interface CharmsPanelProps {
    allCharms: Charm[];
    onAddCharm: (charm: Charm) => void;
    searchTerm: string;
    onSearchTermChange: (term: string) => void;
    isMobileSheet?: boolean;
}

export function CharmsPanel({ allCharms, onAddCharm, searchTerm, onSearchTermChange, isMobileSheet = false }: CharmsPanelProps) {
    const isMobile = useIsMobile();
    const [charmCategories, setCharmCategories] = useState<CharmCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const t = useTranslations('CharmsPanel');
    
    useEffect(() => {
        const fetchCategories = async () => {
            setIsLoading(true);
            try {
                const categories = await getCharmCategories();
                setCharmCategories(categories);
            } catch (error) {
                console.error('Error loading charm categories', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCategories();
    }, []);

    const filteredCharms = useMemo(() => {
        if (!searchTerm) {
            return allCharms;
        }
        return allCharms.filter(charm =>
            charm.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, allCharms]);

    const charmsByCategory = useMemo(() => {
        const result: Record<string, Charm[]> = {};
        charmCategories.forEach(category => {
            result[category.id] = [];
        });

        filteredCharms.forEach(charm => {
            charm.categoryIds.forEach(categoryId => {
                if (result[categoryId]) {
                    result[categoryId].push(charm);
                }
            });
        });
        return result;
    }, [filteredCharms, charmCategories]);
    
    const renderCharmItem = (charm: Charm) => {
        const isOutOfStock = (charm.quantity ?? 0) <= 0;

        const CharmCard = ({ isDialogTrigger = false }: { isDialogTrigger?: boolean }) => {
            const Component = isDialogTrigger ? DialogTrigger : 'div';
            return (
                <Component
                    asChild={isDialogTrigger}
                    onClick={() => {
                        if (isOutOfStock) {
                            // If out of stock, the DialogTrigger will handle opening the dialog
                            return;
                        }
                        // If in stock, add the charm directly
                        onAddCharm(charm);
                    }}
                >
                     <div
                        className={cn(
                            "relative group p-1 border rounded-md flex flex-col items-center justify-center bg-card transition-colors aspect-square",
                             isOutOfStock ? "cursor-pointer bg-muted/60" : "hover:bg-muted cursor-pointer"
                        )}
                        title={charm.name}
                    >
                        {isOutOfStock && (
                            <Badge variant="destructive" className="absolute top-1 left-1 z-10 text-xs px-1.5 py-0.5">
                                <Ban className="w-3 h-3 mr-1"/>
                                {t('sold_out')}
                            </Badge>
                        )}
                        <div className="flex-grow flex items-center justify-center p-1 w-full h-full">
                            <Image
                                src={charm.imageUrl}
                                alt={charm.name}
                                width={48}
                                height={48}
                                className={cn("pointer-events-none object-contain w-full h-auto", isOutOfStock && "grayscale opacity-50")}
                                data-ai-hint="jewelry charm"
                            />
                        </div>
                        <p className="text-xs text-center mt-1 h-7 flex items-center justify-center px-1">{charm.name}</p>
                        
                        <DialogTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                                onClick={(e) => { e.stopPropagation() }}
                            >
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                    </div>
                </Component>
            );
        };

        return (
             <Dialog key={charm.id}>
                <CharmCard isDialogTrigger={true} />
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-headline text-2xl">{charm.name}</DialogTitle>
                        <DialogDescription>{charm.description}</DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 flex justify-center">
                        <Image src={charm.imageUrl} alt={charm.name} width={200} height={200} className="rounded-lg border p-2" />
                    </div>
                     {isOutOfStock && (
                        <Alert variant="destructive" className="mt-4">
                            <Ban className="h-4 w-4" />
                            <AlertTitle>{t('out_of_stock_title')}</AlertTitle>
                            <AlertDescription>{t('out_of_stock_description')}</AlertDescription>
                        </Alert>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                             <Button variant="outline">{t('close_button')}</Button>
                        </DialogClose>
                        <Button onClick={() => onAddCharm(charm)} disabled={isOutOfStock}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {t('add_to_design_button')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    };
    
    const renderCharmGrid = () => (
         <div className="p-4">
             {isLoading ? (
                <div className="flex justify-center items-center h-full p-8">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <span className="sr-only">{t('loading')}</span>
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
        <Card className={cn("flex flex-col h-full")}>
            <CardHeader>
                <CardTitle className="font-headline text-xl">{t('title')}</CardTitle>
            </CardHeader>
            <div className="px-4 pb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => onSearchTermChange(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>
            <Separator />
            <CardContent className="p-0 flex-grow overflow-y-auto">
                {renderCharmGrid()}
            </CardContent>
        </Card>
    );
}
