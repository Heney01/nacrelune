

'use client';

import React from 'react';
import Editor from '@/components/editor';
import { BrandLogo } from '@/components/icons';
import { useTranslations } from '@/hooks/use-translations';
import { Gem, HandMetal, Ear, Truck, Construction } from 'lucide-react';
import { TypeSelection } from '@/components/type-selection';
import { ModelSelection } from '@/components/model-selection';
import type { JewelryType, Charm } from '@/lib/types';
import Link from 'next/link';
import { CartWidget } from './cart-widget';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { SupportDialog } from './support-dialog';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';


export function HomePageClient({ searchParams, jewelryTypes: initialJewelryTypes, allCharms, locale }: {
    searchParams: { [key:string]: string | string[] | undefined };
    jewelryTypes: Omit<JewelryType, 'icon'>[];
    allCharms: Charm[];
    locale: string;
}) {
    const t = useTranslations('HomePage');
    
    const jewelryTypes = initialJewelryTypes.map(jt => {
        if (jt.id === 'necklace') return { ...jt, name: t('jewelry_types.necklace'), description: t('jewelry_types.necklace_description'), icon: Gem };
        if (jt.id === 'bracelet') return { ...jt, name: t('jewelry_types.bracelet'), description: t('jewelry_types.bracelet_description'), icon: HandMetal };
        if (jt.id === 'earring') return { ...jt, name: t('jewelry_types.earring'), description: t('jewelry_types.earring_description'), icon: Ear };
        return { ...jt, icon: Gem }; // fallback
    });
    
    const selectedTypeId = searchParams?.type as JewelryType['id'] | undefined;
    const selectedModelId = searchParams?.model as string | undefined;

    const selectedType = selectedTypeId ? jewelryTypes.find(t => t.id === selectedTypeId) : null;
    const selectedModel = selectedType && selectedModelId ? selectedType.models.find(m => m.id === selectedModelId) : null;
    
    if (selectedModel && selectedType) {
      return <Editor model={selectedModel} jewelryType={selectedType} allCharms={allCharms} />;
    }
  
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
         <header className="p-4 border-b bg-white">
          <div className="container mx-auto flex justify-between items-center flex-wrap">
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <BrandLogo className="h-8 w-auto text-foreground" />
            </Link>
            <div className="flex items-center gap-2 flex-wrap">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button asChild variant="ghost" size="icon">
                                <Link href={`/${locale}/orders/track`}>
                                    <Truck className="h-6 w-6" />
                                    <span className="sr-only">{t('track_order_link')}</span>
                                </Link>
                            </Button>
                        </TooltipTrigger>
                         <TooltipContent>
                            <p>{t('track_order_link')}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
              <CartWidget />
            </div>
          </div>
        </header>

        <main className="flex-grow p-4 md:p-8">
          <div className="container mx-auto">
            <Alert className="mb-8 border-yellow-400 bg-yellow-50 text-yellow-800 [&>svg]:text-yellow-600">
                <Construction />
                <AlertTitle>{t('wip_title')}</AlertTitle>
                <AlertDescription>
                    {t('wip_description')}
                </AlertDescription>
            </Alert>
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
          <div className="container mx-auto text-center text-muted-foreground text-sm space-y-2">
            <p>{t('footer_text', { year: new Date().getFullYear() })}</p>
             <div className="flex justify-center items-center gap-4 text-xs text-muted-foreground/80">
                <SupportDialog />
                 <Link href={`/${locale}/login`} className="hover:underline">
                    {t('admin_area_link')}
                </Link>
            </div>
          </div>
        </footer>
      </div>
    );
}
