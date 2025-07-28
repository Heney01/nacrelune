"use client";

import React, { Suspense } from 'react';
import Editor from '@/components/editor';
import { NacreluneLogo } from '@/components/icons';
import { Gem, HandMetal, Ear } from 'lucide-react';
import { TypeSelection } from '@/components/type-selection';
import { ModelSelection } from '@/components/model-selection';
import type { JewelryType, JewelryModel, Charm } from '@/lib/types';
import Link from 'next/link';
import { CartWidget } from '@/components/cart-widget';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getJewelryTypesAndModels, getCharms } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';

const JEWELRY_TYPES_INFO: Omit<JewelryType, 'models' | 'icon'>[] = [
  { id: 'necklace', name: 'Colliers', description: "Chaînes et pendentifs gracieux." },
  { id: 'bracelet', name: 'Bracelets', description: "Un bijou de poignet élégant pour toute occasion." },
  { id: 'earring', name: 'Boucles d\'oreilles', description: "Des boucles d'oreilles stylées pour compléter votre look." },
];

function LoadingState() {
    return (
        <div className="min-h-screen flex flex-col bg-stone-50">
            <header className="p-4 border-b bg-white">
                <div className="container mx-auto flex justify-between items-center">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
            </header>
            <main className="flex-grow p-4 md:p-8">
                <div className="container mx-auto text-center">
                    <Skeleton className="h-8 w-1/2 mx-auto mb-4" />
                    <Skeleton className="h-4 w-3/4 mx-auto mb-12" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                </div>
            </main>
        </div>
    )
}

function PageContent() {
  const searchParams = useSearchParams();
  const [jewelryTypes, setJewelryTypes] = useState<JewelryType[]>([]);
  const [allCharms, setAllCharms] = useState<Charm[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [jewelryData, charmsData] = await Promise.all([
        getJewelryTypesAndModels(JEWELRY_TYPES_INFO),
        getCharms()
      ]);

      const typesWithIcons = jewelryData.map(jt => {
        if (jt.id === 'necklace') return { ...jt, icon: Gem };
        if (jt.id === 'bracelet') return { ...jt, icon: HandMetal };
        if (jt.id === 'earring') return { ...jt, icon: Ear };
        return { ...jt, icon: Gem }; // fallback
      });

      setJewelryTypes(typesWithIcons);
      setAllCharms(charmsData);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const selectedTypeId = searchParams.get('type') as JewelryType['id'] | undefined;
  const selectedModelId = searchParams.get('model') as string | undefined;

  const selectedType = selectedTypeId ? jewelryTypes.find(t => t.id === selectedTypeId) : null;
  const selectedModel = selectedType && selectedModelId ? selectedType.models.find(m => m.id === selectedModelId) : null;

  if (isLoading) {
    return <LoadingState />;
  }

  if (selectedModel && selectedType) {
    return <Editor model={selectedModel} jewelryType={selectedType} allCharms={allCharms} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
       <header className="p-4 border-b bg-white">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
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
              />
          ) : (
              <TypeSelection jewelryTypes={jewelryTypes} />
          )}
        </div>
      </main>
      
      <footer className="p-4 border-t mt-auto bg-white">
        <div className="container mx-auto text-center text-muted-foreground text-sm">
          © {new Date().getFullYear()} Nacrelune. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
    return (
        <Suspense fallback={<LoadingState />}>
            <PageContent />
        </Suspense>
    )
}