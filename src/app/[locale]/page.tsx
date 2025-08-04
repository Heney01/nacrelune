

import React from 'react';
import { getJewelryTypesAndModels, getFullCharmData, getRecentCreations } from '@/lib/data';
import type { JewelryType, Charm, CharmCategory, Creation } from '@/lib/types';
import { HomePageClient } from '@/components/home-page-client';
import { getStaticParams } from '@/lib/translations';

export async function generateStaticParams() {
    return getStaticParams();
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
  
  return (
    <HomePageClient
      searchParams={searchParams}
      jewelryTypes={jewelryTypesData}
      allCharms={charms}
      charmCategories={charmCategories}
      recentCreations={recentCreations}
      locale={params.locale}
    />
  );
}
