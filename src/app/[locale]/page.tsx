
import React from 'react';
import { getJewelryTypesAndModels, getCharms } from '@/lib/data';
import type { JewelryType, Charm } from '@/lib/types';
import { HomePageClient } from '@/components/home-page-client';
import { getMessages } from '@/lib/translations';

const JEWELRY_TYPES_INFO: Omit<JewelryType, 'models' | 'icon'>[] = [
  { id: 'necklace', name: 'Necklaces', description: "Graceful chains and pendants." },
  { id: 'bracelet', name: 'Bracelets', description: "Elegant wristwear for any occasion." },
  { id: 'earring', name: 'Earrings', description: "Stylish earrings to complete your look." },
];

export default async function Home({ searchParams, params: { locale } }: {
  searchParams: { [key: string]: string | string[] | undefined };
  params: { locale: string };
}) {
  // Fetch all data on the server
  const jewelryTypesData = await getJewelryTypesAndModels(JEWELRY_TYPES_INFO);
  const charms = await getCharms();
  const messages = await getMessages(locale);
  
  return (
    <HomePageClient
      searchParams={searchParams}
      jewelryTypes={jewelryTypesData}
      allCharms={charms}
      locale={locale}
      messages={messages}
    />
  );
}
