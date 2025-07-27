
"use client";

import React, { useState } from 'react';
import type { JewelryModel, JewelryType, PlacedCharm } from '@/lib/types';
import Editor from '@/components/editor';
import { NacreluneLogo } from '@/components/icons';
import { useTranslations } from '@/hooks/use-translations';
import { useParams } from 'next/navigation';
import { Gem, HandMetal, Ear } from 'lucide-react';
import { TypeSelection } from '@/components/type-selection';
import { ModelSelection } from '@/components/model-selection';

const JEWELRY_TYPES: Omit<JewelryType, 'models'>[] = [
  { id: 'necklace', name: 'Necklaces', icon: Gem, description: "Graceful chains and pendants." },
  { id: 'bracelet', name: 'Bracelets', icon: HandMetal, description: "Elegant wristwear for any occasion." },
  { id: 'earring', name: 'Earrings', icon: Ear, description: "Stylish earrings to complete your look." },
];

type Step = 'type-selection' | 'model-selection' | 'editor';

export default function Home() {
  const t = useTranslations('HomePage');
  const params = useParams();
  const locale = Array.isArray(params.locale) ? params.locale[0] : params.locale;
  const [step, setStep] = useState<Step>('type-selection');
  const [selectedType, setSelectedType] = useState<Omit<JewelryType, 'models'> | null>(null);
  const [selectedModel, setSelectedModel] = useState<JewelryModel | null>(null);

  const handleTypeSelect = (type: Omit<JewelryType, 'models'>) => {
    setSelectedType(type);
    setStep('model-selection');
  };

  const handleModelSelect = (model: JewelryModel) => {
    setSelectedModel(model);
    setStep('editor');
  };

  const handleBack = () => {
    if (step === 'editor') {
      setStep('model-selection');
      // Keep selectedType so we can go back to the correct model list
    } else if (step === 'model-selection') {
      setStep('type-selection');
      setSelectedType(null);
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
                 <TypeSelection jewelryTypes={JEWELRY_TYPES} onTypeSelect={handleTypeSelect} />
              </div>
            </main>
          </>
        );
      case 'model-selection':
        if (!selectedType) return null;
        return (
          <ModelSelection 
            selectedType={selectedType}
            onModelSelect={handleModelSelect}
            onBack={handleBack}
          />
        );
      case 'editor':
        if (!selectedModel || !selectedType || !locale) return null;
        return <Editor model={selectedModel} jewelryType={selectedType} onBack={handleBack} locale={locale} />;
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
