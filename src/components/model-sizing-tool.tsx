
'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Ruler, AlertCircle, Move } from 'lucide-react';
import type { Charm, JewelryModel, JewelryType } from '@/lib/types';
import { saveModel } from '@/app/actions/admin.actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Slider } from './ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from '@/lib/utils';

interface ModelSizingToolProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    model: JewelryModel;
    allCharms: Charm[];
    onSave: (model: JewelryModel) => void;
    locale: string;
    jewelryType: Omit<JewelryType, 'models' | 'icon'>;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin mr-2" />}
            Enregistrer les dimensions
        </Button>
    )
}

const initialState = { success: false, message: '', model: undefined };

export function ModelSizingTool({ isOpen, onOpenChange, model, allCharms, onSave, locale, jewelryType }: ModelSizingToolProps) {
    const { toast } = useToast();
    const [state, formAction] = useFormState(saveModel, initialState);
    
    const [referenceCharm, setReferenceCharm] = useState<Charm | null>(null);
    const [modelWidth, setModelWidth] = useState<number>(model?.width || 100);
    const [aspectRatio, setAspectRatio] = useState(1);
    const [charmPosition, setCharmPosition] = useState({ x: 50, y: 50 }); // in pixels

    const viewerRef = useRef<HTMLDivElement>(null);
    const dragState = useRef({ isDragging: false, initialX: 0, initialY: 0, charmStartX: 0, charmStartY: 0 });

    const charmsWithDimensions = useMemo(() => {
        return allCharms.filter(c => c.width && c.height);
    }, [allCharms]);
    
    useEffect(() => {
        if (charmsWithDimensions.length > 0 && !referenceCharm) {
            setReferenceCharm(charmsWithDimensions[0]);
        }
    }, [charmsWithDimensions, referenceCharm]);

    useEffect(() => {
        const img = new window.Image();
        img.src = model.displayImageUrl;
        img.onload = () => {
            if (img.width > 0 && img.height > 0) {
              setAspectRatio(img.width / img.height);
            }
        };
        setModelWidth(model?.width || 100);
    }, [model]);

    const calculatedDimensions = useMemo(() => {
        const width = modelWidth;
        const height = width / aspectRatio;
        return {
            width: parseFloat(width.toFixed(2)),
            height: parseFloat(height.toFixed(2)),
        }
    }, [modelWidth, aspectRatio]);
    
    const displayScaling = useMemo(() => {
        if (!viewerRef.current) {
            return { scale: 1, modelWidth: 0, modelHeight: 0, refWidth: 0, refHeight: 0 };
        }

        const PIXELS_PER_MM = 3;
        const PADDING = 32;

        const viewerWidth = viewerRef.current.offsetWidth - PADDING;
        const viewerHeight = viewerRef.current.offsetHeight - PADDING;

        const requiredPixelWidth = calculatedDimensions.width * PIXELS_PER_MM;
        const requiredPixelHeight = calculatedDimensions.height * PIXELS_PER_MM;

        let scale = 1;
        if (requiredPixelWidth > viewerWidth && viewerWidth > 0) {
            scale = viewerWidth / requiredPixelWidth;
        }
        if (requiredPixelHeight > viewerHeight && viewerHeight > 0) {
            scale = Math.min(scale, viewerHeight / requiredPixelHeight);
        }
        
        const refWidth = referenceCharm ? referenceCharm.width! * PIXELS_PER_MM * scale : 0;
        const refHeight = referenceCharm ? referenceCharm.height! * PIXELS_PER_MM * scale : 0;

        return {
            scale,
            modelWidth: calculatedDimensions.width * PIXELS_PER_MM * scale,
            modelHeight: calculatedDimensions.height * PIXELS_PER_MM * scale,
            refWidth,
            refHeight,
        };
    }, [referenceCharm, calculatedDimensions, viewerRef]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragState.current = {
            isDragging: true,
            initialX: e.clientX,
            initialY: e.clientY,
            charmStartX: charmPosition.x,
            charmStartY: charmPosition.y,
        };
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragState.current.isDragging) return;
        const dx = e.clientX - dragState.current.initialX;
        const dy = e.clientY - dragState.current.initialY;
        setCharmPosition({
            x: dragState.current.charmStartX + dx,
            y: dragState.current.charmStartY + dy,
        });
    }, []);

    const handleMouseUp = useCallback(() => {
        dragState.current.isDragging = false;
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);


    useEffect(() => {
        if (state.success && state.model) {
            toast({ title: 'Succès', description: state.message });
            onSave(state.model);
            onOpenChange(false);
        } else if (state.message && !state.success) {
            toast({ variant: 'destructive', title: 'Erreur', description: state.message });
        }
    }, [state, onSave, onOpenChange, toast]);

    if (!model) return null;
        
    const handleReferenceChange = (charmId: string) => {
        const newRef = allCharms.find(c => c.id === charmId);
        if (newRef) {
            setReferenceCharm(newRef);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                 <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>Calibrer la taille de "{model.name}"</DialogTitle>
                        <DialogDescription>
                            Déplacez la breloque de référence sur le bijou pour comparer les tailles.
                        </DialogDescription>
                    </DialogHeader>

                    {state && !state.success && state.message && (
                        <Alert variant="destructive" className="my-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Erreur</AlertTitle>
                            <AlertDescription>{state.message}</AlertDescription>
                        </Alert>
                    )}

                    <div className="py-4 space-y-6">
                        <input type="hidden" name="modelId" value={model.id} />
                        <input type="hidden" name="jewelryTypeId" value={jewelryType.id} />
                        <input type="hidden" name="isDimensionUpdateOnly" value="true" />
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="width" value={calculatedDimensions.width} />
                        <input type="hidden" name="height" value={calculatedDimensions.height} />
                        
                        <div className="flex items-end gap-4">
                             <div className="space-y-2 flex-grow">
                                <Label htmlFor="reference-charm">Breloque de référence</Label>
                                <Select onValueChange={handleReferenceChange} value={referenceCharm?.id}>
                                    <SelectTrigger id="reference-charm">
                                        <SelectValue placeholder="Choisir une référence..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {charmsWithDimensions.map(refCharm => (
                                            <SelectItem key={refCharm.id} value={refCharm.id}>
                                                {refCharm.name} ({refCharm.width}mm x {refCharm.height}mm)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        {referenceCharm && (
                        <>
                           <div ref={viewerRef} className="relative h-64 bg-muted/50 rounded-lg p-4 border overflow-hidden flex justify-center items-center">
                                {/* Model */}
                                <div className="flex flex-col items-center gap-1">
                                    <Image
                                        src={model.displayImageUrl}
                                        alt={model.name}
                                        className="object-contain"
                                        style={{
                                            width: `${displayScaling.modelWidth}px`,
                                            height: `${displayScaling.modelHeight}px`,
                                        }}
                                        width={displayScaling.modelWidth || 1}
                                        height={displayScaling.modelHeight || 1}
                                    />
                                    <span className="text-xs font-mono text-muted-foreground">{calculatedDimensions.width.toFixed(1)}mm</span>
                                </div>
                                
                                 {/* Draggable Reference Charm */}
                                <div
                                    className="absolute cursor-move"
                                    style={{
                                        left: `${charmPosition.x}px`,
                                        top: `${charmPosition.y}px`,
                                    }}
                                    onMouseDown={handleMouseDown}
                                >
                                     <Image
                                        src={referenceCharm.imageUrl}
                                        alt={`Référence: ${referenceCharm.name}`}
                                        className="object-contain border-2 border-dashed border-primary"
                                        style={{
                                            width: `${displayScaling.refWidth}px`,
                                            height: 'auto',
                                        }}
                                        width={displayScaling.refWidth || 1}
                                        height={displayScaling.refHeight || 1}
                                    />
                                </div>
                                <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-background/80 px-2 py-1 rounded-md text-xs text-muted-foreground">
                                    <Move className="h-3 w-3" />
                                    <span>Déplacez la breloque</span>
                                </div>
                            </div>
                        
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="size-slider">Ajuster la largeur de "{model.name}"</Label>
                                    <Slider
                                        id="size-slider"
                                        min={10}
                                        max={300}
                                        step={1}
                                        value={[modelWidth]}
                                        onValueChange={(value) => setModelWidth(value[0])}
                                    />
                                </div>
                            </div>
                        </>
                        )}

                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                        <SubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
