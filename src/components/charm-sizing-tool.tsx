
'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Ruler, AlertCircle, Layers } from 'lucide-react';
import type { Charm } from '@/lib/types';
import { saveCharm } from '@/app/actions/admin.actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Slider } from './ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from '@/lib/utils';
import { Switch } from './ui/switch';

interface CharmSizingToolProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    charm: Charm;
    allCharms: Charm[];
    onSave: (charm: Charm & { categoryName?: string }) => void;
    locale: string;
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

const initialState = { success: false, message: '', charm: undefined };

export function CharmSizingTool({ isOpen, onOpenChange, charm, allCharms, onSave, locale }: CharmSizingToolProps) {
    const { toast } = useToast();
    const [state, formAction] = useFormState(saveCharm, initialState);
    
    const [referenceCharm, setReferenceCharm] = useState<Charm | null>(null);
    const [isOverlayed, setIsOverlayed] = useState(false);

    const [charmWidth, setCharmWidth] = useState<number>(charm?.width || 15);
    const [aspectRatio, setAspectRatio] = useState(1);

    const viewerRef = useRef<HTMLDivElement>(null);

    const charmsWithDimensions = useMemo(() => {
        return allCharms.filter(c => c.width && c.height && c.id !== charm.id);
    }, [allCharms, charm.id]);
    
    useEffect(() => {
        if (charmsWithDimensions.length > 0 && !referenceCharm) {
            setReferenceCharm(charmsWithDimensions[0]);
        }
    }, [charmsWithDimensions, referenceCharm]);

    useEffect(() => {
        const img = new window.Image();
        img.src = charm.imageUrl;
        img.onload = () => {
            if (img.width > 0 && img.height > 0) {
              setAspectRatio(img.width / img.height);
            }
        };

        setCharmWidth(charm?.width || 15); // Reset width when charm changes
    }, [charm]);

    const calculatedDimensions = useMemo(() => {
        const width = charmWidth;
        const height = width / aspectRatio;
        return {
            width: parseFloat(width.toFixed(2)),
            height: parseFloat(height.toFixed(2)),
        }
    }, [charmWidth, aspectRatio]);
    
    const displayScaling = useMemo(() => {
        if (!referenceCharm || !viewerRef.current) {
            return { scale: 1, refWidth: 0, refHeight: 0, currentWidth: 0, currentHeight: 0 };
        }
        
        const PIXELS_PER_MM_BASE = 5;
        const PADDING = 32; // 2rem total padding
        
        const viewerWidth = viewerRef.current.offsetWidth - PADDING;
        const viewerHeight = viewerRef.current.offsetHeight - PADDING;
        
        const requiredWidth = isOverlayed 
            ? Math.max(referenceCharm.width!, calculatedDimensions.width) * PIXELS_PER_MM_BASE
            : (referenceCharm.width! + calculatedDimensions.width) * PIXELS_PER_MM_BASE;
            
        const requiredHeight = Math.max(referenceCharm.height!, calculatedDimensions.height) * PIXELS_PER_MM_BASE;

        let scale = 1;
        if (requiredWidth > viewerWidth) {
            scale = Math.min(scale, viewerWidth / requiredWidth);
        }
        if (requiredHeight > viewerHeight) {
            scale = Math.min(scale, viewerHeight / requiredHeight);
        }

        return {
            scale: scale,
            refWidth: referenceCharm.width! * PIXELS_PER_MM_BASE * scale,
            refHeight: referenceCharm.height! * PIXELS_PER_MM_BASE * scale,
            currentWidth: calculatedDimensions.width * PIXELS_PER_MM_BASE * scale,
            currentHeight: calculatedDimensions.height * PIXELS_PER_MM_BASE * scale,
        };

    }, [referenceCharm, calculatedDimensions, isOverlayed, viewerRef.current]);

    useEffect(() => {
        if (state.success && state.charm) {
            toast({ title: 'Succès', description: state.message });
            onSave(state.charm);
            onOpenChange(false);
        } else if (state.message && !state.success) {
            toast({ variant: 'destructive', title: 'Erreur', description: state.message });
        }
    }, [state, onSave, onOpenChange, toast]);

    if (!charm) return null;
        
    const handleReferenceChange = (charmId: string) => {
        const newRef = allCharms.find(c => c.id === charmId);
        if (newRef) {
            setReferenceCharm(newRef);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                 <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>Calibrer la taille de "{charm.name}"</DialogTitle>
                        <DialogDescription>
                            Ajustez la taille de la breloque par rapport à une breloque de référence.
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
                        <input type="hidden" name="charmId" value={charm.id} />
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
                                                {refCharm.name} ({refCharm.width}mm)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch id="overlay-switch" checked={isOverlayed} onCheckedChange={setIsOverlayed} />
                                <Label htmlFor="overlay-switch" className="flex items-center gap-1.5"><Layers className="h-4 w-4"/> Superposer</Label>
                            </div>
                        </div>
                        
                        {referenceCharm && (
                        <>
                           <div 
                                ref={viewerRef} 
                                className={cn(
                                    "relative h-40 bg-muted/50 rounded-lg p-4 border border-dashed overflow-hidden transition-all",
                                    isOverlayed ? "grid place-items-center" : "flex justify-center items-center gap-8"
                                )}
                            >
                                <div className="flex flex-col items-center justify-center gap-1 text-center flex-shrink-0 transition-all" style={{width: `${displayScaling.refWidth}px`, height: `${displayScaling.refHeight}px`}}>
                                    <div className="relative w-full h-full">
                                        <Image
                                            src={referenceCharm.imageUrl}
                                            alt={`Référence: ${referenceCharm.name}`}
                                            fill
                                            className="object-contain"
                                            sizes={`${displayScaling.refWidth}px`}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{referenceCharm.width}mm x {referenceCharm.height}mm</p>
                                </div>
                                
                                <div 
                                    className={cn(
                                        "flex flex-col items-center justify-center gap-1 text-center flex-shrink-0 transition-all",
                                        isOverlayed && "absolute inset-0 grid place-items-center opacity-75"
                                    )}
                                    style={{width: `${displayScaling.currentWidth}px`, height: `${displayScaling.currentHeight}px`}}
                                >
                                     <div className="relative w-full h-full">
                                        <Image
                                            src={charm.imageUrl}
                                            alt={charm.name}
                                            fill
                                            className="object-contain"
                                            sizes={`${displayScaling.currentWidth}px`}
                                        />
                                     </div>
                                    <p className="text-xs text-muted-foreground mt-1">{calculatedDimensions.width}mm x {calculatedDimensions.height}mm</p>
                                </div>
                            </div>
                        
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="size-slider">Largeur de la breloque (mm)</Label>
                                    <Slider
                                        id="size-slider"
                                        min={1}
                                        max={30}
                                        step={0.1}
                                        value={[charmWidth]}
                                        onValueChange={(value) => setCharmWidth(value[0])}
                                    />
                                </div>
                                <div className="flex justify-between items-center text-sm p-3 bg-muted rounded-lg">
                                    <div className="font-medium">Dimensions calculées :</div>
                                    <div>
                                        <span className="font-mono">{calculatedDimensions.width}mm</span> (L) x <span className="font-mono">{calculatedDimensions.height}mm</span> (H)
                                    </div>
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
