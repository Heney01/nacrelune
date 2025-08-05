
'use client';

import { useState, useEffect } from 'react';
import { Creation } from '@/lib/types';
import { getAllCreations } from '@/lib/data';
import { CreationCard } from '@/components/creation-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Loading from '../loading';
import { BrandLogo } from '@/components/icons';
import { CartWidget } from '@/components/cart-widget';
import { UserNav } from '@/components/user-nav';

export default function AllCreationsPage({ params }: { params: { locale: string } }) {
  const [creations, setCreations] = useState<Creation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreations = async () => {
      setLoading(true);
      const allCreations = await getAllCreations();
      setCreations(allCreations);
      setLoading(false);
    };
    fetchCreations();
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-stone-50">
       <header className="p-4 border-b bg-white sticky top-0 z-20">
        <div className="container mx-auto flex justify-between items-center">
          <Link href={`/${params.locale}`} className="flex items-center gap-2">
            <BrandLogo className="h-8 w-auto text-foreground" />
          </Link>
          <div className="flex items-center gap-2">
            <CartWidget />
            <UserNav locale={params.locale} />
          </div>
        </div>
      </header>
      <main className="flex-grow p-4 md:p-8">
        <div className="container mx-auto">
          <div className="flex justify-start mb-8">
            <Button variant="ghost" asChild>
              <Link href={`/${params.locale}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à l'accueil
              </Link>
            </Button>
          </div>
          <div className="text-center mb-12">
            <h1 className="text-3xl font-headline tracking-tight">Toutes les créations</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">Explorez l'ensemble des bijoux imaginés par notre communauté.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {creations.map((creation) => (
              <CreationCard key={creation.id} creation={creation} locale={params.locale} showCreator={true} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
