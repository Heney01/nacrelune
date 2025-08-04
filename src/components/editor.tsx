

'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { JewelryModel, PlacedCharm, Charm, JewelryType, CartItem, CharmCategory, Creation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { SuggestionSidebar } from './suggestion-sidebar';
import { X, ArrowLeft, Gem, Sparkles, Search, PlusCircle, ZoomIn, ZoomOut, Maximize, AlertCircle, Info, Share2, Layers, Check, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandLogo } from './icons';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { CharmsPanel } from './charms-panel';
import { Input } from './ui/input';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { CartSheet } from './cart-sheet';
import { CartWidget } from './cart-widget';
import { useTranslations } from '@/hooks/use-translations';
import { getCharmSuggestionsAction, getRefreshedCharms, getCharmAnalysisSuggestionsAction, getCharmDesignCritiqueAction } from '@/app/actions/ai.actions';
import { CharmSuggestionOutput } from '@/ai/flows/charm-placement-suggestions';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ShareDialog } from './share-dialog';
import { FinalizeCreationDialog } from './finalize-creation-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useEditorCanvas } from '@/hooks/use-editor-canvas';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PlacedCharmsList } from './placed-charms-list';


interface PlacedCharmComponentProps {
    placed: PlacedCharm;
    isSelected: boolean;
    onDragStart: (e: React.MouseEvent<HTMLDivElement> | TouchEvent, charmId: string) => void;
    onDelete: (charmId: string) => void;
    onRotate: (charmId: string, newRotation: number) => void;
    pixelSize: { width: number; height: number; };
    modelImageRect: DOMRect | null;
}
  
const PlacedCharmComponent = React.memo(({ placed, isSelected, onDragStart, onDelete, onRotate, pixelSize, modelImageRect }: PlacedCharmComponentProps) => {
    const charmRef = useRef<HTMLDivElement>(null);

    const handleDelete = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onDelete(placed.id);
    }, [onDelete, placed.id]);
    
    useEffect(() => {
        const element = charmRef.current;
        if (!element) return;
        
        const handleTouchStart = (e: TouchEvent) => {
            onDragStart(e, placed.id);
        }

        element.addEventListener('touchstart', handleTouchStart, { passive: false });


        return () => {
            if(element) {
                element.removeEventListener('touchstart', handleTouchStart);
            }
        };
    }, [onDragStart, placed.id]);

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const rotationAmount = e.deltaY > 0 ? 10 : -10; // Rotate by 10 degrees
        onRotate(placed.id, placed.rotation + rotationAmount);
    };

    // Convert normalized position to absolute pixel position on the canvas
    const positionStyle = useMemo(() => {
        if (!modelImageRect) {
            return { left: '50%', top: '50%', visibility: 'hidden' };
        }
        
        const left = (placed.position.x * modelImageRect.width);
        const top = (placed.position.y * modelImageRect.height);

        return {
            left: `${left}px`,
            top: `${top}px`,
            width: pixelSize.width,
            height: 'auto',
            transform: `translate(-50%, -50%) rotate(${placed.rotation}deg)`,
            animation: placed.animation,
            touchAction: 'none',
        };

    }, [placed.position, placed.rotation, placed.animation, pixelSize, modelImageRect]);


    return (
        <div
            ref={charmRef}
            onMouseDown={(e) => onDragStart(e, placed.id)}
            onWheel={handleWheel}
            className={cn(
                "absolute group charm-on-canvas cursor-pointer select-none flex items-center justify-center",
                {
                    'outline-2 outline-primary outline-dashed': isSelected,
                    'hover:outline-2 hover:outline-primary/50 hover:outline-dashed': !isSelected,
                }
            )}
            style={positionStyle as React.CSSProperties}
        >
            <Image
                src={placed.charm.imageUrl}
                alt={placed.charm.name}
                className="pointer-events-none select-none object-contain w-full h-auto"
                data-ai-hint="jewelry charm"
                draggable="false"
                width={pixelSize.width}
                height={pixelSize.height}
                crossOrigin="anonymous"
            />
            <button
                onMouseDown={handleDelete}
                onTouchStart={handleDelete}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
  charmCategories: CharmCategory[];
}

export type Suggestion = CharmSuggestionOutput['suggestions'][0];

export default function Editor({ model, jewelryType, allCharms: initialAllCharms, charmCategories }: EditorProps) {
  const isMobile = useIsMobile();
  const { cart, addToCart, updateCartItem } = useCart();
  const { toast } = useToast();
  const t = useTranslations('Editor');
  const tHome = useTranslations('HomePage');
  const tCharm = useTranslations('CharmsPanel');
  
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const cartItemId = searchParams.get('cartItemId');
  const [allCharms, setAllCharms] = useState(initialAllCharms);
  
  const [placedCharms, setPlacedCharms] = useState<PlacedCharm[]>([]);
  const [selectedPlacedCharmId, setSelectedPlacedCharmId] = useState<string | null>(null);

  const [isCharmsSheetOpen, setIsCharmsSheetOpen] = useState(false);
  const [isSuggestionsSheetOpen, setIsSuggestionsSheetOpen] = useState(false);
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);
  
  const [charmsSearchTerm, setCharmsSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [critique, setCritique] = useState<string | null>(null);
  
  const isEditing = cartItemId !== null;

  const {
    canvasWrapperRef,
    canvasRef,
    modelImageContainerRef,
    modelImageRef,
    pan,
    scale,
    modelImageRect,
    pixelsPerMm,
    handleManualZoom,
    resetZoomAndPan,
  } = useEditorCanvas({ model });
  
  useEffect(() => {
    if (isEditing) {
      const itemToEdit = cart.find(item => item.id === cartItemId);
      if (itemToEdit) {
        setPlacedCharms(itemToEdit.placedCharms);
      }
      
      const refreshCharmStocks = async () => {
        const result = await getRefreshedCharms();
        if (result.success && result.charms) {
          setAllCharms(result.charms);
        } else {
            console.error("Failed to refresh charm stocks:", result.error);
        }
      }
      refreshCharmStocks();
    }
  }, [isEditing, cart, cartItemId]);

  const getCanvasDataUri = useCallback(async (): Promise<string> => {
    const canvasElement = canvasRef.current;
    if (!canvasElement || !modelImageRef.current) {
        throw new Error("Canvas or model image ref is not available");
    }

    resetZoomAndPan();
    setSelectedPlacedCharmId(null);

    // Wait for all images to be loaded
    const images = Array.from(canvasElement.querySelectorAll('img'));
    await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`Failed to load image: ${img.src}`));
        });
    }));

    return new Promise((resolve, reject) => {
        requestAnimationFrame(async () => {
            try {
                const modelImageElement = modelImageRef.current!;
                const modelImageBoundingRect = modelImageElement.getBoundingClientRect();
                const canvasBoundingRect = canvasElement.getBoundingClientRect();

                const originalX = modelImageBoundingRect.left - canvasBoundingRect.left;
                const originalY = modelImageBoundingRect.top - canvasBoundingRect.top;
                const originalWidth = modelImageBoundingRect.width;
                const originalHeight = modelImageBoundingRect.height;
                
                const size = Math.max(originalWidth, originalHeight);

                const finalX = originalX - (size - originalWidth) / 2;
                const finalY = originalY; // Align to top
                
                const canvas = await html2canvas(canvasElement, {
                    backgroundColor: null,
                    logging: false,
                    useCORS: true,
                    scale: 2, // Higher resolution
                    allowTaint: false,
                    x: finalX,
                    y: finalY,
                    width: size,
                    height: size,
                });
                resolve(canvas.toDataURL('image/png', 0.9));
            } catch (error) {
                console.error("Error capturing canvas:", error);
                reject(error);
            }
        });
    });
}, [resetZoomAndPan, canvasRef, modelImageRef]);


  const interactionState = useRef({
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    activeCharmId: null as string | null,
  }).current;

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
      // Default to center of the model image if no position is provided
      position = { x: 0.5, y: 0.5 };
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

  
  const removeCharm = useCallback((id: string) => {
    setPlacedCharms(prev => prev.filter(c => c.id !== id));
  }, []);
  
  const handleDragStart = useCallback((e: React.MouseEvent | TouchEvent, charmId: string) => {
    if ('preventDefault' in e && e.cancelable) e.preventDefault();
    e.stopPropagation();

    interactionState.isDragging = true;
    interactionState.activeCharmId = charmId;
    setSelectedPlacedCharmId(charmId);

    const point = 'touches' in e ? e.touches[0] : e;
    interactionState.dragStart = { x: point.clientX, y: point.clientY };
  }, [interactionState]);
  
  const handleRotateCharm = useCallback((charmId: string, newRotation: number) => {
    setPlacedCharms(prev =>
      prev.map(pc => (pc.id === charmId ? { ...pc, rotation: newRotation } : pc))
    );
  }, []);

  useEffect(() => {
    const canvas = canvasWrapperRef.current;
    if (!canvas) return;

    if (isMobile && (isCharmsSheetOpen || isSuggestionsSheetOpen)) {
        return;
    }

    const getPoint = (e: MouseEvent | TouchEvent) => 'touches' in e ? e.touches[0] : e;
    
    const handleInteractionEnd = () => {
      interactionState.isDragging = false;
      interactionState.activeCharmId = null;
    };
    
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (interactionState.isDragging && 'preventDefault' in e && e.cancelable) {
        e.preventDefault();
      }

      if (interactionState.isDragging && interactionState.activeCharmId) {
          const imgRect = modelImageRef.current?.getBoundingClientRect();
          if (!imgRect) return;

          const point = getPoint(e);
          const dx = (point.clientX - interactionState.dragStart.x) / scale;
          const dy = (point.clientY - interactionState.dragStart.y) / scale;
          
          const currentPlacedCharms = placedCharmsRef.current;
          const charmToMove = currentPlacedCharms.find(pc => pc.id === interactionState.activeCharmId);
          
          if (charmToMove) {
              const currentPixelX = charmToMove.position.x * imgRect.width;
              const currentPixelY = charmToMove.position.y * imgRect.height;
              
              const newPixelX = currentPixelX + dx;
              const newPixelY = currentPixelY + dy;

              const newNormalizedX = newPixelX / imgRect.width;
              const newNormalizedY = newPixelY / imgRect.height;

              const newPlacedCharms = currentPlacedCharms.map(pc =>
                  pc.id === interactionState.activeCharmId
                  ? { ...pc, position: { x: newNormalizedX, y: newNormalizedY } }
                  : pc
              );
              setPlacedCharms(newPlacedCharms);
          }
          
          interactionState.dragStart = { x: point.clientX, y: point.clientY };
      }
    };

    // Desktop
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleInteractionEnd);
    
    // Mobile
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleInteractionEnd);
    
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleInteractionEnd);
    };
  }, [interactionState, scale, isMobile, isCharmsSheetOpen, isSuggestionsSheetOpen, modelImageRef]);
  
  const handleCharmListClick = (charmId: string) => {
    setSelectedPlacedCharmId(charmId);
    setPlacedCharms(prev => prev.map(pc =>
      pc.id === charmId ? { ...pc, animation: 'breathe 0.5s ease-out' } : pc
    ));
    setTimeout(() => {
      setPlacedCharms(prev =>
        prev.map(pc =>
          pc.id === charmId ? { ...pc, animation: undefined } : pc
        )
      );
    }, 500);
  };
  
  const handleFinalize = () => {
    setIsFinalizeOpen(true);
  };

  const handleAddToCart = useCallback((previewImage: string) => {
    const itemPayload: Omit<CartItem, 'id'> = {
      model,
      jewelryType,
      placedCharms,
      previewImage: previewImage,
    };

    if (isEditing && cartItemId) {
      updateCartItem(cartItemId, { id: cartItemId, ...itemPayload });
    } else {
      addToCart(itemPayload);
      setPlacedCharms([]);
    }
    setIsFinalizeOpen(false);
    setIsCartSheetOpen(true);
  }, [addToCart, updateCartItem, cartItemId, isEditing, model, jewelryType, placedCharms]);

  const placedCharmCounts = useMemo(() => {
    const counts = new Map<string, number>();
    placedCharms.forEach(pc => {
        counts.set(pc.charm.id, (counts.get(pc.charm.id) || 0) + 1);
    });
    return counts;
  }, [placedCharms]);

  const availableCharms = useMemo(() => {
    return allCharms.map(charm => ({
      ...charm,
      quantity: (charm.quantity ?? 0) - (placedCharmCounts.get(charm.id) || 0)
    }));
  }, [allCharms, placedCharmCounts]);

  const handleAnalyzeForSuggestions = async (): Promise<string | null> => {
    setIsGenerating(true);
    setSuggestions([]);
    setCritique(null);

    try {
      const photoDataUri = await getCanvasDataUri();

      const analysisResult = await getCharmAnalysisSuggestionsAction({
        photoDataUri: photoDataUri,
        allCharms: allCharms.map(c => c.name),
      });

      if (analysisResult.success && analysisResult.suggestions) {
         const placementResult = await getCharmSuggestionsAction({
            jewelryType: jewelryType.name,
            existingCharms: placedCharms.map(pc => pc.charm.name),
            allCharms: analysisResult.suggestions,
        });

        if (placementResult.success && placementResult.suggestions) {
            setSuggestions(placementResult.suggestions);
        } else {
             throw new Error(placementResult.error || "Une erreur inconnue est survenue lors de la génération des emplacements.");
        }
      } else {
        throw new Error(analysisResult.error || "Une erreur inconnue est survenue lors de l'analyse.");
      }
      return null;
    } catch (error: any) {
      console.error("Error in handleAnalyzeCurrentDesign:", error.message);
      return error.message;
    } finally {
      setIsGenerating(false);
    }
  };
  
  const applySuggestion = (suggestion: Suggestion) => {
    const charmToAdd = allCharms.find(c => c.name === suggestion.charmName);
    if (charmToAdd) {
      addCharmToCanvas(charmToAdd, {
        source: 'suggestionsPanel',
        position: suggestion.position
      });
    } else {
      toast({
        variant: "destructive",
        title: "Breloque non trouvée",
        description: `La breloque "${suggestion.charmName}" n'a pas pu être trouvée.`,
      });
    }
  };

  const handleCritiqueDesign = async (): Promise<string | null> => {
    setIsGenerating(true);
    setSuggestions([]);
    setCritique(null);

    try {
      const photoDataUri = await getCanvasDataUri();

      const critiqueResult = await getCharmDesignCritiqueAction({
        photoDataUri: photoDataUri,
        locale: locale,
      });
      
      if (critiqueResult.success && critiqueResult.critique) {
        setCritique(critiqueResult.critique);
        return null;
      } else {
         throw new Error(critiqueResult.error || "Une erreur inconnue est survenue lors de l'analyse.");
      }
      
    } catch (error: any) {
        console.error("Error in handleCritiqueDesign:", error.message);
        return error.message;
    } finally {
      setIsGenerating(false);
    }
  }
  
  const { sortedPlacedCharms, hasStockIssues } = useMemo(() => {
    const counts = new Map<string, number>();
    const charmsWithStockInfo = placedCharms.map(pc => {
      const charmInfo = allCharms.find(c => c.id === pc.charm.id);
      const stock = charmInfo?.quantity ?? 0;
      const count = (counts.get(pc.charm.id) || 0) + 1;
      counts.set(pc.charm.id, count);
      return {
        ...pc,
        isAvailable: stock >= count,
      };
    }).sort((a, b) => b.position.y - a.position.y);

    const hasIssues = charmsWithStockInfo.some(c => !c.isAvailable);
    
    return { sortedPlacedCharms: charmsWithStockInfo, hasStockIssues: hasIssues };
  }, [placedCharms, allCharms]);


  return (
    <>
      <CartSheet open={isCartSheetOpen} onOpenChange={setIsCartSheetOpen} />
      {isShareOpen && (
        <ShareDialog
          isOpen={isShareOpen}
          onOpenChange={() => setIsShareOpen(false)}
          getCanvasDataUri={getCanvasDataUri}
          t={t}
        />
      )}
      {isFinalizeOpen && (
        <FinalizeCreationDialog
            isOpen={isFinalizeOpen}
            onOpenChange={setIsFinalizeOpen}
            getCanvasDataUri={getCanvasDataUri}
            onConfirmAddToCart={handleAddToCart}
            isEditing={isEditing}
            placedCharms={placedCharms}
            jewelryType={jewelryType}
            model={model}
            locale={locale}
        />
      )}

      <div className="flex flex-col h-screen overflow-hidden">
        <header className="p-4 border-b flex-shrink-0">
            <div className="container mx-auto flex justify-between items-center">
              <Link href={`/${locale}`} className="flex items-center gap-2">
                <BrandLogo className="h-8 w-auto text-foreground" />
              </Link>
              <div className="flex items-center gap-2">
                  <CartWidget />
              </div>
            </div>
          </header>
        <main className="flex-grow flex flex-col md:p-8 min-h-0 pb-32">
          <div className="container mx-auto flex-1 flex flex-col min-h-0">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow min-h-0">
              
              <div className="lg:col-span-3 flex-col min-h-0 hidden lg:flex">
                <CharmsPanel 
                  allCharms={availableCharms}
                  charmCategories={charmCategories}
                  onAddCharm={addCharmFromCharmList} 
                  searchTerm={charmsSearchTerm}
                  onSearchTermChange={setCharmsSearchTerm}
                />
              </div>

              <div className="lg:col-span-6 flex flex-col gap-4 min-h-0 order-first lg:order-none max-h-full">
                  <div className="flex justify-between items-center gap-4 flex-shrink-0 px-4 pt-4 lg:p-0">
                      <Button variant="ghost" asChild className="p-0 h-auto lg:h-10 lg:p-2">
                          <Link href={`/${locale}/?type=${jewelryType.id}`}>
                              <ArrowLeft className="mr-2 h-4 w-4" />
                              <span className="hidden lg:inline">{tHome('back_button')}</span>
                          </Link>
                      </Button>
                      <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                    <Info className="h-5 w-5" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                <CardTitle className="font-headline text-xl">{t('editor_disclaimer_title')}</CardTitle>
                                </DialogHeader>
                                <p className="text-sm text-muted-foreground mt-2">
                                {t('editor_disclaimer')}
                                </p>
                            </DialogContent>
                        </Dialog>
                        <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setIsShareOpen(true)}>
                          <Share2 />
                          <span className="sr-only">{t('share_button')}</span>
                        </Button>
                         <div className="hidden lg:inline-flex items-center gap-2">
                            <Button variant="outline" onClick={() => setIsShareOpen(true)}>
                                <Share2 />
                                {t('share_button')}
                            </Button>
                            <Button onClick={handleFinalize} disabled={hasStockIssues || placedCharms.length === 0}>
                                <Check />
                                {isEditing ? t('update_item_button') : t('finalize_button')}
                            </Button>
                        </div>
                      </div>
                  </div>
                  <div
                      ref={canvasWrapperRef}
                      className="relative w-full flex-grow bg-card overflow-hidden touch-none border-2 border-dashed"
                  >
                      <div
                          ref={canvasRef}
                          className="relative"
                          style={{
                              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                              transformOrigin: '0 0',
                              width: '100%',
                              height: '100%',
                          }}
                      >
                          <div ref={modelImageContainerRef} className="absolute inset-0 grid place-items-start justify-center">
                              <Image
                                  ref={modelImageRef}
                                  src={model.editorImageUrl}
                                  alt={model.name}
                                  width={1000}
                                  height={1000}
                                  className="pointer-events-none max-w-full max-h-full object-contain"
                                  data-ai-hint="jewelry model"
                                  priority
                                  crossOrigin="anonymous"
                              />
                          </div>
                          
                          {pixelsPerMm && modelImageRect && sortedPlacedCharms.map((placed) => {
                            const pixelSize = {
                              width: (placed.charm.width ?? 20) * pixelsPerMm,
                              height: (placed.charm.height ?? 20) * pixelsPerMm,
                            };
                            return (
                              <PlacedCharmComponent
                                  key={placed.id}
                                  placed={placed}
                                  isSelected={selectedPlacedCharmId === placed.id}
                                  onDragStart={handleDragStart}
                                  onDelete={removeCharm}
                                  onRotate={handleRotateCharm}
                                  pixelSize={pixelSize}
                                  modelImageRect={modelImageRect}
                              />
                            )
                          })}
                      </div>

                      {!isMobile && (
                        <div className="absolute bottom-2 right-2 flex gap-2">
                            <Button variant="secondary" size="icon" onClick={() => handleManualZoom('in')}><ZoomIn /></Button>
                            <Button variant="secondary" size="icon" onClick={() => handleManualZoom('out')}><ZoomOut /></Button>
                            <Button variant="secondary" size="icon" onClick={resetZoomAndPan}><Maximize /></Button>
                        </div>
                      )}
                  </div>
                  
                   <div className="hidden lg:block flex-shrink-0">
                        <PlacedCharmsList 
                            placedCharms={sortedPlacedCharms}
                            selectedPlacedCharmId={selectedPlacedCharmId}
                            onCharmClick={handleCharmListClick}
                            onCharmDelete={removeCharm}
                            isMobile={false}
                        />
                    </div>
              </div>

              <div className="lg:col-span-3 flex-col gap-6 min-h-0 hidden lg:flex">
                <SuggestionSidebar
                    charms={allCharms}
                    onAnalyze={handleAnalyzeForSuggestions}
                    onCritique={handleCritiqueDesign}
                    isLoading={isGenerating}
                    suggestions={suggestions}
                    critique={critique}
                    onApplySuggestion={applySuggestion}
                />
              </div>
              </div>
          </div>
        </main>

         {isMobile && (
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-2.5 z-20 space-y-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
                <Button onClick={handleFinalize} className="w-full" disabled={hasStockIssues || placedCharms.length === 0}>
                    <Check />
                    {isEditing ? t('update_item_button') : t('finalize_button')}
                </Button>

                 <div className="grid grid-cols-2 gap-2.5">
                      <Sheet open={isCharmsSheetOpen} onOpenChange={setIsCharmsSheetOpen}>
                          <SheetTrigger asChild>
                              <Button variant="outline" className="w-full">
                                  <Gem className="mr-2 h-4 w-4" />
                                  {tCharm('title')}
                              </Button>
                          </SheetTrigger>
                          <SheetContent side="bottom" className="h-[80%] p-0 flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
                              <Tabs defaultValue="add" className="w-full flex-grow min-h-0 flex flex-col">
                                  <div className="p-4 border-b flex-shrink-0">
                                      <SheetHeader>
                                          <SheetTitle>
                                              <TabsList className="grid w-full grid-cols-2">
                                                  <TabsTrigger value="add">Ajouter</TabsTrigger>
                                                  <TabsTrigger value="placed">Installées ({placedCharms.length})</TabsTrigger>
                                              </TabsList>
                                          </SheetTitle>
                                      </SheetHeader>
                                      <div className="relative mt-4">
                                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                          <Input
                                              placeholder={tCharm('search_placeholder')}
                                              value={charmsSearchTerm}
                                              onChange={(e) => setCharmsSearchTerm(e.target.value)}
                                              className="pl-9"
                                          />
                                      </div>
                                  </div>
                                  <TabsContent value="add" className="m-0 flex-grow min-h-0">
                                      <div className="flex-grow overflow-y-auto h-full">
                                          <CharmsPanel 
                                              allCharms={availableCharms}
                                              charmCategories={charmCategories}
                                              onAddCharm={addCharmFromCharmList} 
                                              isMobileSheet={true}
                                              searchTerm={charmsSearchTerm}
                                              onSearchTermChange={setCharmsSearchTerm}
                                          />
                                      </div>
                                  </TabsContent>
                                  <TabsContent value="placed" className="m-0 flex-grow min-h-0">
                                       <PlacedCharmsList 
                                            placedCharms={sortedPlacedCharms}
                                            selectedPlacedCharmId={selectedPlacedCharmId}
                                            onCharmClick={handleCharmListClick}
                                            onCharmDelete={removeCharm}
                                            isMobile={true}
                                        />
                                  </TabsContent>
                              </Tabs>
                          </SheetContent>
                      </Sheet>
                        <Sheet open={isSuggestionsSheetOpen} onOpenChange={setIsSuggestionsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="w-full">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                     <span className="ml-2">Suggestions IA</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="h-[80%] p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
                                <SheetHeader className="p-4 border-b">
                                    <SheetTitle>{t('ai_suggestions_title')}</SheetTitle>
                                </SheetHeader>
                                <div className="relative flex-1">
                                    <div className="absolute inset-0">
                                        <SuggestionSidebar 
                                            charms={allCharms} 
                                            isMobile={true}
                                            onAnalyze={handleAnalyzeForSuggestions}
                                            onCritique={handleCritiqueDesign}
                                            isLoading={isGenerating}
                                            suggestions={suggestions}
                                            critique={critique}
                                            onApplySuggestion={applySuggestion}
                                        />
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                </div>
            </div>
          )}
      </div>
    </>
  );
}





    