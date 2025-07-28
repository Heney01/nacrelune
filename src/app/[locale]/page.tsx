
import React from 'react';
import { getJewelryTypesAndModels, getCharms } from '@/lib/data';
import type { JewelryType, Charm } from '@/lib/types';
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

  const jewelryTypesData = await getJewelryTypesAndModels(JEWELRY_TYPES_INFO);
  const charms = await getCharms();
  
  return (
    <HomePageClient
      searchParams={searchParams}
      jewelryTypes={jewelryTypesData}
      allCharms={charms}
      locale={params.locale}
    />
  );
}
