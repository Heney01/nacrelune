
import { HomePageClient } from '@/components/home-page-client';
import { getCharms, getJewelryTypesAndModels } from '@/lib/data';
import { getMessages } from '@/lib/translations';
import { CartProvider } from '@/hooks/use-cart';
import { Toaster } from '@/components/ui/toaster';

// The app currently supports three jewelry types.
// To add more, you would add them to this list. The `id` should correspond
// to the collection name in Firestore.
const BASE_JEWELRY_TYPES = [
  { id: 'necklace', name: 'Necklace', description: "A beautiful necklace" },
  { id: 'bracelet', name: 'Bracelet', description: "An elegant bracelet" },
  { id: 'earring', name: 'Earring', description: "A stylish earring" },
] as const;


export default async function Home({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { locale } = params;

  // Fetch all data in parallel
  const [jewelryTypes, allCharms, messages] = await Promise.all([
    getJewelryTypesAndModels(BASE_JEWELRY_TYPES),
    getCharms(),
    getMessages(locale),
  ]);

  return (
    <CartProvider>
      <HomePageClient
        searchParams={searchParams}
        jewelryTypes={jewelryTypes}
        allCharms={allCharms}
        locale={locale}
        messages