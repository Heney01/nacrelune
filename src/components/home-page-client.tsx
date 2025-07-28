
"use client";

import React from 'react';
import Editor from '@/components/editor';
import { NacreluneLogo } from '@/components/icons';
import { useTranslations, TranslationsProvider } from '@/hooks/use-translations';
import { Gem, HandMetal, Ear } from 'lucide-react';
import { TypeSelection } from '@/components/type-selection';
import { ModelSelection } from '@/components/model-selection';
import type { JewelryType, JewelryModel, Charm } from '@/lib/types';
import Link from 'next/link';
import { CartWidget } from './cart-widget';

export function HomePageClient({ searchParams, jewelryTypes: initialJewelryTypes, allCharms, locale, messages }: {
    searchParams: { [key: string]: string | string[] | undefined };
    jewelryTypes: Omit<JewelryType, 'icon'>[];
    allCharms: Charm[];
    locale: string;
    messages: any;
}) {
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
      return <Editor model={selectedModel} jewelryType={selectedType} allCharms={allCharms} />;
    }
  
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
         <header className="p-4 border-b bg-white">
          <div className="container mx-auto flex justify-between items-center">
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <NacreluneLogo className="h-8 w-auto text-foreground" />
            </Link>
            <CartWidget />
          </div>
        </header>

        <main className="flex-grow p-4 md:p-8">
          <div className="container mx-auto">
            {selectedType ? (
                <ModelSelection 
                    selectedType={selectedType}
                    locale={locale}
                />
            ) : (
                <TypeSelection jewelryTypes={jewelryTypes} locale={locale} />
            )}
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
