

"use client";

import React, { useState, useMemo, useRef, WheelEvent as ReactWheelEvent, useCallback, useEffect, TouchEvent as ReactTouchEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { JewelryModel, PlacedCharm, Charm, JewelryType, CartItem, CharmCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SuggestionSidebar } from './suggestion-sidebar';
import { Trash2, X, ArrowLeft, Gem, Sparkles, Search, ShoppingCart, PlusCircle, ZoomIn, ZoomOut, Maximize, AlertCircle, Info, Share2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandLogo } from './icons';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { CharmsPanel } from './charms-panel';
import { Input } from './ui/input';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams, useParams } from 'next/navigation';
import { CartSheet } from './cart-sheet';
import html2canvas from 'html2canvas';
import { CartWidget } from './cart-widget';
import { useTranslations } from '@/hooks/use-translations';
import { getCharmSuggestionsAction, getRefreshedCharms, getCharmAnalysisSuggestionsAction, getCharmDesignCritiqueAction, generateShareContentAction } from '@/app/actions';
import { CharmSuggestionOutput } from '@/ai/flows/charm-placement-suggestions';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ShareDialog } from './share-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';

interface PlacedCharmComponentProps {
    placed: PlacedCharm;
    isSelected: boolean;
    onDragStart: (e: React.MouseEvent<HTMLDivElement> | TouchEvent, charmId: string) => void;
    onDelete: (charmId: string) => void;
    onRotate: (charmId: string, newRotation: number) => void;
    pixelSize: { width: number; height: number; };
    scale: number;
}
  
const PlacedCharmComponent = React.memo(({ placed, isSelected, onDragStart, onDelete, onRotate, pixelSize, scale }: PlacedCharmComponentProps) => {
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

    const handleWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const rotationAmount = e.deltaY > 0 ? 10 : -10; // Rotate by 10 degrees
        onRotate(placed.id, placed.rotation + rotationAmount);
    };


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
            style={{
                left: `${placed.position.x}%`,
                top: `${placed.position.y}%`,
                width: pixelSize.width,
                height: 'auto',
                transform: `translate(-50%, -50%) rotate(${placed.rotation}deg)`,
                animation: placed.animation,
                touchAction: 'none',
            }}
        >
            <Image
                src={placed.charm.imageUrl}
                alt={placed.charm.name}
                className="pointer-events-none select-none object-contain w-full h-auto"
                data-ai-hint="jewelry charm"
                draggable="false"
                width={pixelSize.width}
                height={pixelSize.height}
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
  const locale = params.locale as string;

  const cartItemId = searchParams.get('cartItemId');
  const [allCharms, setAllCharms] = useState(initialAllCharms);
  
  const [placedCharms, setPlacedCharms] = useState<PlacedCharm[]>([]);
  const [selectedPlacedCharmId, setSelectedPlacedCharmId] = useState<string | null>(null);

  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const modelImageRef = useRef<HTMLImageElement>(null);
  
  const [isCharmsSheetOpen, setIsCharmsSheetOpen] = useState(false);
  const [isSuggestionsSheetOpen, setIsSuggestionsSheetOpen] = useState(false);
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [charmsSearchTerm, setCharmsSearchTerm] = useState('');

  const [captureRequest, setCaptureRequest] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [critique, setCritique] = useState<string | null>(null);

  const [pixelsPerMm, setPixelsPerMm] = useState<number | null>(null);
  
  const isEditing = cartItemId !== null;

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

  const resetZoomAndPan = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const getCanvasDataUri = useCallback(async (): Promise<string> => {
    if (!canvasRef.current) {
      throw new Error("Canvas ref is not available");
    }
    resetZoomAndPan();
    setSelectedPlacedCharmId(null);
    
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            try {
                const canvas = await html2canvas(canvasRef.current!, {
                    backgroundColor: null,
                    logging: false,
                    useCORS: true,
                    allowTaint: true,
                    scale: 1,
                    width: canvasRef.current!.offsetWidth,
                    height: canvasRef.current!.offsetHeight,
                });
                resolve(canvas.toDataURL('image/png', 0.9));
            } catch (error) {
                console.error("Error capturing canvas:", error);
                reject(error);
            }
        }, 50);
    });
  }, [resetZoomAndPan]);


  const interactionState = useRef({
    isDragging: false,
    isPanning: false,
    dragStart: { x: 0, y: 0 },
    activeCharmId: null as string | null,
    panStart: { x: 0, y: 0 },
    isPinching: false,
    pinchInitialDist: 0,
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

  
  const removeCharm = useCallback((id: string) => {
    setPlacedCharms(prev => prev.filter(c => c.id !== id));
  }, []);
  
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
  
  const handleRotateCharm = useCallback((charmId: string, newRotation: number) => {
    setPlacedCharms(prev =>
      prev.map(pc => (pc.id === charmId ? { ...pc, rotation: newRotation } : pc))
    );
  }, []);

  const zoomToPoint = useCallback((newScale: number, pointX: number, pointY: number) => {
    const clampedScale = Math.max(0.2, Math.min(newScale, 5));
    const currentPan = panRef.current;
    const currentScale = scaleRef.current;

    const newPanX = pointX - ((pointX - currentPan.x) * (clampedScale / currentScale));
    const newPanY = pointY - ((pointY - currentPan.y) * (clampedScale / currentScale));

    setPan({ x: newPanX, y: newPanY });
    setScale(clampedScale);
}, []);

  useEffect(() => {
    const canvas = canvasWrapperRef.current;
    if (!canvas) return;

    // Do not attach event listeners if a sheet is open on mobile
    if (isMobile && (isCharmsSheetOpen || isSuggestionsSheetOpen)) {
        return;
    }

    const getPoint = (e: MouseEvent | TouchEvent) => 'touches' in e ? e.touches[0] : e;
    
    const getTouchCenter = (touches: TouchList) => {
        const t1 = touches[0];
        const t2 = touches[1];
        return {
            x: (t1.clientX + t2.clientX) / 2,
            y: (t1.clientY + t2.clientY) / 2,
        };
    };

    const getTouchDistance = (touches: TouchList) => {
        const t1 = touches[0];
        const t2 = touches[1];
        return Math.sqrt(
            Math.pow(t1.clientX - t2.clientX, 2) +
            Math.pow(t1.clientY - t2.clientY, 2)
        );
    };

    const handleInteractionEnd = () => {
      interactionState.isDragging = false;
      interactionState.isPanning = false;
      interactionState.isPinching = false;
      interactionState.activeCharmId = null;
    };
    
    const handleWheel = (e: globalThis.WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.charm-on-canvas')) return;
      e.preventDefault();
      
      const canvasRect = canvas.getBoundingClientRect();
      const zoomFactor = e.deltaY * -0.005;
      const newScale = scaleRef.current * (1 + zoomFactor);
      
      const pointX = e.clientX - canvasRect.left;
      const pointY = e.clientY - canvasRect.top;

      zoomToPoint(newScale, pointX, pointY);
    };
    
    const handleMove = (e: MouseEvent | TouchEvent) => {
      
      if ('preventDefault' in e && e.cancelable) e.preventDefault();

      if (interactionState.isDragging && interactionState.activeCharmId) {
        const canvasEl = canvasRef.current;
        if (!canvasEl) return;
        const point = getPoint(e);
        const dx = point.clientX - interactionState.dragStart.x;
        const dy = point.clientY - interactionState.dragStart.y;
        
        const currentPlacedCharms = placedCharmsRef.current;
        const charmToMove = currentPlacedCharms.find(pc => pc.id === interactionState.activeCharmId);
        
        if (charmToMove) {
          const dxPercent = (dx / canvasEl.clientWidth) * 100 / scaleRef.current;
          const dyPercent = (dy / canvasEl.clientHeight) * 100 / scaleRef.current;
          
          const newPlacedCharms = currentPlacedCharms.map(pc =>
            pc.id === interactionState.activeCharmId
            ? { ...pc, position: { x: pc.position.x + dxPercent, y: pc.position.y + dyPercent } }
            : pc
          );
          setPlacedCharms(newPlacedCharms);
        }
        
        interactionState.dragStart = { x: point.clientX, y: point.clientY };

      } else if (interactionState.isPanning) {
        const point = getPoint(e);
        const newX = point.clientX - interactionState.panStart.x;
        const newY = point.clientY - interactionState.panStart.y;
        setPan({ x: newX, y: newY });
      } else if (interactionState.isPinching && 'touches' in e && e.touches.length === 2) {
          const newDist = getTouchDistance(e.touches);
          const zoomFactor = newDist / interactionState.pinchInitialDist;
          const newScale = scaleRef.current * zoomFactor;

          const touchCenter = getTouchCenter(e.touches);
          const canvasRect = canvas.getBoundingClientRect();
          const pointX = touchCenter.x - canvasRect.left;
          const pointY = touchCenter.y - canvasRect.top;
          
          zoomToPoint(newScale, pointX, pointY);
          interactionState.pinchInitialDist = newDist;
      }
    };

    const handlePanStart = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.charm-on-canvas')) return;
      
      if ('preventDefault' in e && e.cancelable) e.preventDefault();
      
      setSelectedPlacedCharmId(null);
      
      if ('touches' in e) {
          if (e.touches.length === 2) {
              interactionState.isPinching = true;
              interactionState.isPanning = false;
              interactionState.isDragging = false;
              interactionState.pinchInitialDist = getTouchDistance(e.touches);
              return;
          }
          if (e.touches.length !== 1) return;
      }

      interactionState.isPanning = true;
      interactionState.isDragging = false;
      interactionState.isPinching = false;
      
      const point = getPoint(e);
      interactionState.panStart = { x: point.clientX - panRef.current.x, y: point.clientY - panRef.current.y };
    }
    
    // Desktop
    canvas.addEventListener('mousedown', handlePanStart);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleInteractionEnd);
    
    // Mobile
    canvas.addEventListener('touchstart', handlePanStart, { passive: false });
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleInteractionEnd);
    
    return () => {
      canvas.removeEventListener('mousedown', handlePanStart);
      canvas.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleInteractionEnd);
      canvas.removeEventListener('touchstart', handlePanStart);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleInteractionEnd);
    };
  }, [interactionState, zoomToPoint, isMobile, isCharmsSheetOpen, isSuggestionsSheetOpen]);

  const handleManualZoom = (direction: 'in' | 'out') => {
    if (!canvasWrapperRef.current) return;
    const zoomFactor = direction === 'in' ? 1.2 : 1 / 1.2;
    const newScale = scale * zoomFactor;

    const canvasRect = canvasWrapperRef.current.getBoundingClientRect();
    const pointX = canvasRect.width / 2;
    const pointY = canvasRect.height / 2;
    
    zoomToPoint(newScale, pointX, pointY);
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
  
  const triggerCapture = () => {
    resetZoomAndPan();
    setSelectedPlacedCharmId(null);
    setCaptureRequest(true);
  };

  const handleAddToCart = () => {
    triggerCapture();
  };

  const handleUpdateCart = () => {
    if (!cartItemId) return;
    triggerCapture();
  }

  useEffect(() => {
    if (!captureRequest) return;
  
    const captureAndSave = async () => {
      try {
        const previewImage = await getCanvasDataUri();
        
        const currentPlacedCharms = placedCharmsRef.current;
  
        if (isEditing && cartItemId) {
          const updatedItem = {
            id: cartItemId,
            model,
            jewelryType,
            placedCharms: currentPlacedCharms,
            previewImage
          };
          updateCartItem(cartItemId, updatedItem);
        } else {
          const newItem: Omit<CartItem, 'id'> = {
            model,
            jewelryType,
            placedCharms: currentPlacedCharms,
            previewImage: previewImage
          };
          addToCart(newItem);
        }
        setIsCartSheetOpen(true);
      } catch (error) {
        console.error("Erreur lors de la capture du canvas:", error);
      } finally {
        setCaptureRequest(false);
      }
    };
    
    // Use a small timeout to ensure the UI has reset before capturing
    const timer = setTimeout(captureAndSave, 50);
  
    return () => clearTimeout(timer);
  }, [captureRequest, getCanvasDataUri, isEditing, cartItemId, model, jewelryType, updateCartItem, addToCart]);

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

  const charmsPanelDesktop = useMemo(() => (
    <CharmsPanel 
        allCharms={availableCharms}
        charmCategories={charmCategories}
        onAddCharm={addCharmFromCharmList} 
        searchTerm={charmsSearchTerm}
        onSearchTermChange={setCharmsSearchTerm}
    />
  ), [availableCharms, charmCategories, addCharmFromCharmList, charmsSearchTerm]);

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


  const calculatePixelsPerMm = useCallback(() => {
    if (modelImageRef.current && (model.width || model.height)) {
        const imageWidthPx = modelImageRef.current.offsetWidth;
        const imageHeightPx = modelImageRef.current.offsetHeight;
        const modelWidthMm = model.width || (imageWidthPx / imageHeightPx) * (model.height || 1);
        const modelHeightMm = model.height || (imageHeightPx / imageWidthPx) * (model.width || 1);

        const pxPerMmWidth = imageWidthPx / modelWidthMm;
        const pxPerMmHeight = imageHeightPx / modelHeightMm;
        
        setPixelsPerMm((pxPerMmWidth + pxPerMmHeight) / 2);
    }
  }, [model.width, model.height]);

  useEffect(() => {
    const imageEl = modelImageRef.current;
    if (!imageEl) return;

    // Initial calculation
    const handleLoad = () => calculatePixelsPerMm();
    imageEl.addEventListener('load', handleLoad);
    if (imageEl.complete) {
        calculatePixelsPerMm();
    }

    // Recalculate on window resize
    window.addEventListener('resize', calculatePixelsPerMm);
    return () => {
        window.removeEventListener('resize', calculatePixelsPerMm)
        if (imageEl) {
          imageEl.removeEventListener('load', handleLoad);
        }
    };
  }, [calculatePixelsPerMm]);

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
    });

    const hasIssues = charmsWithStockInfo.some(c => !c.isAvailable);

    // Sort from lower Y to higher Y so that higher charms are rendered last (and appear on top)
    const sorted = [...charmsWithStockInfo].sort((a, b) => b.position.y - a.position.y);
    
    return { sortedPlacedCharms: sorted, hasStockIssues: hasIssues };
  }, [placedCharms, allCharms]);


  return (
    <>
      <CartSheet open={isCartSheetOpen} onOpenChange={setIsCartSheetOpen} />
      {isShareOpen && (
        <ShareDialog
          isOpen={isShareOpen}
          onOpenChange={setIsShareOpen}
          getCanvasDataUri={getCanvasDataUri}
          t={t}
        />
      )}
      <div className={cn("flex flex-col h-screen overflow-hidden", isMobile && "h-[calc(100dvh)]")}>
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
        <main className={cn("flex-grow flex flex-col p-4 md:p-8 min-h-0", isMobile && "p-0 pb-0 overflow-y-hidden")}>
          <div className={cn("container mx-auto flex-1 flex flex-col min-h-0", isMobile && "px-0")}>
              <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow min-h-0", isMobile && "grid-cols-1 gap-0")}>
              {!isMobile && (
                  <div className="lg:col-span-3 flex flex-col min-h-0">
                      {charmsPanelDesktop}
                  </div>
              )}

              <div className={cn("lg:col-span-6 flex flex-col gap-4 min-h-0", isMobile && "order-first")}>
                  <div className={cn("flex justify-between items-center gap-4 flex-shrink-0", isMobile && "px-4 pt-4")}>
                      <Button variant="ghost" asChild className={cn(isMobile ? "p-0 h-auto" : "")}>
                          <Link href={`/${locale}/?type=${jewelryType.id}`}>
                              <ArrowLeft className="mr-2 h-4 w-4" />
                              {!isMobile && tHome('back_button')}
                          </Link>
                      </Button>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size={isMobile ? "icon" : "default"} onClick={() => setIsShareOpen(true)}>
                          <Share2 className={cn(!isMobile && "mr-2")}/>
                          {!isMobile && t('share_button')}
                        </Button>
                        {!isMobile && (
                          isEditing ? (
                              <Button onClick={handleUpdateCart} disabled={captureRequest || hasStockIssues}>
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  {t('update_item_button')}
                              </Button>
                          ) : (
                              <Button onClick={handleAddToCart} disabled={captureRequest || hasStockIssues}>
                                  <ShoppingCart className="mr-2 h-4 w-4" />
                                  {t('add_to_cart_button')}
                              </Button>
                          )
                        )}
                      </div>
                  </div>
                  <div
                      ref={canvasWrapperRef}
                      className={cn(
                        "relative w-full aspect-square bg-card border-2 border-dashed border-muted-foreground/30 overflow-hidden touch-none grid place-items-center flex-shrink-0", 
                        isMobile && "rounded-none border-0 flex-grow",
                        isMobile && (isCharmsSheetOpen || isSuggestionsSheetOpen) && "pointer-events-none"
                      )}
                  >
                      <div
                          ref={canvasRef}
                          className={cn(
                            "relative w-full h-full grid", 
                            jewelryType.id === 'necklace' ? 'items-start justify-center' : 'place-items-center'
                          )}
                          style={{
                              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                              transformOrigin: '0 0',
                          }}
                      >
                          <Image
                              ref={modelImageRef}
                              src={model.editorImageUrl}
                              alt={model.name}
                              width={1000}
                              height={1000}
                              className="pointer-events-none max-w-full max-h-full object-contain"
                              data-ai-hint="jewelry model"
                              priority
                          />
                          
                          {pixelsPerMm && sortedPlacedCharms.map((placed) => {
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
                                  scale={scale}
                              />
                            )
                          })}
                      </div>

                      <div className="absolute bottom-4 left-4 z-10">
                           <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground rounded-full hover:bg-muted/50 hover:text-foreground">
                                        <Info className="h-5 w-5" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                    <DialogTitle className="font-headline text-xl">{t('editor_disclaimer_title')}</DialogTitle>
                                    </DialogHeader>
                                    <p className="text-sm text-muted-foreground mt-2">
                                    {t('editor_disclaimer')}
                                    </p>
                                </DialogContent>
                           </Dialog>
                      </div>

                      {!isMobile && (
                        <div className="absolute bottom-2 right-2 flex gap-2">
                            <Button variant="secondary" size="icon" onClick={() => handleManualZoom('in')}><ZoomIn /></Button>
                            <Button variant="secondary" size="icon" onClick={() => handleManualZoom('out')}><ZoomOut /></Button>
                            <Button variant="secondary" size="icon" onClick={resetZoomAndPan}><Maximize /></Button>
                        </div>
                      )}
                  </div>
                    
                  {!isMobile && (
                      <Card className="flex-shrink-0">
                          <CardHeader>
                              <CardTitle className="font-headline text-lg">{t('added_charms_title', {count: placedCharms.length})}</CardTitle>
                          </CardHeader>
                          <CardContent>
                              {placedCharms.length === 0 ? (
                                  <p className="text-muted-foreground text-sm text-center py-4">{t('added_charms_placeholder')}</p>
                              ) : (
                                  <Carousel
                                      opts={{
                                          align: "start",
                                      }}
                                      className="w-full"
                                  >
                                      <CarouselContent>
                                          {sortedPlacedCharms.map((pc) => (
                                              <CarouselItem key={pc.id} className="basis-1/5">
                                                  <div className="p-1">
                                                      <Card
                                                          className={cn("p-2 aspect-square flex flex-col items-center justify-center cursor-pointer relative group",
                                                              selectedPlacedCharmId === pc.id ? 'border-primary' : 'hover:border-primary/50',
                                                              !pc.isAvailable && "border-destructive hover:border-destructive/50"
                                                          )}
                                                          onClick={() => handleCharmListClick(pc.id)}
                                                      >
                                                          {!pc.isAvailable && (
                                                              <TooltipProvider>
                                                                  <Tooltip>
                                                                      <TooltipTrigger asChild>
                                                                          <div className="absolute inset-0 bg-destructive/20 z-10 flex items-center justify-center">
                                                                              <AlertCircle className="h-6 w-6 text-destructive" />
                                                                          </div>
                                                                      </TooltipTrigger>
                                                                      <TooltipContent>
                                                                          <p>{t('stock_issue_tooltip')}</p>
                                                                      </TooltipContent>
                                                                  </Tooltip>
                                                              </TooltipProvider>
                                                          )}
                                                          <Image src={pc.charm.imageUrl} alt={pc.charm.name} width={48} height={48} className="w-12 h-12 object-contain" data-ai-hint="jewelry charm" />
                                                          <p className="text-xs text-center mt-1 truncate w-full">{pc.charm.name}</p>
                                                          <Button
                                                              variant="destructive"
                                                              size="icon"
                                                              className={cn(
                                                                  "absolute top-1 right-1 h-5 w-5 transition-opacity z-20",
                                                                  selectedPlacedCharmId === pc.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                                              )}
                                                              onMouseDown={(e) => { e.stopPropagation(); removeCharm(pc.id); }}
                                                              onTouchStart={(e) => { e.stopPropagation(); removeCharm(pc.id); }}
                                                          >
                                                              <X className="h-3 w-3" />
                                                          </Button>
                                                      </Card>
                                                  </div>
                                              </CarouselItem>
                                          ))}
                                      </CarouselContent>
                                      <CarouselPrevious />
                                      <CarouselNext />
                                  </Carousel>
                              )}
                          </CardContent>
                      </Card>
                  )}
              </div>

              {!isMobile && (
                <div className="lg:col-span-3 flex flex-col gap-6 min-h-0">
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
              )}
              </div>
          </div>
        </main>

         {isMobile && (
          <>
            {isEditing ? (
              <Button onClick={handleUpdateCart} disabled={captureRequest || hasStockIssues} className="fixed bottom-24 right-4 z-20 h-14 w-14 rounded-full shadow-lg">
                <PlusCircle className="h-6 w-6" />
              </Button>
            ) : (
              <Button onClick={handleAddToCart} disabled={captureRequest || hasStockIssues} className="fixed bottom-24 right-4 z-20 h-14 w-14 rounded-full shadow-lg">
                <ShoppingCart className="h-6 w-6" />
              </Button>
            )}
            <div className="sticky bottom-0 left-0 right-0 bg-background border-t p-2 flex justify-around">
              <Sheet open={isCharmsSheetOpen} onOpenChange={setIsCharmsSheetOpen}>
                  <SheetTrigger asChild>
                      <Button variant="ghost" className="flex flex-col h-auto p-2">
                         <Gem className="h-6 w-6" />
                         <span className="text-xs">{tCharm('title')}</span>
                      </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[80%] p-0 flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
                        <Tabs defaultValue="add" className="flex flex-col flex-grow h-full min-h-0">
                            <SheetHeader className="p-4 border-b flex-shrink-0">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="add">Ajouter</TabsTrigger>
                                    <TabsTrigger value="placed">Installées ({placedCharms.length})</TabsTrigger>
                                </TabsList>
                            </SheetHeader>
                            <TabsContent value="add" className="m-0 flex-grow min-h-0 flex flex-col">
                                <div className="p-4 border-b flex-shrink-0">
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
                                <div className="flex-grow overflow-y-auto">
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
                            <TabsContent value="placed" className="m-0 flex-grow overflow-y-auto no-scrollbar">
                                <div className="p-4">
                                {placedCharms.length === 0 ? (
                                    <p className="text-muted-foreground text-sm text-center py-8">{t('added_charms_placeholder')}</p>
                                ) : (
                                    <div className="grid grid-cols-4 gap-2">
                                    {sortedPlacedCharms.map((pc) => (
                                        <div key={pc.id} className="p-1">
                                            <Card 
                                                className={cn("p-2 aspect-square flex flex-col items-center justify-center cursor-pointer relative group",
                                                    selectedPlacedCharmId === pc.id ? 'border-primary' : 'hover:border-primary/50',
                                                    !pc.isAvailable && "border-destructive hover:border-destructive/50"
                                                )}
                                                onClick={() => handleCharmListClick(pc.id)}
                                            >
                                                {!pc.isAvailable && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="absolute inset-0 bg-destructive/20 z-10 flex items-center justify-center">
                                                                    <AlertCircle className="h-6 w-6 text-destructive" />
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{t('stock_issue_tooltip')}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                                <Image src={pc.charm.imageUrl} alt={pc.charm.name} width={48} height={48} className="w-12 h-12 object-contain" data-ai-hint="jewelry charm" />
                                                <p className="text-xs text-center mt-1 truncate w-full">{pc.charm.name}</p>
                                                <Button 
                                                    variant="destructive" 
                                                    size="icon" 
                                                    className={cn(
                                                        "absolute top-1 right-1 h-5 w-5 transition-opacity z-20",
                                                        selectedPlacedCharmId === pc.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                                    )}
                                                    onMouseDown={(e) => { e.stopPropagation(); removeCharm(pc.id); }}
                                                    onTouchStart={(e) => { e.stopPropagation(); removeCharm(pc.id); }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </Card>
                                        </div>
                                    ))}
                                    </div>
                                )}
                                </div>
                            </TabsContent>
                        </Tabs>
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
          </>
          )}
      </div>
    </>
  );
}



    


