

'use client';

import React from 'react';
import Image from 'next/image';
import { PlacedCharm, Charm } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Layers, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/hooks/use-translations';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

interface PlacedCharmsListProps {
  placedCharms: (PlacedCharm & { isAvailable: boolean })[];
  selectedPlacedCharmId: string | null;
  onCharmClick: (charmId: string) => void;
  onCharmDelete: (charmId: string) => void;
  isMobile: boolean;
}

const CharmListItem = ({
  placedCharm,
  isSelected,
  onClick,
  onDelete,
  t,
}: {
  placedCharm: PlacedCharm & { isAvailable: boolean };
  isSelected: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  t: (key: string, values?: any) => string;
}) => (
  <div
    className={cn(
      "p-2 rounded-md border flex flex-col items-center gap-1 cursor-pointer w-20 relative group",
      isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50',
      !placedCharm.isAvailable && "bg-destructive/10"
    )}
    onClick={onClick}
  >
    <Image src={placedCharm.charm.imageUrl} alt={placedCharm.charm.name} width={32} height={32} className="w-8 h-8 object-contain" />
    <span className="text-xs text-center font-medium truncate w-full">{placedCharm.charm.name}</span>
    {!placedCharm.isAvailable && (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="absolute inset-0 z-10">
            <span className="sr-only">Stock issue</span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('stock_issue_tooltip')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )}
  </div>
);

export function PlacedCharmsList({
  placedCharms,
  selectedPlacedCharmId,
  onCharmClick,
  onCharmDelete,
  isMobile,
}: PlacedCharmsListProps) {
  const t = useTranslations('Editor');

  const charmListContent = (
    placedCharms.length === 0 ? (
      <p className="text-muted-foreground text-sm text-center py-4">{t('added_charms_placeholder')}</p>
    ) : (
      <div className={cn(
        isMobile ? "flex gap-2 pb-4 pt-2 pl-2 flex-wrap" : "flex w-max space-x-2 p-4 flex-nowrap"
      )}>
        {placedCharms.map((pc) => (
          <CharmListItem
            key={pc.id}
            placedCharm={pc}
            isSelected={selectedPlacedCharmId === pc.id}
            onClick={() => onCharmClick(pc.id)}
            onDelete={(e) => {
              e.stopPropagation();
              onCharmDelete(pc.id);
            }}
            t={t}
          />
        ))}
      </div>
    )
  );

  if (isMobile) {
    return (
        <div className="flex-grow overflow-y-auto h-full p-4">
            {charmListContent}
        </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
      <AccordionItem value="item-1">
        <Card>
          <AccordionTrigger className="p-6 hover:no-underline">
            <CardHeader className="p-0">
              <CardTitle className="font-headline text-lg flex items-center gap-2">
                <Layers /> {t('added_charms_title', { count: placedCharms.length })}
              </CardTitle>
            </CardHeader>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent className="pt-2">
              <ScrollArea className="w-full whitespace-nowrap" orientation="horizontal">
                {charmListContent}
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </AccordionContent>
        </Card>
      </AccordionItem>
    </Accordion>
  );
}

    
