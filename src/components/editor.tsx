"use client";

import React, { useState, useRef, DragEvent } from 'react';
import Image from 'next/image';
import { JewelryModel, PlacedCharm, Charm, JewelryType } from '@/lib/types';
import { CHARMS } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { SuggestionSidebar } from './suggestion-sidebar';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { ShoppingCart, Trash2, X } from 'lucide-react';

interface EditorProps {
  model: JewelryModel;
  jewelryType: JewelryType;
}

export default function Editor({ model, jewelryType }: EditorProps) {
  const [placedCharms, setPlacedCharms] = useState<PlacedCharm[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, charm: Charm) => {
    e.dataTransfer.setData('charmId', charm.id);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const charmId = e.dataTransfer.getData('charmId');
    const charm = CHARMS.find((c) => c.id === charmId);
    if (!charm || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    const newCharm: PlacedCharm = {
      id: `${charmId}-${Date.now()}`,
      charm,
      position: { x: x - 20, y: y - 20 }, // Center the charm on the cursor
    };
    setPlacedCharms((prev) => [...prev, newCharm]);
  };
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const removeCharm = (id: string) => {
    setPlacedCharms(placedCharms.filter(c => c.id !== id));
  };
  
  const clearAllCharms = () => {
    setPlacedCharms([]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* Charms Panel */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Charms</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="p-4">
          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="grid grid-cols-3 gap-4">
              {CHARMS.map((charm) => (
                <div
                  key={charm.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, charm)}
                  className="p-2 border rounded-md flex flex-col items-center justify-center cursor-grab active:cursor-grabbing bg-card hover:bg-muted transition-colors aspect-square"
                  title={charm.name}
                >
                  <Image src={charm.imageUrl} alt={charm.name} width={48} height={48} data-ai-hint="jewelry charm" />
                  <p className="text-xs text-center mt-1 truncate">{charm.name}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Editor Canvas */}
      <div className="lg:col-span-6 flex flex-col gap-4">
         <div className="flex justify-between items-center">
           <h2 className="text-2xl font-headline tracking-tight">Customize Your {model.name}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearAllCharms} disabled={placedCharms.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All
              </Button>
               <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Purchase
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Complete Your Masterpiece?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This is a prototype. In a real application, the next steps would involve finalizing your design, proceeding to checkout for payment, and entering shipping details for delivery.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogAction>Continue Designing</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
         </div>
        <div
          ref={canvasRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="relative w-full aspect-square bg-card rounded-lg border-2 border-dashed border-muted-foreground/30 overflow-hidden shadow-inner"
        >
          <Image src={model.imageUrl} alt={model.name} layout="fill" objectFit="contain" className="pointer-events-none" data-ai-hint="jewelry model" />
          {placedCharms.map((placed) => (
            <div
              key={placed.id}
              className="absolute group"
              style={{ left: `${placed.position.x}px`, top: `${placed.position.y}px` }}
            >
              <Image
                src={placed.charm.imageUrl}
                alt={placed.charm.name}
                width={40}
                height={40}
                className="cursor-pointer"
                data-ai-hint="jewelry charm"
              />
              <button onClick={() => removeCharm(placed.id)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* AI Suggestions Panel */}
      <div className="lg:col-span-3">
        <SuggestionSidebar jewelryType={jewelryType.id} modelDescription={model.description} />
      </div>
    </div>
  );
}
