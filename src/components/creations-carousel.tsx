

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
import Autoplay from "embla-carousel-autoplay"
import { CreatorSearch } from './creator-search';


interface CreationsCarouselProps {
  creations: Creation[];
  locale: string;
}

export function CreationsCarousel({ creations, locale }: CreationsCarouselProps) {
  const t = useTranslations('HomePage');
  const plugin = React.useRef(
    Autoplay({ delay: 6000, stopOnInteraction: true })
  )

  return (
    <section>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-headline tracking-tight">{t('inspirations_title')}</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">{t('inspirations_subtitle')}</p>
      </div>

      <div className="mb-12">
        <CreatorSearch locale={locale} />
      </div>
      
      <Carousel
        plugins={[plugin.current]}
        opts={{
          align: 'start',
          loop: true,
        }}
        className="w-full"
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
      >
        <CarouselContent>
          {creations.map((creation) => (
            <CarouselItem key={creation.id} className="md:basis-1/2 lg:basis-1/4">
              <div className="p-1 h-full">
                <CreationCard creation={creation} locale={locale} showCreator={true} />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </section>
  );
}
