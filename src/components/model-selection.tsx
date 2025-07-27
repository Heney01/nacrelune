
"use client";

import React, { useState, useEffect } from 'react';
import type { JewelryModel, JewelryType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, ZoomIn } from 'lucide-react';
import Image from 'next/image';
import { NacreluneLogo } from '@/components/icons';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { ref, getDownloadURL } from "firebase/storage";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useTranslations } from '@/hooks/use-translations';

interface ModelSelectionProps {
    selectedType: Omit<JewelryType, 'models'>;
    onModelSelect: (model: JewelryModel) => void;
    onBack: () => void;
}

export function ModelSelection({ selectedType, onModelSelect, onBack }: ModelSelectionProps) {
    const t = useTranslations('HomePage');
    const [models, setModels] = useState<JewelryModel[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(true);

    const getUrl = async (path: string) => {
        if (path && !path.startsWith('http')) {
            try {
                const storageRef = ref(storage, path);
                return await getDownloadURL(storageRef);
            } catch (error) {
                console.error("Error getting download URL: ", error);
                return 'https://placehold.co/800x800.png'; // Fallback
            }
        }
        return path || 'https://placehold.co/800x800.png';
    }

    useEffect(() => {
        const fetchModels = async () => {
            if (!selectedType) return;
            setIsLoadingModels(true);
            try {
                const querySnapshot = await getDocs(collection(db, selectedType.id));
                const fetchedModels = await Promise.all(
                    querySnapshot.docs.map(async (doc) => {
                        const data = doc.data();
                        const displayImageUrl = await getUrl(data.displayImageUrl);
                        const editorImageUrl = await getUrl(data.editorImageUrl);
                        
                        return {
                            id: doc.id,
                            name: data.name,
                            displayImageUrl: displayImageUrl,
                            editorImageUrl: editorImageUrl,
                            snapPath: data.snapPath || '',
                            price: data.price || 0,
                        } as JewelryModel;
                    })
                );
                setModels(fetchedModels);
            } catch (error) {
                console.error(`Error fetching ${selectedType.id} models from Firestore: `, error);
                setModels([]); // Set to empty array on error
            } finally {
                setIsLoadingModels(false);
            }
        };

        fetchModels();
    }, [selectedType]);

    return (
        <>
            <header className="p-4 border-b">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <NacreluneLogo className="h-8 w-auto text-foreground" />
                    </div>
                    <Button variant="ghost" onClick={onBack}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('back_button')}
                    </Button>
                </div>
            </header>
            <main className="flex-grow p-4 md:p-8">
                <div className="container mx-auto">
                    <section>
                        <h2 className="text-3xl font-headline tracking-tight mb-4 text-center">{t('model_selection_title')}</h2>
                        <p className="text-muted-foreground mb-12 max-w-2xl mx-auto text-center">{t('model_selection_subtitle', { jewelryTypeName: t(`jewelry_types.${selectedType.id}`).toLowerCase() })}</p>
                        {isLoadingModels ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {models.map((model) => (
                                    <Card key={model.id} className="overflow-hidden group flex flex-col" onClick={() => onModelSelect(model)}>
                                        <div className="overflow-hidden relative">
                                            <Image src={model.displayImageUrl} alt={model.name} width={400} height={400} className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300" data-ai-hint="jewelry" />
                                            <div onClick={(e) => e.stopPropagation()}>
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
                                                        <Image src={model.displayImageUrl} alt={model.name} width={800} height={800} className="w-full h-auto object-contain rounded-lg" />
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </div>
                                        <CardContent className="p-4 flex-grow flex flex-col justify-between">
                                            <h3 className="text-lg font-headline flex-grow">{model.name}</h3>
                                            <Button variant="outline" size="sm" className="w-full mt-4">{t('select_button')}</Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </>
    );
}
