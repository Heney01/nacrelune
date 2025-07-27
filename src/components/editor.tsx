
"use client";

import React, { useState, useMemo, useRef, WheelEvent, useEffect, TouchEvent, useCallback } from 'react';
import Image from 'next/image';
import { JewelryModel, PlacedCharm, Charm, JewelryType, CharmCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { SuggestionSidebar } from './suggestion-sidebar';
import { Trash2, X, Search, ArrowLeft, Loader2, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NacreluneLogo } from './icons';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, DocumentReference } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { Dialog, DialogContent, DialogTrigger, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { useTranslations, useRichTranslations } from '@/hooks/use-translations';
import { PurchaseDialog } from './purchase-dialog';

interface EditorProps {
  model: JewelryModel;
  jewelryType: Omit<JewelryType, 'models'>;
  onBack: () => void;
  locale: string;
}

export default function Editor({ model, jewelryType, onBack, locale }: EditorProps) {
  const t = useTranslations('Editor');
  const tRich = useRichTranslations();
  const [placedCharms, setPlacedCharms] = useState<PlacedCharm[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlacedCharmId, setSelectedPlacedCharmId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [charms, setCharms] = useState<Charm[]>([]);
  const [charmCategories, setCharmCategories] = useState<CharmCategory[]>([]);
  const [isLoadingCharms, setIsLoadingCharms] = useState(true);

  // State for pan and zoom
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // State for interaction tracking
  const isDragging = useRef(false);
  const isPanning = useRef(false);
  
  // Refs to store interaction starting points
  const dragStartPoint = useRef({ x: 0, y: 0 });
  const panStartPoint = useRef({ x: 0, y: 0 });
  const initialPinchDistance = useRef<number | null>(null);
  const scaleStartRef = useRef(1);

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
      console.log('[EFFECT] Fetching charms data...');
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
        console.log('[EFFECT] Fetched categories:', fetchedCategories.length);

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
        console.log('[EFFECT] Fetched charms:', fetchedCharms.length);

      } catch (error) {
        console.error("Error fetching charms data: ", error);
      } finally {
        setIsLoadingCharms(false);
        console.log('[EFFECT] Finished fetching charms data.');
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
    console.log(`[ACTION] addCharmToCanvas: Adding charm '${charm.name}'`);
    if (!canvasRef.current) {
        console.error('[ACTION] addCharmToCanvas: Canvas ref is not available.');
        return;
    }
    const canvasRect = canvasRef.current.getBoundingClientRect();

    const x_px = (canvasRect.width / 2) - pan.x;
    const y_px = (canvasRect.height / 2) - pan.y;
    
    const xPercent = (x_px / scale / canvasRect.width) * 100;
    const yPercent = (y_px / scale / canvasRect.height) * 100;
    console.log(`[ACTION] addCharmToCanvas: Calculated position - x: ${xPercent.toFixed(2)}%, y: ${yPercent.toFixed(2)}%`);


    const newCharm: PlacedCharm = {
      id: `${charm.id}-${Date.now()}`,
      charm,
      position: {
        x: xPercent,
        y: yPercent,
      },
      rotation: 0,
      animation: 'breathe 0.5s ease-out'
    };
    setPlacedCharms((prev) => [...prev, newCharm]);
    
    setTimeout(() => {
        setPlacedCharms(prev => prev.map(pc => pc.id === newCharm.id ? { ...pc, animation: undefined } : pc));
    }, 500);
  };
  
  const handleCharmInteractionStart = (
    e: React.MouseEvent<HTMLDivElement> | TouchEvent,
    charmId: string
  ) => {
    e.stopPropagation();
    isDragging.current = true;
    isPanning.current = false;
    setSelectedPlacedCharmId(charmId);
    
    if ('touches' in e) {
      console.log(`[TOUCH START] Charm: ${charmId} at (${e.touches[0].clientX}, ${e.touches[0].clientY})`);
      dragStartPoint.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      console.log(`[MOUSE DOWN] Charm: ${charmId} at (${e.clientX}, ${e.clientY})`);
      dragStartPoint.current = { x: e.clientX, y: e.clientY };
    }
  };

  const removeCharm = (id: string) => {
    console.log(`[ACTION] removeCharm: Removing charm ${id}`);
    setPlacedCharms(placedCharms.filter(c => c.id !== id));
  };
  
  const clearAllCharms = () => {
    console.log('[ACTION] clearAllCharms: Clearing all charms');
    setPlacedCharms([]);
  };

  const handlePlacedCharmRotation = (e: WheelEvent, charmId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rotationAmount = e.deltaY * 0.1;
    console.log(`[WHEEL] Rotating charm ${charmId} by ${rotationAmount}deg`);
    setPlacedCharms(prev =>
      prev.map(pc =>
        pc.id === charmId
          ? { ...pc, rotation: (pc.rotation + rotationAmount) % 360 }
          : pc
      )
    );
  };

  const handleCanvasWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    console.log(`[WHEEL] Zooming on canvas. Delta: ${e.deltaY}`);

    const zoomSensitivity = 0.001;
    const newScale = scale - e.deltaY * zoomSensitivity;
    const clampedScale = Math.min(Math.max(0.2, newScale), 5);
    console.log(`[WHEEL] New scale: ${clampedScale.toFixed(2)}`);

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;
    
    const newPanX = mouseX - (mouseX - pan.x) * (clampedScale / scale);
    const newPanY = mouseY - (mouseY - pan.y) * (clampedScale / scale);

    setScale(clampedScale);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleInteractionEnd = (e: MouseEvent | TouchEvent) => {
    if (isDragging.current || isPanning.current) {
        console.log(`[INTERACTION END] Type: ${e.type}. isDragging=${isDragging.current}, isPanning=${isPanning.current}`);
    }
    isDragging.current = false;
    isPanning.current = false;
    initialPinchDistance.current = null;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.charm-on-canvas')) {
      console.log('[MOUSE DOWN] Canvas -> Ignored (on charm)');
      return;
    }
    e.stopPropagation();
    console.log(`[MOUSE DOWN] Canvas -> Start Panning at (${e.clientX}, ${e.clientY})`);
    isPanning.current = true;
    isDragging.current = false;
    panStartPoint.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    setSelectedPlacedCharmId(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    
    if (isDragging.current && selectedPlacedCharmId) {
        const dxPercent = (e.movementX / canvasRef.current.clientWidth) * 100 / scale;
        const dyPercent = (e.movementY / canvasRef.current.clientHeight) * 100 / scale;
        console.log(`[MOUSE MOVE] Dragging charm. Movement: (${e.movementX}, ${e.movementY}), Delta: (${dxPercent.toFixed(2)}%, ${dyPercent.toFixed(2)}%)`);
        
        setPlacedCharms(prev =>
            prev.map(pc =>
                pc.id === selectedPlacedCharmId
                    ? { ...pc, position: { x: pc.position.x + dxPercent, y: pc.position.y + dyPercent } }
                    : pc
            )
        );
    } else if (isPanning.current) {
        const newX = e.clientX - panStartPoint.current.x;
        const newY = e.clientY - panStartPoint.current.y;
        console.log(`[MOUSE MOVE] Panning canvas. New Pan: (${newX.toFixed(2)}, ${newY.toFixed(2)})`);
        setPan({
            x: newX,
            y: newY,
        });
    }
  };
  
  const getDistance = (touches: TouchList) => {
    return Math.sqrt(
      Math.pow(touches[0].clientX - touches[1].clientX, 2) +
      Math.pow(touches[0].clientY - touches[1].clientY, 2)
    );
  };
  
  const handleCanvasTouchStart = (e: TouchEvent) => {
    e.stopPropagation();
    if ((e.target as HTMLElement).closest('.charm-on-canvas')) {
       console.log('[TOUCH START] Canvas -> Ignored (on charm)');
      return;
    }
    
    if (e.touches.length > 1) {
      e.preventDefault();
      const dist = getDistance(e.touches);
      console.log(`[TOUCH START] Canvas -> Start Pinch Zoom. Touch count: ${e.touches.length}, Distance: ${dist}`);
      initialPinchDistance.current = dist;
      scaleStartRef.current = scale;
      isPanning.current = false; 
      isDragging.current = false;
    } else if (e.touches.length === 1) {
        console.log(`[TOUCH START] Canvas -> Start Panning at (${e.touches[0].clientX}, ${e.touches[0].clientY})`);
        panStartPoint.current = { x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y };
        isPanning.current = true;
        isDragging.current = false;
        setSelectedPlacedCharmId(null);
    }
  };

  const handleCanvasTouchMove = (e: TouchEvent) => {
    if (!canvasRef.current) return;
    e.preventDefault(); 
    const canvasRect = canvasRef.current.getBoundingClientRect();

    if (isDragging.current && selectedPlacedCharmId && e.touches.length === 1) {
        const touch = e.touches[0];
        const dx = touch.clientX - dragStartPoint.current.x;
        const dy = touch.clientY - dragStartPoint.current.y;
        
        const dxPercent = (dx / canvasRect.width) * 100 / scale;
        const dyPercent = (dy / canvasRect.height) * 100 / scale;
        console.log(`[TOUCH MOVE] Dragging charm. Touch at (${touch.clientX}, ${touch.clientY}), Delta: (${dxPercent.toFixed(2)}%, ${dyPercent.toFixed(2)}%)`);

        setPlacedCharms(prev =>
            prev.map(pc =>
                pc.id === selectedPlacedCharmId
                    ? { ...pc, position: { x: pc.position.x + dxPercent, y: pc.position.y + dyPercent } }
                    : pc
            )
        );
        // CRUCIAL: Update start point for next move event
        dragStartPoint.current = { x: touch.clientX, y: touch.clientY };

    } else if (isPanning.current && e.touches.length === 1) {
        const touch = e.touches[0];
        const newX = touch.clientX - panStartPoint.current.x;
        const newY = touch.clientY - panStartPoint.current.y;
        console.log(`[TOUCH MOVE] Panning canvas. Touch at (${touch.clientX}, ${touch.clientY}), New Pan: (${newX.toFixed(2)}, ${newY.toFixed(2)})`);
        setPan({
            x: newX,
            y: newY,
        });
    } else if (e.touches.length > 1 && initialPinchDistance.current) { 
        const newDist = getDistance(e.touches);
        const scaleFactor = newDist / initialPinchDistance.current;
        const newScale = Math.min(Math.max(0.2, scaleStartRef.current * scaleFactor), 5);
        console.log(`[TOUCH MOVE] Pinch zooming. New distance: ${newDist.toFixed(2)}, New scale: ${newScale.toFixed(2)}`);

        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const midPoint = {
            x: (t1.clientX + t2.clientX) / 2 - canvasRect.left,
            y: (t1.clientY + t2.clientY) / 2 - canvasRect.top
        };

        const newPanX = midPoint.x - (midPoint.x - pan.x) * (newScale / scale);
        const newPanY = midPoint.y - (midPoint.y - pan.y) * (newScale / scale);

        setScale(newScale);
        setPan({ x: newPanX, y: newPanY });
    }
  };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        console.log("[EFFECT] Setting up event listeners");

        const handleWheel = (e: WheelEvent) => {
          e.preventDefault();
          handleCanvasWheel(e as unknown as WheelEvent<HTMLDivElement>);
        };
        const handleTouchStart = (e: TouchEvent) => handleCanvasTouchStart(e);
        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            handleCanvasTouchMove(e);
        };
        
        // Use manual event listeners with passive: false to allow preventDefault
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        
        // Use window for end events to catch them even if cursor leaves canvas
        window.addEventListener('mouseup', handleInteractionEnd, { passive: true });
        window.addEventListener('touchend', handleInteractionEnd, { passive: true });

        return () => {
             console.log("[EFFECT] Cleaning up event listeners");
            canvas.removeEventListener('wheel', handleWheel);
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('mouseup', handleInteractionEnd);
            window.removeEventListener('touchend', handleInteractionEnd);
        };
    }, [scale, pan, placedCharms]);


  const resetZoomAndPan = () => {
     console.log('[ACTION] resetZoomAndPan: Resetting zoom and pan');
    setScale(1);
    setPan({ x: 0, y: 0 });
  };
  
  const handleCharmListClick = (charmId: string) => {
    console.log(`[ACTION] handleCharmListClick: Highlighting charm from list: ${charmId}`);
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
  
  const PlacedCharmComponent = ({ placed }: { placed: PlacedCharm }) => {
    const isSelected = selectedPlacedCharmId === placed.id;
    const charmRef = useRef<HTMLDivElement>(null);

    const handleDelete = (e: React.MouseEvent | TouchEvent) => {
      console.log(`[ACTION] PlacedCharmComponent.handleDelete: Deleting charm ${placed.id}`);
      e.stopPropagation();
      e.preventDefault();
      removeCharm(placed.id);
    }

    const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        // This is now the primary touch handler for charms
        e.preventDefault(); // Prevent default touch actions like scrolling
        handleCharmInteractionStart(e, placed.id);
    };

    useEffect(() => {
        const charmElement = charmRef.current;
        if (!charmElement) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            handlePlacedCharmRotation(e as unknown as WheelEvent<HTMLDivElement>, placed.id);
        };
        
        charmElement.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            charmElement.removeEventListener('wheel', handleWheel);
        };
    }, [placed.id]);


    return (
      <div
        ref={charmRef}
        onMouseDown={(e) => handleCharmInteractionStart(e, placed.id)}
        onTouchStart={handleTouchStart}
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
            onTouchEnd={handleDelete}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <X size={14} />
        </button>
      </div>
    );
  };

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
      <main className="flex-grow p-4 md:p-8">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          {/* Charms Panel */}
          <Card className="lg:col-span-3 flex flex-col">
            <CardHeader>
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
              <ScrollArea className="h-[calc(100vh-320px)]">
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
                          <div className="grid grid-cols-3 gap-4 pt-2">
                            {charmsByCategory[category.id].map((charm) => (
                              <Dialog key={charm.id}>
                                <div
                                    onClick={()=>{ addCharmToCanvas(charm)}}
                                    className="relative group p-2 border rounded-md flex flex-col items-center justify-center bg-card hover:bg-muted transition-colors aspect-square cursor-pointer"
                                    title={charm.name}
                                  >
                                    <Image 
                                      src={charm.imageUrl} 
                                      alt={charm.name} 
                                      width={48} 
                                      height={48} 
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

          {/* Editor Canvas */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
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
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              className="relative w-full aspect-square bg-card rounded-lg border-2 border-dashed border-muted-foreground/30 overflow-hidden touch-none"
            >
              <div
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                      transformOrigin: '0 0',
                  }}
              >
                  <Image src={model.editorImageUrl} alt={model.name} fill style={{ objectFit: 'contain' }} className="pointer-events-none" data-ai-hint="jewelry model" />
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
                        <PlacedCharmComponent key={placed.id} placed={placed} />
                      ))}
                  </div>
              </div>
              <div className="absolute bottom-2 right-2 flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => setScale(s => s * 1.2)}><ZoomIn /></Button>
                  <Button variant="outline" size="icon" onClick={() => setScale(s => s / 1.2)}><ZoomOut/></Button>
                  <Button variant="outline" size="icon" onClick={resetZoomAndPan}><Move /></Button>
              </div>
            </div>
            <Card>
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
          <div className="lg:col-span-3">
            <SuggestionSidebar 
              jewelryType={jewelryType.id} 
              modelDescription={model.name || ''} 
              onAddCharm={addCharmToCanvas} 
              charms={charms}
              locale={locale}
            />
          </div>
        </div>
        </div>
      </main>
    </>
  );
}

    