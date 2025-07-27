
"use client";

import React, { useState, useMemo, useRef, WheelEvent, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { JewelryModel, PlacedCharm, Charm, JewelryType, CharmCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { SuggestionSidebar } from './suggestion-sidebar';
import { Trash2, X, Search, ArrowLeft, Loader2, ZoomIn, ZoomOut, Move, Sparkles, Gem } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NacreluneLogo } from './icons';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, DocumentReference } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useTranslations, useRichTranslations } from '@/hooks/use-translations';
import { PurchaseDialog } from './purchase-dialog';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';


interface PlacedCharmComponentProps {
    placed: PlacedCharm;
    isSelected: boolean;
    scale: number;
    onDragStart: (e: React.MouseEvent | React.TouchEvent, charmId: string) => void;
    onDelete: (charmId: string) => void;
    onRotate: (e: WheelEvent, charmId: string) => void;
}
  
const PlacedCharmComponent = React.memo(({ placed, isSelected, onDragStart, onDelete, onRotate }: PlacedCharmComponentProps) => {
    const charmRef = useRef<HTMLDivElement>(null);

    const handleDelete = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onDelete(placed.id);
    }, [onDelete, placed.id]);

    const handleWheelRotation = useCallback((e: WheelEvent) => {
        e.preventDefault(); 
        onRotate(e, placed.id);
    }, [onRotate, placed.id]);


    useEffect(() => {
      const element = charmRef.current;
      if (!element) return;

      const handleWheel = (e: Event) => {
          handleWheelRotation(e as WheelEvent)
      }

      element.addEventListener('wheel', handleWheel, { passive: false });

      return () => {
        if(element) {
            element.removeEventListener('wheel', handleWheel);
        }
      };
    }, [handleWheelRotation]);


    return (
        <div
            ref={charmRef}
            onMouseDown={(e) => onDragStart(e, placed.id)}
            onTouchStart={(e) => onDragStart(e, placed.id)}
            className={cn(
                "absolute group charm-on-canvas cursor-pointer p-1 rounded-full select-none",
                {
                    'border-2 border-primary border-dashed': isSelected,
                    'hover:border-2 hover:border-primary/50 hover:border-dashed': !isSelected,
                }
            )}
            style={{
                left: `${placed.position.x}%`,
                top: `${placed.position.y}%`,
                transform: `translate(-50%, -50%) rotate(${placed.rotation}deg)`,
                animation: placed.animation,
                width: 48,
                height: 48,
                touchAction: 'none',
            }}
        >
            <Image
                src={placed.charm.imageUrl}
                alt={placed.charm.name}
                width={40}
                height={40}
                className="pointer-events-none rounded-full select-none"
                data-ai-hint="jewelry charm"
                draggable="false"
            />
            <button
                onMouseDown={handleDelete}
                onTouchStart={handleDelete}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={14} />
            </button>
        </div>
    );
});
PlacedCharmComponent.displayName = 'PlacedCharmComponent';

interface EditorProps {
  model: JewelryModel;
  jewelryType: Omit<JewelryType, 'models'>;
  onBack: () => void;
  locale: string;
}

export default function Editor({ model, jewelryType, onBack, locale }: EditorProps) {
  const t = useTranslations('Editor');
  const tRich = useRichTranslations();
  const isMobile = useIsMobile();
  const [placedCharms, setPlacedCharms] = useState<PlacedCharm[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlacedCharmId, setSelectedPlacedCharmId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [charms, setCharms] = useState<Charm[]>([]);
  const [charmCategories, setCharmCategories] = useState<CharmCategory[]>([]);
  const [isLoadingCharms, setIsLoadingCharms] = useState(true);

  // State for mobile sheets
  const [isCharmsSheetOpen, setIsCharmsSheetOpen] = useState(false);
  const [isSuggestionsSheetOpen, setIsSuggestionsSheetOpen] = useState(false);

  // State for pan and zoom
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const interactionState = useRef({
    isDragging: false,
    isPanning: false,
    dragStart: { x: 0, y: 0 },
    panStart: { x: 0, y: 0 },
    activeCharmId: null as string | null,
  }).current;

  // Use refs to store latest state values to avoid stale closures in event listeners
  const panRef = useRef(pan);
  panRef.current = pan;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const placedCharmsRef = useRef(placedCharms);
  placedCharmsRef.current = placedCharms;


  const getUrl = async (path: string) => {
    if (path && !path.startsWith('http')) {
      try {
        const storageRef = ref(storage, path);
        return await getDownloadURL(storageRef);
      } catch (error) {
        console.error("Error getting download URL: ", error);
        return 'https://placehold.co/100x100.png'; // Fallback
      }
    }
    return path || 'https://placehold.co/100x100.png';
  }

  useEffect(() => {
    const fetchCharmsData = async () => {
      setIsLoadingCharms(true);
      try {
        const categoriesSnapshot = await getDocs(collection(db, "charmCategories"));
        const fetchedCategories = await Promise.all(categoriesSnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const imageUrl = data.imageUrl ? await getUrl(data.imageUrl) : undefined;
          return {
            id: doc.id,
            name: data.name,
            description: data.description,
            imageUrl: imageUrl,
          } as CharmCategory;
        }));
        setCharmCategories(fetchedCategories);

        const charmsSnapshot = await getDocs(collection(db, "charms"));
        const fetchedCharms = await Promise.all(charmsSnapshot.docs.map(async (doc) => {
          const data = doc.data();
          const imageUrl = await getUrl(data.imageUrl);
          const categoryRef = data.category as DocumentReference;
          return {
            id: doc.id,
            name: data.name,
            imageUrl: imageUrl,
            description: data.description,
            categoryId: categoryRef.id,
            price: data.price || 0,
          } as Charm;
        }));
        setCharms(fetchedCharms);
      } catch (error) {
        console.error("Error fetching charms data: ", error);
      } finally {
        setIsLoadingCharms(false);
      }
    };

    fetchCharmsData();
  }, []);

  const filteredCharms = useMemo(() => {
    if (!searchTerm) {
      return charms;
    }
    return charms.filter(charm =>
      charm.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, charms]);

  const charmsByCategory = useMemo(() => {
    return filteredCharms.reduce((acc, charm) => {
      const categoryId = charm.categoryId;
      if (!acc[categoryId]) {
        acc[categoryId] = [];
      }
      acc[categoryId].push(charm);
      return acc;
    }, {} as Record<string, Charm[]>);
  }, [filteredCharms]);

  const addCharmToCanvas = (charm: Charm) => {
    if (!canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const currentPan = panRef.current;
    const currentScale = scaleRef.current;

    const x_px = (canvasRect.width / 2) - currentPan.x;
    const y_px = (canvasRect.height / 2) - currentPan.y;
    
    const xPercent = (x_px / canvasRect.width / currentScale) * 100;
    const yPercent = (y_px / canvasRect.height / currentScale) * 100;

    const newCharm: PlacedCharm = {
      id: `${charm.id}-${Date.now()}`,
      charm,
      position: { x: xPercent, y: yPercent },
      rotation: 0,
      animation: 'breathe 0.5s ease-out'
    };
    setPlacedCharms(prev => [...prev, newCharm]);
    
    // Close sheet on mobile after adding a charm
    if (isMobile) {
        setIsCharmsSheetOpen(false);
    }

    setTimeout(() => {
        setPlacedCharms(prev => prev.map(pc => pc.id === newCharm.id ? { ...pc, animation: undefined } : pc));
    }, 500);
  };
  
  const removeCharm = useCallback((id: string) => {
    setPlacedCharms(prev => prev.filter(c => c.id !== id));
  }, []);
  
  const clearAllCharms = () => {
    setPlacedCharms([]);
  };

  const handlePlacedCharmRotation = useCallback((e: WheelEvent, charmId: string) => {
    const rotationAmount = e.deltaY * 0.1;
    setPlacedCharms(prev =>
      prev.map(pc =>
        pc.id === charmId
          ? { ...pc, rotation: (pc.rotation + rotationAmount) % 360 }
          : pc
      )
    );
  }, []);


  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, charmId: string) => {
    if ('preventDefault' in e) e.preventDefault();
    e.stopPropagation();

    interactionState.isDragging = true;
    interactionState.isPanning = false;
    interactionState.activeCharmId = charmId;
    setSelectedPlacedCharmId(charmId);

    const point = 'touches' in e ? e.touches[0] : e;
    interactionState.dragStart = { x: point.clientX, y: point.clientY };
  }, [interactionState]);


    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
  
      const getPoint = (e: MouseEvent | TouchEvent) => 'touches' in e ? e.touches[0] : e;

      const handleMove = (e: MouseEvent | TouchEvent) => {
        const point = getPoint(e);
        const currentScale = scaleRef.current;
        const currentPlacedCharms = placedCharmsRef.current;

        if (interactionState.isDragging && interactionState.activeCharmId) {
            if ('preventDefault' in e && e.cancelable) e.preventDefault();
            const dx = point.clientX - interactionState.dragStart.x;
            const dy = point.clientY - interactionState.dragStart.y;

            const dxPercent = (dx / canvas.clientWidth) * 100 / currentScale;
            const dyPercent = (dy / canvas.clientHeight) * 100 / currentScale;

            setPlacedCharms(
                currentPlacedCharms.map(pc =>
                    pc.id === interactionState.activeCharmId
                        ? { ...pc, position: { x: pc.position.x + dxPercent, y: pc.position.y + dyPercent } }
                        : pc
                )
            );
            interactionState.dragStart = { x: point.clientX, y: point.clientY };
        } else if (interactionState.isPanning) {
            if ('preventDefault' in e && e.cancelable) e.preventDefault();
            const newX = point.clientX - interactionState.panStart.x;
            const newY = point.clientY - interactionState.panStart.y;
            setPan({ x: newX, y: newY });
        }
      };

      const handlePanStart = (e: MouseEvent | TouchEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.charm-on-canvas')) return;
        
        setSelectedPlacedCharmId(null);
        
        interactionState.isPanning = true;
        interactionState.isDragging = false;
        
        const point = getPoint(e);
        const currentPan = panRef.current;
        interactionState.panStart = { x: point.clientX - currentPan.x, y: point.clientY - currentPan.y };
      }

      const handleInteractionEnd = (e: MouseEvent | TouchEvent) => {
        interactionState.isDragging = false;
        interactionState.isPanning = false;
        interactionState.activeCharmId = null;
      };

      // Mouse events
      canvas.addEventListener('mousedown', handlePanStart);
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleInteractionEnd);

      // Touch events
      canvas.addEventListener('touchstart', handlePanStart, { passive: true });
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleInteractionEnd);
      
      return () => {
        canvas.removeEventListener('mousedown', handlePanStart);
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleInteractionEnd);
        canvas.removeEventListener('touchstart', handlePanStart);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleInteractionEnd);
      };
  }, [interactionState]);

  const handleCanvasWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const zoomSensitivity = 0.001;
    const newScale = scale - e.deltaY * zoomSensitivity;
    const clampedScale = Math.min(Math.max(0.2, newScale), 5);

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;
    
    const newPanX = mouseX - (mouseX - pan.x) * (clampedScale / scale);
    const newPanY = mouseY - (mouseY - pan.y) * (clampedScale / scale);

    setScale(clampedScale);
    setPan({ x: newPanX, y: newPanY });
  };
  
  const resetZoomAndPan = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };
  
  const handleCharmListClick = (charmId: string) => {
    setSelectedPlacedCharmId(charmId);
    setPlacedCharms(prev => prev.map(pc =>
      pc.id === charmId ? { ...pc, animation: 'breathe 0.5s ease-out' } : pc
    ));
    setTimeout(() => {
      setPlacedCharms(prev => prev.map(pc =>
        pc.id === charmId ? { ...pc, animation: undefined } : pc
      ));
    }, 500);
  };
  
  const CharmsPanel = () => (
    <Card className={cn("flex flex-col", isMobile ? "h-full w-full border-0 shadow-none rounded-none" : "lg:col-span-3")}>
        <CardHeader className={cn(isMobile && "py-4")}>
            <CardTitle className="font-headline text-xl">{t('charms_title')}</CardTitle>
        </CardHeader>
        <div className="px-4 pb-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={t('search_placeholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                />
            </div>
        </div>
        <Separator />
        <CardContent className="p-0 flex-grow">
            <ScrollArea className={cn(isMobile ? "h-[calc(100vh - 200px)]" : "h-[calc(100vh-320px)]")}>
                {isLoadingCharms ? (
                    <div className="flex justify-center items-center h-full p-8">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : (
                    <Accordion type="multiple" defaultValue={charmCategories.map(c => c.id)} className="p-4">
                        {charmCategories.map(category => (
                            charmsByCategory[category.id] && charmsByCategory[category.id].length > 0 && (
                                <AccordionItem value={category.id} key={category.id}>
                                    <AccordionTrigger className="text-base font-headline">{category.name}</AccordionTrigger>
                                    <AccordionContent>
                                        <div className={cn("grid gap-2 pt-2", isMobile ? "grid-cols-4" : "grid-cols-3")}>
                                            {charmsByCategory[category.id].map((charm) => (
                                                <Dialog key={charm.id}>
                                                    <div
                                                        onClick={() => { addCharmToCanvas(charm) }}
                                                        className="relative group p-1 border rounded-md flex flex-col items-center justify-center bg-card hover:bg-muted transition-colors aspect-square cursor-pointer"
                                                        title={charm.name}
                                                    >
                                                        <Image
                                                            src={charm.imageUrl}
                                                            alt={charm.name}
                                                            width={isMobile ? 48 : 48}
                                                            height={isMobile ? 48 : 48}
                                                            className="pointer-events-none"
                                                            data-ai-hint="jewelry charm"
                                                        />
                                                        <p className="text-xs text-center mt-1 truncate">{charm.name}</p>
                                                        <DialogTrigger asChild>
                                                            <Button variant="secondary" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                                <ZoomIn className="h-4 w-4" />
                                                            </Button>
                                                        </DialogTrigger>
                                                    </div>
                                                    <DialogContent className="max-w-md">
                                                        <DialogHeader>
                                                            <DialogTitle className="font-headline text-2xl">{charm.name}</DialogTitle>
                                                            <DialogDescription className="text-base">{charm.description}</DialogDescription>
                                                        </DialogHeader>
                                                        <div className="mt-4 flex justify-center">
                                                            <Image src={charm.imageUrl} alt={charm.name} width={200} height={200} className="rounded-lg border p-2" />
                                                        </div>
                                                        <div className="mt-6 flex justify-end">
                                                            <Button onClick={() => addCharmToCanvas(charm)}>{t('add_to_design_button')}</Button>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        ))}
                    </Accordion>
                )}
            </ScrollArea>
        </CardContent>
    </Card>
  );

  const SuggestionsPanel = () => (
     <div className={cn(!isMobile && "lg:col-span-3")}>
        <SuggestionSidebar 
          jewelryType={jewelryType.id} 
          modelDescription={model.name || ''} 
          onAddCharm={addCharmToCanvas} 
          charms={charms}
          locale={locale}
          isMobile={isMobile}
        />
     </div>
  );

  return (
    <>
      <header className="p-4 border-b">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <NacreluneLogo className="h-8 w-auto text-foreground" />
            </div>
            <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {tRich('HomePage.back_button')}
            </Button>
          </div>
        </header>
      <main className={cn("flex-grow p-4 md:p-8", isMobile && "p-0")}>
      <div className={cn("container mx-auto", isMobile && "px-0")}>
        <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-6 h-full", isMobile && "grid-cols-1 gap-0")}>
          {/* Charms Panel */}
          {!isMobile && <CharmsPanel />}

          {/* Editor Canvas */}
          <div className={cn("lg:col-span-6 flex flex-col gap-4", isMobile && "order-first")}>
             <div className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2", isMobile && "px-4 pt-4")}>
              <h2 className="text-2xl font-headline tracking-tight">{t('customize_title', {modelName: model.name})}</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearAllCharms} disabled={placedCharms.length === 0}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('clear_all_button')}
                  </Button>
                  <PurchaseDialog model={model} placedCharms={placedCharms} locale={locale} />
                </div>
            </div>
            <div
              ref={canvasRef}
              onWheel={handleCanvasWheel}
              className={cn("relative w-full aspect-square bg-card rounded-lg border-2 border-dashed border-muted-foreground/30 overflow-hidden touch-none", isMobile && "rounded-none border-x-0")}
            >
              <div
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                      transformOrigin: '0 0',
                  }}
              >
                  <Image src={model.editorImageUrl} alt={model.name} fill style={{ objectFit: 'contain' }} className="pointer-events-none" data-ai-hint="jewelry model" sizes="100vw" />
              </div>
              <div className="absolute top-0 left-0 w-full h-full" style={{ perspective: '1000px' }}>
                  <div
                      style={{
                          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                          transformOrigin: '0 0',
                          width: '100%',
                          height: '100%',
                      }}
                  >
                      {placedCharms.map((placed) => (
                        <PlacedCharmComponent 
                            key={placed.id} 
                            placed={placed}
                            isSelected={selectedPlacedCharmId === placed.id}
                            scale={scale}
                            onDragStart={handleDragStart}
                            onDelete={removeCharm}
                            onRotate={handlePlacedCharmRotation}
                        />
                      ))}
                  </div>
              </div>
              <div className="absolute bottom-2 right-2 flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => setScale(s => s * 1.2)}><ZoomIn /></Button>
                  <Button variant="outline" size="icon" onClick={() => setScale(s => s / 1.2)}><ZoomOut/></Button>
                  <Button variant="outline" size="icon" onClick={resetZoomAndPan}><Move /></Button>
              </div>
            </div>
            <Card className={cn(isMobile && "rounded-none border-x-0")}>
                <CardHeader>
                    <CardTitle className="font-headline text-lg">{t('added_charms_title', {count: placedCharms.length})}</CardTitle>
                </CardHeader>
                <CardContent>
                    {placedCharms.length === 0 ? (
                        <p className="text-muted-foreground text-sm">{t('added_charms_placeholder')}</p>
                    ) : (
                        <ScrollArea className="h-24">
                            <ul className="space-y-2">
                                {placedCharms.map(pc => (
                                    <li key={pc.id} 
                                        className={cn("flex items-center justify-between text-sm p-1 rounded-md cursor-pointer",
                                          selectedPlacedCharmId === pc.id ? 'bg-muted' : 'hover:bg-muted/50'
                                        )}
                                        onClick={() => handleCharmListClick(pc.id)}
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
          {!isMobile && <SuggestionsPanel />}
        </div>
        </div>
      </main>

       {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-2 flex justify-around">
            <Sheet open={isCharmsSheetOpen} onOpenChange={setIsCharmsSheetOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" className="flex flex-col h-auto p-2">
                       <Gem className="h-6 w-6" />
                       <span className="text-xs">{t('charms_title')}</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[50%] p-0">
                    <SheetHeader className="p-4 border-b">
                        <SheetTitle>{t('charms_title')}</SheetTitle>
                    </SheetHeader>
                   <CharmsPanel />
                </SheetContent>
            </Sheet>
            <Sheet open={isSuggestionsSheetOpen} onOpenChange={setIsSuggestionsSheetOpen}>
                 <SheetTrigger asChild>
                    <Button variant="ghost" className="flex flex-col h-auto p-2">
                       <Sparkles className="h-6 w-6" />
                       <span className="text-xs">{t('ai_suggestions_title')}</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80%] p-0">
                   <SheetHeader className="p-4 border-b">
                        <SheetTitle>{t('ai_suggestions_title')}</SheetTitle>
                    </SheetHeader>
                    <SuggestionsPanel />
                </SheetContent>
            </Sheet>
          </div>
        )}
    </>
  );
}

    