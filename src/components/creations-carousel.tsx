
'use client';

import React from 'react';
import { Creation } from '@/lib/types';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { useTranslations } from '@/hooks/use-translations';
import { CreationCard } from './creation-card';


interface CreationsCarouselProps {
  creations: Creation[];
  locale: string;
}

export function CreationsCarousel({ creations, locale }: CreationsCarouselProps) {
  const t = useTranslations('HomePage');

  return (
    <section>
      <h2 className="text-3xl font-headline tracking-tight mb-4 text-center">{t('inspirations_title')}</h2>
      <p className="text-muted-foreground mb-12 max-w-2xl mx-auto text-center">{t('inspirations_subtitle')}</p>
      
      <Carousel
        opts={{
          align: 'start',
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent>
          {creations.map((creation) => (
            <CarouselItem key={creation.id} className="md:basis-1/2 lg:basis-1/4">
              <div className="p-1 h-full">
                <CreationCard creation={creation} locale={locale} />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </section>
  );
}
