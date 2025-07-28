
"use client";

import React from 'react';
import Editor from '@/components/editor';
import { NacreluneLogo } from '@/components/icons';
import { useTranslations, TranslationsProvider } from '@/hooks/use-translations';
import { Gem, HandMetal, Ear } from 'lucide-react';
import { TypeSelection } from '@/components/type-selection';
import { ModelSelection } from '@/components/model-selection';
import type { JewelryType, JewelryModel, Charm } from '@/lib/types';

// This is a client component that wraps the main page logic
export function HomePageClient({ searchParams, jewelryTypes: initialJewelryTypes, allCharms, locale, messages }: {
    searchParams: { [key: string]: string | string[] | undefined };
    jewelryTypes: Omit<JewelryType, 'icon'>[];
    allCharms: Charm[];
    locale: string;
    messages: any;
}) {
    // Re-associate icons on the client side
    const jewelryTypes = initialJewelryTypes.map(jt => {
        if (jt.id === 'necklace') return { ...jt, icon: Gem };
        if (jt.id === 'bracelet') return { ...jt, icon: HandMetal };
        if (jt.id === 'earring') return { ...jt, icon: Ear };
        return { ...jt, icon: Gem }; // fallback
    });
    
    const selectedTypeId = searchParams?.type as JewelryType['id'] | undefined;
    const selectedModelId = searchParams?.model as string | undefined;

    const selectedType = selectedTypeId ? jewelryTypes.find(t => t.id === selectedTypeId) : null;
    const selectedModel = selectedType && selectedModelId ? selectedType.models.find(m => m.id === selectedModelId) : null;
    
    return (
        <TranslationsProvider messages={messages}>
            <PageContent 
                selectedType={selectedType}
                selectedModel={selectedModel}
                jewelryTypes={jewelryTypes}
                allCharms={allCharms}
                locale={locale}
            />
        </TranslationsProvider>
    )
}

function PageContent({ selectedType, selectedModel, jewelryTypes, allCharms, locale }: {
    selectedType: JewelryType | null;
    selectedModel: JewelryModel | null;
    jewelryTypes: JewelryType[];
    allCharms: Charm[];
    locale: string;
}) {
    const t = useTranslations('HomePage');
  
    if (selectedModel && selectedType) {
      return <Editor model={selectedModel} jewelryType={selectedType} allCharms={allCharms} locale={locale} />;
    }
  
    if (selectedType) {
      return (
        <div className="min-h-screen flex flex-col bg-stone-50">
          <ModelSelection 
            selectedType={selectedType}
          />
          <footer className="p-4 border-t mt-auto bg-white">
            <div className="container mx-auto text-center text-muted-foreground text-sm">
              {t('footer_text', { year: new Date().getFullYear() })}
            </div>
          </footer>
        </div>
      );
    }
  
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
         <div className="flex items-center gap-2 p-4">
          <NacreluneLogo className="h-8 w-auto text-foreground" />
        </div>
        <main className="flex-grow p-4 md:p-8">
          <div className="container mx-auto">
              <TypeSelection jewelryTypes={jewelryTypes} />
          </div>
        </main>
        <footer className="p-4 border-t mt-auto bg-white">
          <div className="container mx-auto text-center text-muted-foreground text-sm">
            {t('footer_text', { year: new Date().getFullYear() })}
          </div>
        </footer>
      </div>
    );
}
