
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import type { JewelryModel, JewelryType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, ZoomIn } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from '@/hooks/use-translations';

interface ModelSelectionProps {
    selectedType: JewelryType;
    locale: string;
}

export function ModelSelection({ selectedType, locale }: ModelSelectionProps) {
    const t = useTranslations('HomePage');
    const [loadingModelId, setLoadingModelId] = useState<string | null>(null);

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
                <p className="text-muted-foreground mb-12 max-w-2xl mx-auto text-center">{t('model_selection_subtitle', { jewelryTypeName: t(`jewelry_types.${selectedType.id}`).toLowerCase() })}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {selectedType.models.map((model, index) => (
                        <Card key={model.id} className="overflow-hidden group flex flex-col">
                           <div className="overflow-hidden relative">
                                <Link 
                                    href={`/${locale}?type=${selectedType.id}&model=${model.id}`} 
                                    onClick={() => handleModelClick(model.id)}
                                >
                                    <Image 
                                        src={model.displayImageUrl} 
                                        alt={model.name} 
                                        width={400} 
                                        height={400} 
                                        className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300" 
                                        data-ai-hint="jewelry"
                                        priority={index < 4} // Prioritize loading for the first few images
                                    />
                                     {loadingModelId === model.id && (
                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                        </div>
                                    )}
                                </Link>
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
                                <Button asChild variant="outline" size="sm" className="w-full mt-4" disabled={!!loadingModelId}>
                                    <Link 
                                        href={`/${locale}?type=${selectedType.id}&model=${model.id}`} 
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

// Dummy components to avoid import errors if not present
const Dialog = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
const DialogTrigger = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
const DialogContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
const DialogHeader = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
const DialogTitle = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
const DialogDescription = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
