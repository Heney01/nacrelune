
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import type { JewelryModel, JewelryType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, ZoomIn } from 'lucide-react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTranslations } from '@/hooks/use-translations';


interface ModelSelectionProps {
    selectedType: JewelryType;
    locale: string;
}

export function ModelSelection({ selectedType, locale }: ModelSelectionProps) {
    const [loadingModelId, setLoadingModelId] = useState<string | null>(null);
    const t = useTranslations('HomePage');

    const handleModelClick = (modelId: string) => {
        setLoadingModelId(modelId);
    };

    return (
        <>
            <div className="flex justify-start mb-8">
                <Button variant="ghost" asChild>
                    <Link href={`/${locale}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('back_button')}
                    </Link>
                </Button>
            </div>
            <section>
                <h2 className="text-3xl font-headline tracking-tight mb-4 text-center">{t('model_selection_title')}</h2>
                <p className="text-muted-foreground mb-12 max-w-2xl mx-auto text-center">{t('model_selection_subtitle', { jewelryTypeName: selectedType.name.toLowerCase() })}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {selectedType.models.map((model, index) => (
                        <Card key={model.id} className="overflow-hidden group flex flex-col">
                           <div className="overflow-hidden relative">
                                <Link 
                                    href={`/${locale}/?type=${selectedType.id}&model=${model.id}`} 
                                    onClick={() => handleModelClick(model.id)}
                                    className="block relative w-full h-64"
                                >
                                    <Image 
                                        src={model.displayImageUrl} 
                                        alt={model.name} 
                                        fill
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        className="object-cover group-hover:scale-105 transition-transform duration-300" 
                                        data-ai-hint="jewelry"
                                        priority={index < 4}
                                    />
                                     {loadingModelId === model.id && (
                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                        </div>
                                    )}
                                </Link>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="secondary" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ZoomIn className="h-5 w-5" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl">
                                        <DialogHeader>
                                            <DialogTitle>{model.name}</DialogTitle>
                                        </DialogHeader>
                                        <div className="mt-4 grid place-items-center">
                                            <Image src={model.displayImageUrl} alt={model.name} width={800} height={800} className="w-full h-auto object-contain rounded-lg max-w-full max-h-[80vh]" data-ai-hint="jewelry model" sizes="100vw"/>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <CardContent className="p-4 flex-grow flex flex-col justify-between">
                                <h3 className="text-lg font-headline flex-grow">{model.name}</h3>
                                <Button asChild variant="outline" size="sm" className="w-full mt-4" disabled={!!loadingModelId}>
                                    <Link 
                                        href={`/${locale}/?type=${selectedType.id}&model=${model.id}`} 
                                        onClick={() => handleModelClick(model.id)}
                                    >
                                        {loadingModelId === model.id ? <Loader2 className="animate-spin" /> : t('select_button')}
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        </>
    );
}
