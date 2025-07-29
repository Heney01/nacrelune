
"use client";

import React, { useState, useMemo, useRef, WheelEvent, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { JewelryModel, PlacedCharm, Charm, JewelryType, CartItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SuggestionSidebar } from './suggestion-sidebar';
import { Trash2, X, ArrowLeft, Gem, Sparkles, Search, ShoppingCart, PlusCircle, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NacreluneLogo } from './icons';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { getCharmSuggestions } from '@/app/actions';
import type { Suggestion, SuggestCharmPlacementOutput } from '@/ai/flows/charm-placement-suggestions';
import { CharmsPanel } from './charms-panel';
import { Input } from './ui/input';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams, useParams } from 'next/navigation';
import { CartSheet } from './cart-sheet';
import html2canvas from 'html2canvas';
import { CartWidget } from './cart-widget';
import { useTranslations } from '@/hooks/use-translations';

interface PlacedCharmComponentProps {
    placed: PlacedCharm;
    isSelected: boolean;
    onDragStart: (e: React.MouseEvent<HTMLDivElement> | TouchEvent, charmId: string) => void;
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
    
    useEffect(() => {
        const element = charmRef.current;
        if (!element) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            onRotate(e, placed.id);
        }
        
        const handleTouchStart = (e: TouchEvent) => {
            onDragStart(e, placed.id);
        }

        element.addEventListener('wheel', handleWheel as unknown as EventListener, { passive: false });
        element.addEventListener('touchstart', handleTouchStart, { passive: false });


        return () => {
            if(element) {
                element.removeEventListener('wheel', handleWheel as unknown as EventListener);
                element.removeEventListener('touchstart', handleTouchStart);
            }
        };
    }, [onRotate, onDragStart, placed.id]);


    return (
        <div
            ref={charmRef}
            onMouseDown={(e) => onDragStart(e, placed.id)}
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
  jewelryType: Omit<JewelryType, 'models' | 'icon'>;
  allCharms: Charm[];
}

export default function Editor({ model, jewelryType, allCharms }: EditorProps) {
  const isMobile = useIsMobile();
  const { cart, addToCart, updateCartItem } = useCart();
  const { toast } = useToast();
  const t = useTranslations('Editor');
  const tHome = useTranslations('HomePage');
  const tCharm = useTranslations('CharmsPanel');
  
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params.locale as string;

  const cartItemId = searchParams.get('cartItemId');
  
  const [placedCharms, setPlacedCharms] = useState<PlacedCharm[]>([]);
  const [selectedPlacedCharmId, setSelectedPlacedCharmId] = useState<string | null>(null);

  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [isCharmsSheetOpen, setIsCharmsSheetOpen] = useState(false);
  const [isSuggestionsSheetOpen, setIsSuggestionsSheetOpen] = useState(false);
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [suggestions, setSuggestions] = useState<SuggestCharmPlacementOutput | null>(null);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const [charmsSearchTerm, setCharmsSearchTerm] = useState('');

  const [isCapturing, setIsCapturing] = useState(false);
  
  const isEditing = cartItemId !== null;

  useEffect(() => {
    if (isEditing) {
      const itemToEdit = cart.find(item => item.id === cartItemId);
      if (itemToEdit) {
        setPlacedCharms(itemToEdit.placedCharms);
      }
    }
  }, [isEditing, cart, cartItemId]);


  const interactionState = useRef({
    isDragging: false,
    isPanning: false,
    dragStart: { x: 0, y: 0 },
    activeCharmId: null as string | null,
    panStart: { x: 0, y: 0 },
  }).current;

  const panRef = useRef(pan);
  panRef.current = pan;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const placedCharmsRef = useRef(placedCharms);
  placedCharmsRef.current = placedCharms;

  const addCharmToCanvas = useCallback((
    charm: Charm, 
    options: {
        source: 'charmsPanel' | 'suggestionsPanel';
        position?: { x: number, y: number }
    }) => {
    
    let position = options.position;

    if (!position) {
        if (!canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const currentPan = panRef.current;
        const currentScale = scaleRef.current;
        const x_px = (canvasRect.width / 2) - currentPan.x;
        const y_px = (canvasRect.height / 2) - currentPan.y;
        position = {
            x: (x_px / canvasRect.width / currentScale) * 100,
            y: (y_px / canvasRect.height / currentScale) * 100,
        };
    }

    const newCharm: PlacedCharm = {
      id: `${charm.id}-${Date.now()}`,
      charm,
      position: position,
      rotation: 0,
      animation: 'breathe 0.5s ease-out'
    };
    setPlacedCharms(prev => [...prev, newCharm]);

    if (isMobile) {
        if (options.source === 'charmsPanel') {
            setIsCharmsSheetOpen(false);
        } else if (options.source === 'suggestionsPanel') {
            setIsSuggestionsSheetOpen(false);
        }
    }

    setTimeout(() => {
        setPlacedCharms(prev => prev.map(pc => pc.id === newCharm.id ? { ...pc, animation: undefined } : pc));
    }, 500);
  }, [isMobile]);

  const addCharmFromCharmList = useCallback((charm: Charm) => {
    addCharmToCanvas(charm, { source: 'charmsPanel' });
  }, [addCharmToCanvas]);

  const addCharmFromSuggestions = useCallback((suggestion: Suggestion) => {
    const charm = allCharms.find(c => c.name === suggestion.charm);
    if (charm && suggestion.position) {
        addCharmToCanvas(charm, { source: 'suggestionsPanel', position: suggestion.position });
    }
  }, [addCharmToCanvas, allCharms]);
  
  const removeCharm = useCallback((id: string) => {
    setPlacedCharms(prev => prev.filter(c => c.id !== id));
  }, []);
  
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

  const handleGenerateSuggestions = async (preferences: string) => {
      setIsGeneratingSuggestions(true);
      setSuggestionError(null);
      try {
        const result = await getCharmSuggestions({
          jewelryType: jewelryType.id,
          modelDescription: model.name,
          charmOptions: allCharms.map(c => c.name),
          userPreferences: preferences,
        });
        setSuggestions(result);
      } catch (err) {
        setSuggestionError(t('error_generating_suggestions'));
      } finally {
        setIsGeneratingSuggestions(false);
      }
  };


  const handleDragStart = useCallback((e: React.MouseEvent | TouchEvent, charmId: string) => {
    if ('preventDefault' in e && e.cancelable) e.preventDefault();
    e.stopPropagation();

    interactionState.isDragging = true;
    interactionState.isPanning = false;
    interactionState.activeCharmId = charmId;
    setSelectedPlacedCharmId(charmId);

    const point = 'touches' in e ? e.touches[0] : e;
    interactionState.dragStart = { x: point.clientX, y: point.clientY };
  }, [interactionState]);


  useEffect(() => {
      const canvas = canvasWrapperRef.current;
      if (!canvas) return;
  
      const getPoint = (e: MouseEvent | TouchEvent) => 'touches' in e ? e.touches[0] : e;

      const handleMove = (e: MouseEvent | TouchEvent) => {
        const point = getPoint(e);
        const currentScale = scaleRef.current;
        const currentPlacedCharms = placedCharmsRef.current;
        const canvasEl = canvasRef.current;

        if (!canvasEl) return;

        if (interactionState.isDragging && interactionState.activeCharmId) {
            if ('preventDefault' in e && e.cancelable) e.preventDefault();
            const dx = point.clientX - interactionState.dragStart.x;
            const dy = point.clientY - interactionState.dragStart.y;

            const dxPercent = (dx / canvasEl.clientWidth) * 100 / currentScale;
            const dyPercent = (dy / canvasEl.clientHeight) * 100 / currentScale;

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

      const handleWheel = (e: Event) => {
          if (!(e.target as HTMLElement).closest('.charm-on-canvas')) {
              e.preventDefault();
              handleCanvasWheel(e as unknown as WheelEvent);
          }
      };
      
      const handleTouchStart = (e: TouchEvent) => {
        handlePanStart(e);
      };

      canvas.addEventListener('mousedown', handlePanStart);
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleInteractionEnd);

      canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleInteractionEnd);
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      
      return () => {
        canvas.removeEventListener('mousedown', handlePanStart);
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleInteractionEnd);
        canvas.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleInteractionEnd);
        canvas.removeEventListener('wheel', handleWheel);
      };
  }, [interactionState]);

  const handleCanvasWheel = (e: WheelEvent) => {
    if (!canvasWrapperRef.current) return;

    const zoomSensitivity = 0.001;
    const newScale = scale - e.deltaY * zoomSensitivity;
    const clampedScale = Math.min(Math.max(0.2, newScale), 5);

    const canvasRect = canvasWrapperRef.current.getBoundingClientRect();
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;
    
    const newPanX = mouseX - (mouseX - pan.x) * (clampedScale / scale);
    const newPanY = mouseY - (mouseY - pan.y) * (clampedScale / scale);

    setScale(clampedScale);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const zoomFactor = 0.2;
    const newScale = direction === 'in' ? scale * (1 + zoomFactor) : scale * (1 - zoomFactor);
    const clampedScale = Math.min(Math.max(0.2, newScale), 5);
    setScale(clampedScale);
  };
  
  const resetZoomAndPan = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);
  
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
  
  const triggerCapture = () => {
    resetZoomAndPan();
    setSelectedPlacedCharmId(null);
    setIsCapturing(true);
  }

  const handleAddToCart = () => {
    triggerCapture();
  };

  const handleUpdateCart = () => {
    if (!cartItemId) return;
    triggerCapture();
  }

  useEffect(() => {
    if (isCapturing) {
      const capture = async () => {
        if (!canvasRef.current) {
          setIsCapturing(false);
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        try {
          const canvas = await html2canvas(canvasRef.current, {
            backgroundColor: null,
            logging: false,
            useCORS: true,
            scale: 2
          });
          const previewImage = canvas.toDataURL('image/jpeg', 0.7);

          if (isEditing && cartItemId) {
              const updatedItem = {
                  id: cartItemId,
                  model,
                  jewelryType,
                  placedCharms,
                  previewImage
              };
              updateCartItem(cartItemId, updatedItem);
              toast({
                  title: t('toast_item_updated_title'),
                  description: t('toast_item_updated_description', {modelName: model.name}),
              });
          } else {
              const newItem: Omit<CartItem, 'id'> = {
                  model,
                  jewelryType,
                  placedCharms,
                  previewImage: previewImage
              }
              addToCart(newItem);
              toast({
                  title: t('toast_item_added_title'),
                  description: t('toast_item_added_description', {modelName: model.name}),
              });
          }

          setIsCartSheetOpen(true);
        } catch (error) {
          console.error("Erreur lors de la capture du canvas:", error);
          toast({
              variant: 'destructive',
              title: t('toast_error_title'),
              description: "Impossible de capturer l'image de la création."
          });
        } finally {
          setIsCapturing(false);
        }
      };

      capture();
    }
  }, [isCapturing, addToCart, updateCartItem, cartItemId, isEditing, jewelryType, model, placedCharms, toast, t]);


  const charmsPanelDesktop = useMemo(() => (
    <CharmsPanel 
        allCharms={allCharms}
        onAddCharm={addCharmFromCharmList} 
        searchTerm={charmsSearchTerm}
        onSearchTermChange={setCharmsSearchTerm}
    />
  ), [allCharms, addCharmFromCharmList, charmsSearchTerm]);

  return (
    <>
      <CartSheet open={isCartSheetOpen} onOpenChange={setIsCartSheetOpen} />
      <header className="p-4 border-b">
          <div className="container mx-auto flex justify-between items-center">
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <NacreluneLogo className="h-8 w-auto text-foreground" />
            </Link>
            <div className="flex items-center gap-2">
               <Button variant="ghost" asChild>
                    <Link href={`/${locale}/?type=${jewelryType.id}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {tHome('back_button')}
                    </Link>
                </Button>
                <CartWidget />
            </div>
          </div>
        </header>
      <main className={cn("flex-grow p-4 md:p-8", isMobile && "p-0")}>
        <div className={cn("container mx-auto", isMobile && "px-0")}>
            <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-6 h-full", isMobile && "grid-cols-1 gap-0")}>
            {!isMobile && (
                <div className="lg:col-span-3">
                    {charmsPanelDesktop}
                </div>
            )}

            <div className={cn("lg:col-span-6 flex flex-col gap-4", isMobile && "order-first")}>
                <div className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2", isMobile && "px-4 pt-4")}>
                <h2 className="text-2xl font-headline tracking-tight">{t('customize_title', { modelName: model.name })}</h2>
                    <div className="flex gap-2">
                    {isEditing ? (
                        <Button onClick={handleUpdateCart} disabled={isCapturing}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {t('update_item_button')}
                        </Button>
                    ) : (
                        <Button onClick={handleAddToCart} disabled={isCapturing}>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            {t('add_to_cart_button')}
                        </Button>
                    )}
                    </div>
                </div>
                <div
                    ref={canvasWrapperRef}
                    className={cn("relative w-full aspect-square bg-card rounded-lg border-2 border-dashed border-muted-foreground/30 overflow-hidden touch-none grid place-items-center", isMobile && "rounded-none border-x-0")}
                >
                    <div
                        ref={canvasRef}
                        className="relative w-full h-full grid place-items-center"
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                            transformOrigin: '0 0',
                        }}
                    >
                        <Image
                            src={model.editorImageUrl}
                            alt={model.name}
                            width={1000}
                            height={1000}
                            className="pointer-events-none max-w-full max-h-full object-contain"
                            data-ai-hint="jewelry model"
                            priority
                        />
                        
                        {placedCharms.map((placed) => (
                            <PlacedCharmComponent
                                key={placed.id}
                                placed={placed}
                                isSelected={selectedPlacedCharmId === placed.id}
                                onDragStart={handleDragStart}
                                onDelete={removeCharm}
                                onRotate={handlePlacedCharmRotation}
                            />
                        ))}
                    </div>
                    <div className="absolute bottom-2 right-2 flex gap-2">
                        <Button variant="secondary" size="icon" onClick={() => handleZoom('in')}><ZoomIn /></Button>
                        <Button variant="secondary" size="icon" onClick={() => handleZoom('out')}><ZoomOut /></Button>
                        <Button variant="secondary" size="icon" onClick={resetZoomAndPan}><Maximize /></Button>
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

            {!isMobile && <div className="lg:col-span-3">
                <SuggestionSidebar
                    onApplySuggestion={addCharmFromSuggestions}
                    charms={allCharms}
                    suggestions={suggestions}
                    isLoading={isGeneratingSuggestions}
                    error={suggestionError}
                    onGenerate={handleGenerateSuggestions}
                />
            </div>}
            </div>
        </div>
      </main>

       {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-2 flex justify-around">
            <Sheet open={isCharmsSheetOpen} onOpenChange={setIsCharmsSheetOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" className="flex flex-col h-auto p-2">
                       <Gem className="h-6 w-6" />
                       <span className="text-xs">{tCharm('title')}</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80%] p-0 flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <SheetHeader className="p-4 border-b">
                        <SheetTitle>{tCharm('title')}</SheetTitle>
                    </SheetHeader>
                    <div className="p-4 border-b">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={tCharm('search_placeholder')}
                                value={charmsSearchTerm}
                                onChange={(e) => setCharmsSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <ScrollArea className="flex-grow">
                        <CharmsPanel 
                            allCharms={allCharms} 
                            onAddCharm={addCharmFromCharmList} 
                            isMobileSheet={true}
                            searchTerm={charmsSearchTerm}
                            onSearchTermChange={setCharmsSearchTerm}
                        />
                    </ScrollArea>
                </SheetContent>
            </Sheet>
            <Sheet open={isSuggestionsSheetOpen} onOpenChange={setIsSuggestionsSheetOpen}>
                 <SheetTrigger asChild>
                    <Button variant="ghost" className="flex flex-col h-auto p-2">
                       <Sparkles className="h-6 w-6" />
                       <span className="text-xs">{t('ai_suggestions_title')}</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80%] p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
                   <SheetHeader className="p-4 border-b">
                        <SheetTitle>{t('ai_suggestions_title')}</SheetTitle>
                   </SheetHeader>
                    <SuggestionSidebar 
                        onApplySuggestion={addCharmFromSuggestions}
                        charms={allCharms} 
                        isMobile={isMobile}
                        suggestions={suggestions}
                        isLoading={isGeneratingSuggestions}
                        error={suggestionError}
                        onGenerate={handleGenerateSuggestions}
                    />
                </SheetContent>
            </Sheet>
          </div>
        )}
    </>
  );
}

    