
import React from 'react';
import { getJewelryTypesAndModels, getCharms } from '@/lib/data';
import type { JewelryType, Charm } from '@/lib/types';
import { HomePageClient } from '@/components/home-page-client';
import { getMessages, getStaticParams } from '@/lib/translations';
import { useTranslations } from 'next-intl';

export async function generateStaticParams() {
    return getStaticParams();
}

export default async function Home({ searchParams, params }: {
  searchParams: { [key: string]: string | string[] | undefined };
  params: { locale: string };
}) {
  const messages = await getMessages(params.locale);
  const jewelryTypeMessages = messages.HomePage.jewelry_types;

  const JEWELRY_TYPES_INFO: Omit<JewelryType, 'models' | 'icon'>[] = [
    { id: 'necklace', name: jewelryTypeMessages.necklace, description: jewelryTypeMessages.necklace_description },
    { id: 'bracelet', name: jewelryTypeMessages.bracelet, description: jewelryTypeMessages.bracelet_description },
    { id: 'earring', name: jewelryTypeMessages.earring, description: jewelryTypeMessages.earring_description },
  ];

  // Fetch all data on the server
  const jewelryTypesData = await getJewelryTypesAndModels(JEWELRY_TYPES_INFO);
  const charms = await getCharms();
  
  return (
    <HomePageClient
      searchParams={searchParams}
      jewelryTypes={jewelryTypesData}
      allCharms={charms}
      locale={params.locale}
      messages={messages}
    />
  );
}
