
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
import { useTranslations } from '@/hooks/use-translations';
import { Badge } from './ui/badge';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';

interface CharmsPanelProps {
    allCharms: Charm[];
    charmCategories: CharmCategory[];
    onAddCharm: (charm: Charm) => void;
    searchTerm: string;
    onSearchTermChange: (term: string) => void;
    isMobileSheet?: boolean;
}

const CharmItem = ({ charm, onAddCharm }: { charm: Charm, onAddCharm: (charm: Charm) => void }) => {
    const isOutOfStock = (charm.quantity ?? 0) <= 0;
    const t = useTranslations('CharmsPanel');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const isMobile = useIsMobile();

    const handleCardClick = (e: React.MouseEvent) => {
        if (isMobile) {
            // On mobile, always open the preview dialog.
            setIsPreviewOpen(true);
        } else {
            // On desktop, add charm directly, unless the loupe is clicked.
            const target = e.target as HTMLElement;
            if (target.closest('[data-trigger-preview]')) return;

            if (isOutOfStock) {
                setIsPreviewOpen(true);
            } else {
                onAddCharm(charm);
            }
        }
    };

    const handlePreviewClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsPreviewOpen(true);
    };

    return (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <Card
                onClick={handleCardClick}
                className={cn(
                    "p-0 aspect-square flex flex-col items-center justify-center relative group",
                    "cursor-pointer",
                    isOutOfStock ? "bg-muted/60" : "hover:bg-muted"
                )}
                title={charm.name}
            >
                {isOutOfStock && (
                    <Badge variant="destructive" className="absolute top-1 left-1 z-10 text-xs px-1.5 py-0.5">
                        <Ban className="w-3 h-3 mr-1"/>
                        {t('sold_out')}
                    </Badge>
                )}
                 <div className="flex-grow w-full h-full relative grid place-items-center">
                    <Image
                        src={charm.imageUrl}
                        alt={charm.name}
                        fill
                        className={cn("object-contain pointer-events-none p-2", isOutOfStock && "grayscale opacity-50")}
                        data-ai-hint="jewelry charm"
                    />
                </div>
                
                {!isMobile && (
                    <Button 
                        data-trigger-preview
                        onClick={handlePreviewClick}
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                            "absolute top-1 right-1 transition-opacity h-6 w-6",
                            "opacity-0 group-hover:opacity-100"
                        )}
                        title={t('view_details_button')}
                    >
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                )}
            </Card>

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
                <DialogFooter className="gap-2">
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

export function CharmsPanel({ allCharms, charmCategories, onAddCharm, searchTerm, onSearchTermChange, isMobileSheet = false }: CharmsPanelProps) {
    const isMobile = useIsMobile();
    const t = useTranslations('CharmsPanel');
    
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
            if (charm.categoryIds) {
                charm.categoryIds.forEach(categoryId => {
                    if (result[categoryId]) {
                        result[categoryId].push(charm);
                    }
                });
            }
        });
        return result;
    }, [filteredCharms, charmCategories]);
    
    const renderCharmGrid = () => (
         <div className="p-4">
             {charmCategories.length === 0 ? (
                <div className="flex justify-center items-center h-full p-8 text-center text-muted-foreground">
                    <p>Aucune catégorie de breloque n'a été trouvée.</p>
                </div>
            ) : (
                <Accordion type="multiple" defaultValue={charmCategories.map(c => c.id)} className="w-full">
                    {charmCategories.map(category => (
                        charmsByCategory[category.id] && charmsByCategory[category.id].length > 0 && (
                            <AccordionItem value={category.id} key={category.id}>
                                <AccordionTrigger className="text-base font-headline">{category.name}</AccordionTrigger>
                                <AccordionContent>
                                    <div className={cn("grid gap-2 pt-2", isMobile ? "grid-cols-4" : "grid-cols-3")}>
                                        {charmsByCategory[category.id].map(charm => 
                                            <CharmItem key={charm.id} charm={charm} onAddCharm={onAddCharm} />
                                        )}
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
