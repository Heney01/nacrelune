
"use client";

import React, { useState, useEffect } from 'react';
import type { JewelryModel, JewelryType, PlacedCharm } from '@/lib/types';
import { JEWELRY_TYPES } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Editor from '@/components/editor';
import { NacreluneLogo } from '@/components/icons';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { ref, getDownloadURL } from "firebase/storage";

type Step = 'type-selection' | 'model-selection' | 'editor';

export default function Home() {
  const [step, setStep] = useState<Step>('type-selection');
  const [selectedType, setSelectedType] = useState<JewelryType | null>(null);
  const [selectedModel, setSelectedModel] = useState<JewelryModel | null>(null);
  const [models, setModels] = useState<JewelryModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const handleTypeSelect = async (type: JewelryType) => {
    setSelectedType(type);
    setStep('model-selection');
    setIsLoadingModels(true);
    try {
      if (type.id === 'necklace') {
        const querySnapshot = await getDocs(collection(db, "necklace"));
        const fetchedModels = await Promise.all(querySnapshot.docs.map(async (doc) => {
          const data = doc.data();
          let imageUrl = data.imageUrl || 'https://placehold.co/800x800.png';
          // If imageUrl is a path in storage, get the download URL
          if (imageUrl && !imageUrl.startsWith('http')) {
            try {
              const storageRef = ref(storage, imageUrl);
              imageUrl = await getDownloadURL(storageRef);
            } catch (error) {
              console.error("Error getting download URL: ", error);
              // Fallback to a placeholder if the image can't be fetched
              imageUrl = 'https://placehold.co/800x800.png';
            }
          }
          return {
            id: doc.id,
            name: data.name,
            imageUrl: imageUrl
          } as JewelryModel;
        }));
        setModels(fetchedModels);
      } else {
        // For other types, we can implement similar logic or use static data
        setModels(type.models);
      }
    } catch (error) {
      console.error("Error fetching models: ", error);
      // Fallback to static data in case of error
      setModels(type.models);
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
  
  const Header = () => (
     <header className="p-4 border-b">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <NacreluneLogo className="h-8 w-auto text-foreground" />
          </div>
          {step !== 'type-selection' && (
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
        </div>
      </header>
  );

  const renderStep = () => {
    switch (step) {
      case 'type-selection':
        return (
          <>
            <div className="flex items-center gap-2 p-4">
              <NacreluneLogo className="h-8 w-auto text-foreground" />
              <h1 className="text-2xl font-headline tracking-tight">Nacrelune</h1>
            </div>
            <main className="flex-grow p-4 md:p-8">
              <div className="container mx-auto">
                <section className="text-center">
                  <h2 className="text-3xl font-headline tracking-tight mb-4">Begin Your Creation</h2>
                  <p className="text-muted-foreground mb-12 max-w-2xl mx-auto">Choose a jewelry type to start designing. Each piece is a canvas for your story, waiting to be adorned with charms that speak to you.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {JEWELRY_TYPES.map((type) => (
                      <Card key={type.id} className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-transform duration-300" onClick={() => handleTypeSelect(type)}>
                        <CardContent className="p-6 flex flex-col items-center gap-4">
                          <type.icon className="w-16 h-16 text-primary" />
                          <h3 className="text-xl font-headline">{type.name}</h3>
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
            <Header />
            <main className="flex-grow p-4 md:p-8">
              <div className="container mx-auto">
                <section>
                  <h2 className="text-3xl font-headline tracking-tight mb-4 text-center">Select a Model</h2>
                  <p className="text-muted-foreground mb-12 max-w-2xl mx-auto text-center">Select a beautiful {selectedType.name.toLowerCase()} model as the foundation for your custom design.</p>
                  {isLoadingModels ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="h-16 w-16 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                      {models.map((model) => (
                        <Card key={model.id} className="cursor-pointer hover:shadow-lg overflow-hidden group" onClick={() => handleModelSelect(model)}>
                          <div className="overflow-hidden">
                            <Image src={model.imageUrl} alt={model.name} width={400} height={400} className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300" data-ai-hint="jewelry" />
                          </div>
                          <CardContent className="p-6">
                            <h3 className="text-lg font-headline">{model.name}</h3>
                            <p className="text-sm text-muted-foreground">{model.description}</p>
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
    <div className="min-h-screen flex flex-col">
      {renderStep()}
      <footer className="p-4 border-t mt-auto">
        <div className="container mx-auto text-center text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} Nacrelune. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
