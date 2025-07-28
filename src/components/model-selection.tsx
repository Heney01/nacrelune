
"use client";

import React from 'react';
import Link from 'next/link';
import type { JewelryModel, JewelryType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, ZoomIn } from 'lucide-react';
import Image from 'next/image';
import { NacreluneLogo } from '@/components/icons';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useTranslations } from '@/hooks/use-translations';

interface ModelSelectionProps {
    selectedType: JewelryType;
}

export function ModelSelection({ selectedType }: ModelSelectionProps) {
    const t = useTranslations('HomePage');

    return (
        <>
            <header className="p-4 border-b">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <NacreluneLogo className="h-8 w-auto text-foreground" />
                    </div>
                    <Button variant="ghost" asChild>
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t('back_button')}
                        </Link>
                    </Button>
                </div>
            </header>
            <main className="flex-grow p-4 md:p-8">
                <div className="container mx-auto">
                    <section>
                        <h2 className="text-3xl font-headline tracking-tight mb-4 text-center">{t('model_selection_title')}</h2>
                        <p className="text-muted-foreground mb-12 max-w-2xl mx-auto text-center">{t('model_selection_subtitle', { jewelryTypeName: t(`jewelry_types.${selectedType.id}`).toLowerCase() })}</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {selectedType.models.map((model, index) => (
                                <Link key={model.id} href={`?type=${selectedType.id}&model=${model.id}`} legacyBehavior>
                                    <a className="contents">
                                        <Card className="overflow-hidden group flex flex-col cursor-pointer">
                                            <div className="overflow-hidden relative">
                                                <Image 
                                                    src={model.displayImageUrl} 
                                                    alt={model.name} 
                                                    width={400} 
                                                    height={400} 
                                                    className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300" 
                                                    data-ai-hint="jewelry"
                                                    priority={index < 4} // Prioritize loading for the first few images
                                                />
                                                <div onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="secondary" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <ZoomIn className="h-5 w-5" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-3xl">
                                                            <DialogHeader>
                                                                <DialogTitle>{model.name}</DialogTitle>
                                                                <DialogDescription>
                                                                    Enlarged view of the {model.name} model.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <Image src={model.displayImageUrl} alt={model.name} width={800} height={800} className="w-full h-auto object-contain rounded-lg" data-ai-hint="jewelry model" sizes="100vw"/>
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>
                                            </div>
                                            <CardContent className="p-4 flex-grow flex flex-col justify-between">
                                                <h3 className="text-lg font-headline flex-grow">{model.name}</h3>
                                                <Button variant="outline" size="sm" className="w-full mt-4">{t('select_button')}</Button>
                                            </CardContent>
                                        </Card>
                                    </a>
                                </Link>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}
