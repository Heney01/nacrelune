
"use client";

import React, { useState, useMemo, useRef, DragEvent, WheelEvent, useEffect } from 'react';
import Image from 'next/image';
import { JewelryModel, PlacedCharm, Charm, JewelryType, CharmCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { SuggestionSidebar } from './suggestion-sidebar';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { ShoppingCart, Trash2, X, Search, ArrowLeft, Loader2, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NacreluneLogo } from './icons';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, DocumentReference } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

interface EditorProps {
  model: JewelryModel;
  jewelryType: JewelryType;
  onBack: () => void;
}

export default function Editor({ model, jewelryType, onBack }: EditorProps) {
  const [placedCharms, setPlacedCharms] = useState<PlacedCharm[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedItem, setDraggedItem] = useState<{type: 'new-charm' | 'placed-charm', id: string, offsetX: number, offsetY: number} | null>(null);
  const [selectedCharmId, setSelectedCharmId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [charms, setCharms] = useState<Charm[]>([]);
  const [charmCategories, setCharmCategories] = useState<CharmCategory[]>([]);
  const [isLoadingCharms, setIsLoadingCharms] = useState(true);

  // State for pan and zoom
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPoint, setStartPanPoint] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });


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
        // Fetch charm categories
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

        // Fetch charms
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
          } as Charm;
        }));
        setCharms(fetchedCharms);

      } catch (error) {
        console.error("Error fetching charms data: ", error);
        // Handle error state in UI if necessary
      } finally {
        setIsLoadingCharms(false);
      }
    };

    fetchCharmsData();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        setCanvasSize({
          width: canvasRef.current.clientWidth,
          height: canvasRef.current.clientHeight,
        });
      }
    };
    
    handleResize(); // Initial size
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
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
    const { width: canvasWidth, height: canvasHeight } = canvasSize;
    if(canvasWidth === 0 || canvasHeight === 0) return;

    // Calculate position in pixels first
    const pixelX = (canvasWidth / 2 - pan.x) / scale - 20;
    const pixelY = (canvasHeight / 2 - pan.y) / scale - 20;

    const newCharm: PlacedCharm = {
      id: `${charm.id}-${Date.now()}`,
      charm,
       position: {
        x: pixelX / canvasWidth,
        y: pixelY / canvasHeight,
      },
      rotation: 0,
    };
    setPlacedCharms((prev) => [...prev, newCharm]);
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, charm: Charm) => {
    const targetRect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - targetRect.left;
    const offsetY = e.clientY - targetRect.top;
    setDraggedItem({ type: 'new-charm', id: charm.id, offsetX: offsetX, offsetY: offsetY });
    setSelectedCharmId(null);
  
    const dragImage = e.currentTarget.querySelector('img')?.cloneNode(true) as HTMLElement;
    if (dragImage) {
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-9999px';
        dragImage.style.left = '-9999px';
        dragImage.style.transform = `rotate(0deg)`; // Reset rotation for the drag image if needed
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, offsetX, offsetY);
        setTimeout(() => {
             if(document.body.contains(dragImage)) {
                document.body.removeChild(dragImage);
            }
        }, 0);
    }
  };

  const handlePlacedCharmDragStart = (e: DragEvent<HTMLDivElement>, placedCharm: PlacedCharm) => {
    const targetRect = e.currentTarget.getBoundingClientRect();
    const offsetX = (e.clientX - targetRect.left) / scale;
    const offsetY = (e.clientY - targetRect.top) / scale;
    
    setDraggedItem({ type: 'placed-charm', id: placedCharm.id, offsetX, offsetY });
    setSelectedCharmId(null);
  
    const dragImage = e.currentTarget.querySelector('img')?.cloneNode(true) as HTMLElement;
      if(dragImage) {
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-9999px';
        dragImage.style.left = '-9999px';
        dragImage.style.transform = `rotate(${placedCharm.rotation}deg)`;
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, e.clientX - targetRect.left, e.clientY - targetRect.top);
        
        setTimeout(() => {
            if(document.body.contains(dragImage)) {
                document.body.removeChild(dragImage);
            }
        }, 0);
    }
  };
  
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedItem || !canvasRef.current) return;
    
    const { width: canvasWidth, height: canvasHeight } = canvasSize;
    if(canvasWidth === 0 || canvasHeight === 0) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const pixelX = (e.clientX - canvasRect.left - pan.x) / scale;
    const pixelY = (e.clientY - canvasRect.top - pan.y) / scale;

    if (draggedItem.type === 'new-charm') {
      const charm = charms.find((c) => c.id === draggedItem.id);
      if (!charm) return;
      const newCharm: PlacedCharm = {
        id: `${charm.id}-${Date.now()}`,
        charm,
        position: { 
            x: (pixelX - draggedItem.offsetX / scale) / canvasWidth, 
            y: (pixelY - draggedItem.offsetY / scale) / canvasHeight
        },
        rotation: 0,
      };
      setPlacedCharms((prev) => [...prev, newCharm]);
    } else if (draggedItem.type === 'placed-charm') {
      setPlacedCharms(prev => 
        prev.map(pc => 
          pc.id === draggedItem.id 
            ? { ...pc, position: { 
                x: (pixelX - draggedItem.offsetX) / canvasWidth, 
                y: (pixelY - draggedItem.offsetY) / canvasHeight 
              } 
            }
            : pc
        )
      );
    }
    setDraggedItem(null);
  };
  
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  
  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    setDraggedItem(null);
  };

  const removeCharm = (id: string) => {
    setPlacedCharms(placedCharms.filter(c => c.id !== id));
  };
  
  const clearAllCharms = () => {
    setPlacedCharms([]);
  };

  const handlePlacedCharmRotation = (e: WheelEvent<HTMLDivElement>, charmId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setPlacedCharms(prev =>
      prev.map(pc =>
        pc.id === charmId
          ? { ...pc, rotation: (pc.rotation + e.deltaY * 0.1) % 360 }
          : pc
      )
    );
  };

  const handleCanvasWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const zoomSensitivity = 0.001;
    const newScale = scale - e.deltaY * zoomSensitivity;
    const clampedScale = Math.min(Math.max(0.2, newScale), 5); // Clamp scale between 0.2x and 5x

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;
    
    // Adjust pan to keep the point under the mouse stationary
    const newPanX = mouseX - (mouseX - pan.x) * (clampedScale / scale);
    const newPanY = mouseY - (mouseY - pan.y) * (clampedScale / scale);

    setScale(clampedScale);
    setPan({ x: newPanX, y: newPanY });
};

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.charm-on-canvas')) {
      return; // Don't pan if clicking on a charm
    }
    setIsPanning(true);
    setStartPanPoint({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - startPanPoint.x,
      y: e.clientY - startPanPoint.y,
    });
  };
  
  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };

  const handleCanvasMouseLeave = () => {
    setIsPanning(false);
  };

  const resetZoomAndPan = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
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
                                  className="relative group p-2 border rounded-md flex flex-col items-center justify-center bg-card hover:bg-muted transition-colors aspect-square"
                                  title={charm.name}
                                >
                                  <div 
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, charm)}
                                    onDragEnd={(e) => handleDragEnd(e)}
                                    onClick={() => addCharmToCanvas(charm)}
                                    className="w-full h-full flex flex-col items-center justify-center cursor-pointer active:cursor-grabbing"
                                  >
                                    <Image src={charm.imageUrl} alt={charm.name} width={48} height={48} data-ai-hint="jewelry charm" />
                                    <p className="text-xs text-center mt-1 truncate">{charm.name}</p>
                                  </div>
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
                                      <Button onClick={() => addCharmToCanvas(charm)}>Add to Design</Button>
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
            onWheel={handleCanvasWheel}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseLeave}
            className={cn(
                "relative w-full aspect-square bg-card rounded-lg border-2 border-dashed border-muted-foreground/30 overflow-hidden shadow-inner",
                isPanning ? "cursor-grabbing" : "cursor-grab"
            )}
          >
            <div
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                    transformOrigin: '0 0',
                }}
            >
                <Image src={model.editorImageUrl} alt={model.name} layout="fill" objectFit="contain" className="pointer-events-none" data-ai-hint="jewelry model" />
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
                    <div
                        key={placed.id}
                        draggable
                        onDragStart={(e) => handlePlacedCharmDragStart(e, placed)}
                        onDragEnd={(e) => handleDragEnd(e)}
                        onWheel={(e) => handlePlacedCharmRotation(e, placed.id)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={cn(
                        "absolute group charm-on-canvas",
                        selectedCharmId === placed.id ? "cursor-grabbing z-10" : "cursor-grab"
                        )}
                        style={{
                        left: `${placed.position.x * canvasSize.width}px`,
                        top: `${placed.position.y * canvasSize.height}px`,
                        transform: `rotate(${placed.rotation}deg)`,
                        opacity: (draggedItem && draggedItem.type === 'placed-charm' && draggedItem.id === placed.id) ? '0' : '1',
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
            </div>
             <div className="absolute bottom-2 right-2 flex gap-2">
                <Button variant="outline" size="icon" onClick={() => setScale(s => s * 1.2)}><ZoomIn /></Button>
                <Button variant="outline" size="icon" onClick={() => setScale(s => s / 1.2)}><ZoomOut/></Button>
                <Button variant="outline" size="icon" onClick={resetZoomAndPan}><Move /></Button>
            </div>
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
                                       onMouseDown={(e) => e.stopPropagation()}
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
          />
        </div>
      </div>
      </div>
    </main>
    </>
  );
}

