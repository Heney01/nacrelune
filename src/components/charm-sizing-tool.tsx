
'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Ruler, AlertCircle, Layers, ArrowLeftRight, ArrowUpDown } from 'lucide-react';
import type { Charm } from '@/lib/types';
import { saveCharm } from '@/app/actions/admin.actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Slider } from './ui/slider';
import { useToast } from '@/hooks/use-toast';
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

        const PIXELS_PER_MM = 5;
        const PADDING = 32;

        const viewerWidth = viewerRef.current.offsetWidth - PADDING;
        const viewerHeight = viewerRef.current.offsetHeight - PADDING;

        const totalMMWidth = referenceCharm.width! + calculatedDimensions.width;
        const totalMMHeight = Math.max(referenceCharm.height!, calculatedDimensions.height);

        const requiredPixelWidth = totalMMWidth * PIXELS_PER_MM + 40;
        const requiredPixelHeight = totalMMHeight * PIXELS_PER_MM;

        let scale = 1;
        if (requiredPixelWidth > viewerWidth) {
            scale = viewerWidth / requiredPixelWidth;
        }
        if (requiredPixelHeight > viewerHeight) {
            scale = Math.min(scale, viewerHeight / requiredPixelHeight);
        }

        return {
            refWidth: referenceCharm.width! * PIXELS_PER_MM * scale,
            refHeight: referenceCharm.height! * PIXELS_PER_MM * scale,
            currentWidth: calculatedDimensions.width * PIXELS_PER_MM * scale,
            currentHeight: calculatedDimensions.height * PIXELS_PER_MM * scale,
        };
    }, [referenceCharm, calculatedDimensions, viewerRef]);


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

    const Dimension = ({ size, direction = 'horizontal' }: { size: number; direction?: 'horizontal' | 'vertical' }) => (
        <div className={cn("flex items-center gap-1 text-muted-foreground", direction === 'vertical' && "flex-col")}>
            <span className="text-xs font-mono">{size.toFixed(1)}mm</span>
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
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
                                                {refCharm.name} ({refCharm.width}mm x {refCharm.height}mm)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        
                        {referenceCharm && (
                        <>
                           <div ref={viewerRef} className="relative h-48 bg-muted/50 rounded-lg p-4 border border-dashed overflow-hidden flex justify-center items-center gap-8">
                                <div className="flex items-center gap-2">
                                     <Dimension size={referenceCharm.height!} direction="vertical"/>
                                    <div className="flex flex-col items-center justify-center gap-1 text-center flex-shrink-0" style={{width: `${displayScaling.refWidth}px`, height: `${displayScaling.refHeight}px`}}>
                                        <div className="relative w-full h-full border border-dashed border-red-500">
                                            <Image
                                                src={referenceCharm.imageUrl}
                                                alt={`Référence: ${referenceCharm.name}`}
                                                fill
                                                className="object-contain"
                                                sizes={`${displayScaling.refWidth}px`}
                                            />
                                        </div>
                                        <Dimension size={referenceCharm.width!} />
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                     <div className="flex flex-col items-center justify-center gap-1 text-center flex-shrink-0" style={{width: `${displayScaling.currentWidth}px`, height: `${displayScaling.currentHeight}px`}}>
                                         <div className="relative w-full h-full border border-dashed border-red-500">
                                            <Image
                                                src={charm.imageUrl}
                                                alt={charm.name}
                                                fill
                                                className="object-contain"
                                                sizes={`${displayScaling.currentWidth}px`}
                                            />
                                         </div>
                                        <Dimension size={calculatedDimensions.width} />
                                    </div>
                                     <Dimension size={calculatedDimensions.height} direction="vertical"/>
                                </div>
                            </div>
                        
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="size-slider">Ajuster la largeur de "{charm.name}"</Label>
                                    <Slider
                                        id="size-slider"
                                        min={1}
                                        max={30}
                                        step={0.1}
                                        value={[charmWidth]}
                                        onValueChange={(value) => setCharmWidth(value[0])}
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
