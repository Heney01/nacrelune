

'use client';

import React, { useEffect, useState } from 'react';
import Editor from '@/components/editor';
import { BrandLogo } from '@/components/icons';
import { useTranslations } from '@/hooks/use-translations';
import { Gem, HandMetal, Ear, Truck, UserCircle, LogOut } from 'lucide-react';
import { TypeSelection } from '@/components/type-selection';
import { ModelSelection } from '@/components/model-selection';
import type { JewelryType, Charm, CharmCategory, Creation } from '@/lib/types';
import Link from 'next/link';
import { CartWidget } from './cart-widget';
import { Button } from './ui/button';
import { SupportDialog } from './support-dialog';
import { UserNav } from './user-nav';
import { CreationsCarousel } from './creations-carousel';
import { Separator } from './ui/separator';
import { CreatorSearch } from './creator-search';
import { useIsMobile } from '@/hooks/use-mobile';

export function HomePageClient({ searchParams, jewelryTypes: initialJewelryTypes, allCharms, charmCategories, recentCreations, locale }: {
    searchParams: { [key:string]: string | string[] | undefined };
    jewelryTypes: Omit<JewelryType, 'icon'>[];
    allCharms: Charm[];
    charmCategories: CharmCategory[];
    recentCreations: Creation[];
    locale: string;
}) {
    const t = useTranslations('HomePage');
    const isMobile = useIsMobile();
    
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
      return <Editor model={selectedModel} jewelryType={selectedType} allCharms={allCharms} charmCategories={charmCategories} />;
    }
  
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
         <header className="p-4 border-b bg-white">
          <div className="container mx-auto">
            <div className="flex justify-between items-center">
              <div className="flex flex-col items-start">
                  <Link href={`/${locale}`} className="flex items-center gap-2">
                    <BrandLogo className="h-8 w-auto text-foreground" />
                  </Link>
                  {isMobile && (
                    <div className="flex items-center gap-1 -ml-2 mt-1">
                      <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                        <Link href={`/${locale}/orders/track`}>
                          <Truck className="h-4 w-4" />
                          <span className="sr-only">{t('track_order_link')}</span>
                        </Link>
                      </Button>
                      <CartWidget />
                    </div>
                  )}
              </div>
              <div className="flex items-center gap-2">
                {!isMobile && (
                   <>
                    <Button asChild variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                        <Link href={`/${locale}/orders/track`}>
                            <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="sr-only">{t('track_order_link')}</span>
                        </Link>
                    </Button>
                    <CartWidget />
                   </>
                )}
                <div className="ml-2">
                  <UserNav locale={locale} />
                </div>
              </div>
            </div>
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
              <>
                <TypeSelection jewelryTypes={jewelryTypes} locale={locale} />
                
                {recentCreations.length > 0 && (
                  <>
                    <Separator className="my-8 md:my-4" />
                    <CreationsCarousel creations={recentCreations} locale={locale} />
                  </>
                )}
              </>
            )}
          </div>
        </main>
        
        <footer className="p-4 border-t mt-auto bg-white">
          <div className="container mx-auto text-center text-muted-foreground text-sm space-y-2">
            <p>{t('footer_text', { year: new Date().getFullYear() })}</p>
             <div className="flex justify-center items-center gap-4 text-xs text-muted-foreground/80">
                <SupportDialog />
                 <Link href={`/${locale}/admin/login`} className="hover:underline">
                    {t('admin_area_link')}
                </Link>
            </div>
          </div>
        </footer>
      </div>
    );
}
