
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Creation } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { useTranslations } from '@/hooks/use-translations';
import { Heart, User, Loader2 } from 'lucide-react';
import { toggleLikeCreation } from '@/app/actions/creation.actions';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CreationsCarouselProps {
  creations: Creation[];
  locale: string;
}

function CreationCard({ creation, locale }: { creation: Creation; locale: string }) {
  const t = useTranslations('HomePage');
  const [optimisticLikes, setOptimisticLikes] = useState(creation.likesCount);
  const { firebaseUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!firebaseUser) {
      toast({
        variant: 'destructive',
        title: "Connexion requise",
        description: "Vous devez être connecté pour aimer une création.",
      });
      return;
    }

    setOptimisticLikes(prev => prev + 1); // Optimistic update

    try {
      const idToken = await firebaseUser.getIdToken();
      const result = await toggleLikeCreation(creation.id, idToken);
      if (!result.success) {
        setOptimisticLikes(prev => prev - 1); // Revert on error
        toast({ variant: 'destructive', title: "Erreur", description: result.message });
      } else if (result.newLikesCount !== undefined) {
        setOptimisticLikes(result.newLikesCount); // Sync with actual count
      }
    } catch (error) {
      setOptimisticLikes(prev => prev - 1); // Revert on error
      toast({ variant: 'destructive', title: "Erreur", description: "Une erreur inattendue est survenue." });
    }
  };
  
  const handleUseAsTemplate = () => {
    setIsLoading(true);
  }

  const editUrl = `/${locale}?type=${creation.jewelryTypeId}&model=${creation.modelId}&creationId=${creation.id}`;

  return (
    <Card className="overflow-hidden group flex flex-col h-full">
      <Link href={editUrl} className="contents" onClick={handleUseAsTemplate}>
        <div className="bg-muted/50 aspect-square relative overflow-hidden">
          <Image
            src={creation.previewImageUrl}
            alt={creation.name}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className="object-contain group-hover:scale-105 transition-transform duration-300"
          />
           {isLoading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )}
        </div>
        <CardContent className="p-4 flex-grow flex flex-col justify-between">
          <div>
            <h3 className="font-headline text-lg truncate">{creation.name}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {creation.creatorName}
            </p>
          </div>
          <div className="flex justify-between items-center mt-4">
             <Button variant="outline" size="sm">
              {t('use_as_template')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1.5"
              onClick={handleLikeClick}
            >
              <Heart className={cn("h-4 w-4", optimisticLikes > 0 && "text-primary fill-current")} />
              <span>{optimisticLikes}</span>
            </Button>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
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
