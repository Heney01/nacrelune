
"use client";

import React, { useState, useEffect } from 'react';
import type { JewelryModel, JewelryType, PlacedCharm } from '@/lib/types';
import { JEWELRY_TYPES } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, ZoomIn } from 'lucide-react';
import Image from 'next/image';
import Editor from '@/components/editor';
import { NacreluneLogo } from '@/components/icons';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { ref, getDownloadURL } from "firebase/storage";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useTranslations } from '@/hooks/use-translations';

type Step = 'type-selection' | 'model-selection' | 'editor';

export default function Home() {
  const t = useTranslations('HomePage');
  const [step, setStep] = useState<Step>('type-selection');
  const [selectedType, setSelectedType] = useState<JewelryType | null>(null);
  const [selectedModel, setSelectedModel] = useState<JewelryModel | null>(null);
  const [models, setModels] = useState<JewelryModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

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

  const handleTypeSelect = async (type: JewelryType) => {
    setSelectedType(type);
    setStep('model-selection');
    setIsLoadingModels(true);
    try {
      const querySnapshot = await getDocs(collection(db, type.id));
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
          } as JewelryModel;
        })
      );
      setModels(fetchedModels);
    } catch (error) {
      console.error(`Error fetching ${type.id} models from Firestore: `, error);
      // Fallback to static data in case of an error
      const modelsWithUrls = await Promise.all(
        type.models.map(async (model) => {
          const displayImageUrl = await getUrl(model.displayImageUrl);
          const editorImageUrl = await getUrl(model.editorImageUrl);
          return {
            ...model,
            displayImageUrl,
            editorImageUrl,
          };
        })
      );
      setModels(modelsWithUrls);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleModelSelect = (model: JewelryModel) => {
    setSelectedModel(model);
    setStep('editor');
  };

  const handleBack = () => {
    if (step === 'editor') {
      setStep('model-selection');
    } else if (step === 'model-selection') {
      setStep('type-selection');
      setSelectedType(null);
      setModels([]);
    }
  };
  
  const renderStep = () => {
    switch (step) {
      case 'type-selection':
        return (
          <>
            <div className="flex items-center gap-2 p-4">
              <NacreluneLogo className="h-8 w-auto text-foreground" />
            </div>
            <main className="flex-grow p-4 md:p-8">
              <div className="container mx-auto">
                <section className="text-center">
                  <h2 className="text-3xl font-headline tracking-tight mb-4">{t('title')}</h2>
                  <p className="text-muted-foreground mb-12 max-w-2xl mx-auto">{t('subtitle')}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {JEWELRY_TYPES.map((type) => (
                      <Card key={type.id} className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-transform duration-300" onClick={() => handleTypeSelect(type)}>
                        <CardContent className="p-6 flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                             <type.icon className="w-8 h-8 text-primary" />
                          </div>
                          <h3 className="text-xl font-headline">{t(`jewelry_types.${type.id}`)}</h3>
                          <p className="text-sm text-muted-foreground">{t(`jewelry_types.${type.id}_description`)}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              </div>
            </main>
          </>
        );
      case 'model-selection':
        if (!selectedType) return null;
        return (
          <>
             <header className="p-4 border-b">
                <div className="container mx-auto flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <NacreluneLogo className="h-8 w-auto text-foreground" />
                  </div>
                  <Button variant="ghost" onClick={handleBack}>
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
                        <Card key={model.id} className="overflow-hidden group flex flex-col" onClick={() => handleModelSelect(model)}>
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
      case 'editor':
        if (!selectedModel || !selectedType) return null;
        return <Editor model={selectedModel} jewelryType={selectedType} onBack={handleBack} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {renderStep()}
      <footer className="p-4 border-t mt-auto bg-white">
        <div className="container mx-auto text-center text-muted-foreground text-sm">
          {t('footer_text', { year: new Date().getFullYear() })}
        </div>
      </footer>
    </div>
  );
}
