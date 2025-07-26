
"use client";

import React, { useState, useMemo, useRef, DragEvent, WheelEvent, useEffect } from 'react';
import Image from 'next/image';
import { JewelryModel, PlacedCharm, Charm, JewelryType, CharmCategory } from '@/lib/types';
import { CHARMS, CHARM_CATEGORIES } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { SuggestionSidebar } from './suggestion-sidebar';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { ShoppingCart, Trash2, X, Search, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NacreluneLogo } from './icons';

interface EditorProps {
  model: JewelryModel;
  jewelryType: JewelryType;
  onBack: () => void;
}

export default function Editor({ model, jewelryType, onBack }: EditorProps) {
  const [placedCharms, setPlacedCharms] = useState<PlacedCharm[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedItem, setDraggedItem] = useState<{type: 'new-charm' | 'placed-charm', id: string} | null>(null);
  const [selectedCharmId, setSelectedCharmId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const filteredCharms = useMemo(() => {
    if (!searchTerm) {
      return CHARMS;
    }
    return CHARMS.filter(charm =>
      charm.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const charmsByCategory = useMemo(() => {
    return filteredCharms.reduce((acc, charm) => {
      if (!acc[charm.category]) {
        acc[charm.category] = [];
      }
      acc[charm.category].push(charm);
      return acc;
    }, {} as Record<CharmCategory, Charm[]>);
  }, [filteredCharms]);

  const addCharmToCanvas = (charm: Charm) => {
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const newCharm: PlacedCharm = {
      id: `${charm.id}-${Date.now()}`,
      charm,
      position: { x: canvasRect.width / 2 - 20, y: canvasRect.height / 2 - 20 },
      rotation: 0,
    };
    setPlacedCharms((prev) => [...prev, newCharm]);
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, charm: Charm) => {
    setDraggedItem({ type: 'new-charm', id: charm.id });
    setSelectedCharmId(null);
  };

  const handlePlacedCharmDragStart = (e: DragEvent<HTMLDivElement>, placedCharmId: string) => {
    setDraggedItem({ type: 'placed-charm', id: placedCharmId });
    setSelectedCharmId(null);
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedItem || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    if (draggedItem.type === 'new-charm') {
      const charm = CHARMS.find((c) => c.id === draggedItem.id);
      if (!charm) return;
      const newCharm: PlacedCharm = {
        id: `${charm.id}-${Date.now()}`,
        charm,
        position: { x: x - 20, y: y - 20 }, // Center the charm on the cursor
        rotation: 0,
      };
      setPlacedCharms((prev) => [...prev, newCharm]);
    } else if (draggedItem.type === 'placed-charm') {
      setPlacedCharms(prev => 
        prev.map(pc => 
          pc.id === draggedItem.id 
            ? { ...pc, position: { x: x - 20, y: y - 20 } }
            : pc
        )
      );
    }
    setDraggedItem(null);
  };
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  
  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!selectedCharmId || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    setPlacedCharms(prev =>
      prev.map(pc =>
        pc.id === selectedCharmId
          ? { ...pc, position: { x: x - 20, y: y - 20 } }
          : pc
      )
    );
  };

  const handleMouseUp = () => {
    setSelectedCharmId(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (selectedCharmId && canvas) {
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseup', handleMouseUp);
      return () => {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [selectedCharmId]);

  const removeCharm = (id: string) => {
    setPlacedCharms(placedCharms.filter(c => c.id !== id));
  };
  
  const clearAllCharms = () => {
    setPlacedCharms([]);
  };

  const handleCharmRotation = (e: WheelEvent<HTMLDivElement>, charmId: string) => {
    e.preventDefault();
    setPlacedCharms(prev =>
      prev.map(pc =>
        pc.id === charmId
          ? { ...pc, rotation: (pc.rotation + e.deltaY * 0.1) % 360 }
          : pc
      )
    );
  };

  return (
    <>
    <header className="p-4 border-b">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <NacreluneLogo className="h-8 w-auto text-foreground" />
            <h1 className="text-2xl font-headline tracking-tight">Nacrelune</h1>
          </div>
          <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
          </Button>
        </div>
      </header>
    <main className="flex-grow p-4 md:p-8">
     <div className="container mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        {/* Charms Panel */}
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Charms</CardTitle>
          </CardHeader>
          <div className="px-4 pb-4">
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                      placeholder="Search charms..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                  />
              </div>
          </div>
          <Separator />
          <CardContent className="p-0 flex-grow">
            <ScrollArea className="h-[calc(100vh-320px)]">
              <Accordion type="multiple" defaultValue={CHARM_CATEGORIES} className="p-4">
                {CHARM_CATEGORIES.map(category => (
                  charmsByCategory[category] && charmsByCategory[category].length > 0 && (
                    <AccordionItem value={category} key={category}>
                      <AccordionTrigger className="text-base font-headline">{category}</AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-3 gap-4 pt-2">
                          {charmsByCategory[category].map((charm) => (
                            <div
                              key={charm.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, charm)}
                              onDragEnd={handleDragEnd}
                              onClick={() => addCharmToCanvas(charm)}
                              className="p-2 border rounded-md flex flex-col items-center justify-center cursor-pointer active:cursor-grabbing bg-card hover:bg-muted transition-colors aspect-square"
                              title={charm.name}
                            >
                              <Image src={charm.imageUrl} alt={charm.name} width={48} height={48} data-ai-hint="jewelry charm" />
                              <p className="text-xs text-center mt-1 truncate">{charm.name}</p>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                ))}
              </Accordion>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Editor Canvas */}
        <div className="lg:col-span-6 flex flex-col gap-4">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
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
                draggable
                onDragStart={(e) => handlePlacedCharmDragStart(e, placed.id)}
                onDragEnd={handleDragEnd}
                onWheel={(e) => handleCharmRotation(e, placed.id)}
                className={cn(
                  "absolute group cursor-grab",
                  selectedCharmId === placed.id ? "cursor-grabbing z-10" : "cursor-grab",
                  draggedItem && draggedItem.type === 'placed-charm' && draggedItem.id === placed.id && "opacity-50"
                )}
                style={{
                  left: `${placed.position.x}px`,
                  top: `${placed.position.y}px`,
                  transform: `rotate(${placed.rotation}deg)`,
                }}
              >
                <Image
                  src={placed.charm.imageUrl}
                  alt={placed.charm.name}
                  width={40}
                  height={40}
                  className="pointer-events-none"
                  data-ai-hint="jewelry charm"
                />
                <button onClick={() => removeCharm(placed.id)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <Card>
              <CardHeader>
                  <CardTitle className="font-headline text-lg">Added Charms ({placedCharms.length})</CardTitle>
              </CardHeader>
              <CardContent>
                  {placedCharms.length === 0 ? (
                      <p className="text-muted-foreground text-sm">Drag or click charms to add them to your jewelry.</p>
                  ) : (
                      <ScrollArea className="h-24">
                          <ul className="space-y-2">
                              {placedCharms.map(pc => (
                                  <li key={pc.id} 
                                      className={cn("flex items-center justify-between text-sm p-1 rounded-md cursor-pointer",
                                        selectedCharmId === pc.id ? 'bg-muted' : 'hover:bg-muted/50'
                                      )}
                                      onMouseDown={() => setSelectedCharmId(pc.id)}
                                  >
                                      <div className="flex items-center gap-2">
                                          <Image src={pc.charm.imageUrl} alt={pc.charm.name} width={24} height={24} className="rounded-sm" data-ai-hint="jewelry charm" />
                                          <span>{pc.charm.name}</span>
                                      </div>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); removeCharm(pc.id); }}>
                                          <X className="h-4 w-4" />
                                      </Button>
                                  </li>
                              ))}
                          </ul>
                      </ScrollArea>
                  )}
              </CardContent>
          </Card>
        </div>

        {/* AI Suggestions Panel */}
        <div className="lg:col-span-3">
          <SuggestionSidebar jewelryType={jewelryType.id} modelDescription={model.description || ''} onAddCharm={addCharmToCanvas} />
        </div>
      </div>
      </div>
    </main>
    </>
  );
}
