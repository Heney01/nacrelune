
import React from 'react';
import { getJewelryTypesAndModels, getFullCharmData, getRecentCreations } from '@/lib/data';
import type { JewelryType, Charm, CharmCategory, Creation, PlacedCharm } from '@/lib/types';
import { HomePageClient } from '@/components/home-page-client';
import { getStaticParams } from '@/lib/translations';

export async function generateStaticParams() {
    return getStaticParams();
}

async function restoreCreationFromUrl(searchParams: { [key: string]: string | string[] | undefined }, allCharms: Charm[]): Promise<PlacedCharm[] | null> {
    const charmsParam = searchParams?.charms as string | undefined;
    if (!charmsParam) {
        return null;
    }

    try {
        const decodedCharms = JSON.parse(decodeURIComponent(charmsParam));
        if (!Array.isArray(decodedCharms)) return null;

        const charmsMap = new Map(allCharms.map(c => [c.id, c]));

        const restoredPlacedCharms: PlacedCharm[] = decodedCharms.map((pc: any, index: number) => {
            const charmData = charmsMap.get(pc.id);
            if (!charmData) return null;
            return {
                id: `${pc.id}-${Date.now()}-${index}`,
                charm: charmData,
                position: { x: pc.x, y: pc.y },
                rotation: pc.r,
            };
        }).filter((c): c is PlacedCharm => c !== null);

        return restoredPlacedCharms;
    } catch (e) {
        console.error("Failed to parse charms from URL", e);
        return null;
    }
}

export default async function Home({ searchParams, params }: {
  searchParams: { [key: string]: string | string[] | undefined };
  params: { locale: string };
}) {
  const JEWELRY_TYPES_INFO: Omit<JewelryType, 'models' | 'icon'>[] = [
    { id: 'necklace', name: "Necklaces", description: "Graceful chains and pendants." },
    { id: 'bracelet', name: "Bracelets", description: "Elegant wristwear for any occasion." },
    { id: 'earring', name: "Earrings", description: "Stylish earrings to complete your look." },
  ];

  const [jewelryTypesData, { charms, charmCategories }, recentCreations] = await Promise.all([
    getJewelryTypesAndModels(JEWELRY_TYPES_INFO),
    getFullCharmData(),
    getRecentCreations(),
  ]);
  
  const restoredPlacedCharms = await restoreCreationFromUrl(searchParams, charms);
  
  const editorInitialState = restoredPlacedCharms ? { placedCharms: restoredPlacedCharms } : null;

  return (
    <HomePageClient
      searchParams={searchParams}
      jewelryTypes={jewelryTypesData}
      allCharms={charms}
      charmCategories={charmCategories}
      recentCreations={recentCreations}
      locale={params.locale}
      editorInitialState={editorInitialState}
    />
  );
}
