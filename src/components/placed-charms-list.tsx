

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
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

interface PlacedCharmsListProps {
  placedCharms: (PlacedCharm & { isAvailable: boolean })[];
  selectedPlacedCharmId: string | null;
  onCharmClick: (charmId: string) => void;
  onCharmDelete: (charmId: string) => void;
  onToggleClasp: (charmId: string, withClasp: boolean) => void;
  isMobile: boolean;
}

const CharmListItem = ({
  placedCharm,
  isSelected,
  onClick,
  onDelete,
  onToggleClasp,
  t,
  tCart,
}: {
  placedCharm: PlacedCharm & { isAvailable: boolean };
  isSelected: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onToggleClasp: (withClasp: boolean) => void;
  t: (key: string, values?: any) => string;
  tCart: (key: string, values?: any) => string;
}) => {
    return (
        <div
            className={cn(
            "p-2 rounded-md border flex flex-col items-center gap-2 cursor-pointer w-32 relative group text-center",
            isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50',
            !placedCharm.isAvailable && "bg-destructive/10"
            )}
            onClick={onClick}
        >
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-20 text-destructive hover:text-destructive"
                onClick={onDelete}
                aria-label="Supprimer la breloque"
            >
                <Trash2 className="h-3.5 w-3.5" />
            </Button>

            <Image src={placedCharm.charm.imageUrl} alt={placedCharm.charm.name} width={40} height={40} className="w-10 h-10 object-contain" />
            <span className="text-xs font-medium truncate w-full">{placedCharm.charm.name}</span>
            
            <div 
                className="flex items-center space-x-2 text-xs" 
                onClick={(e) => e.stopPropagation()}
            >
                <Checkbox 
                    id={`clasp-${placedCharm.id}`} 
                    checked={placedCharm.withClasp}
                    onCheckedChange={(checked) => onToggleClasp(!!checked)}
                />
                <Label htmlFor={`clasp-${placedCharm.id}`} className="cursor-pointer">Avec fermoir</Label>
            </div>
            
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
    )
};

export function PlacedCharmsList({
  placedCharms,
  selectedPlacedCharmId,
  onCharmClick,
  onCharmDelete,
  onToggleClasp,
  isMobile,
}: PlacedCharmsListProps) {
  const t = useTranslations('Editor');
  const tCart = useTranslations('Cart');

  const charmListContent = (
    placedCharms.length === 0 ? (
      <p className="text-muted-foreground text-sm text-center py-4">{t('added_charms_placeholder')}</p>
    ) : (
      <div className={cn(
        isMobile ? "flex gap-2 pb-4 pt-2 flex-wrap" : "flex w-max space-x-2 p-4 flex-nowrap"
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
            onToggleClasp={(withClasp) => onToggleClasp(pc.id, withClasp)}
            t={t}
            tCart={tCart}
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
