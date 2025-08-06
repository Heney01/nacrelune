
'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Ruler, AlertCircle } from 'lucide-react';
import type { Charm } from '@/lib/types';
import { saveCharm } from '@/app/actions/admin.actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Slider } from './ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';

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

    // Constants
    const REFERENCE_IMAGE_WIDTH_PX = 100;

    const [charmSizePercentage, setCharmSizePercentage] = useState(50);
    const [aspectRatio, setAspectRatio] = useState(1);
    
    useEffect(() => {
        if (allCharms.length > 0) {
            const firstCharmWithDimensions = allCharms.find(c => c.width && c.height);
            setReferenceCharm(firstCharmWithDimensions || allCharms[0]);
        }
    }, [allCharms]);

    useEffect(() => {
        const img = new window.Image();
        img.src = charm.imageUrl;
        img.onload = () => {
            setAspectRatio(img.width / img.height);
        };

        if (charm.width && referenceCharm?.width) {
            const initialPercentage = (charm.width / referenceCharm.width) * 100;
            setCharmSizePercentage(initialPercentage);
        } else {
            setCharmSizePercentage(50); // Default if no dimensions are set
        }

    }, [charm, referenceCharm]);

    const calculatedDimensions = useMemo(() => {
        if (!referenceCharm?.width) {
            return { width: 0, height: 0 };
        }
        const charmWidthMm = referenceCharm.width * (charmSizePercentage / 100);
        const charmHeightMm = charmWidthMm / aspectRatio;
        return {
            width: parseFloat(charmWidthMm.toFixed(2)),
            height: parseFloat(charmHeightMm.toFixed(2)),
        }
    }, [charmSizePercentage, aspectRatio, referenceCharm]);

    useEffect(() => {
        if (state.success && state.charm) {
            toast({ title: 'Succès', description: state.message });
            onSave(state.charm);
            onOpenChange(false);
        } else if (state.message) {
            toast({ variant: 'destructive', title: 'Erreur', description: state.message });
        }
    }, [state, onSave, onOpenChange, toast]);

    if (!charm || !referenceCharm) return null;

    const referenceWidthPx = REFERENCE_IMAGE_WIDTH_PX;
    const referenceHeightPx = referenceCharm.height && referenceCharm.width 
        ? (referenceCharm.height / referenceCharm.width) * referenceWidthPx 
        : referenceWidthPx;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                 <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>Calibrer la taille de "{charm.name}"</DialogTitle>
                        <DialogDescription>
                            Ajustez la taille de la breloque par rapport à la breloque de référence "{referenceCharm.name}" ({referenceCharm.width || '?'}mm).
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

                        <div className="h-40 flex justify-center items-center gap-4 bg-muted/50 rounded-lg p-4 border border-dashed">
                             {/* Reference Object */}
                            <div 
                                style={{ 
                                    width: `${referenceWidthPx}px`,
                                    height: `${referenceHeightPx}px`
                                }} 
                                className="relative flex-shrink-0"
                                title={`Référence: ${referenceCharm.name}`}
                            >
                                 <Image
                                    src={referenceCharm.imageUrl}
                                    alt={`Référence: ${referenceCharm.name}`}
                                    fill
                                    className="object-contain"
                                    sizes={`${referenceWidthPx}px`}
                                />
                            </div>

                             {/* Charm to size */}
                            <div 
                                style={{ 
                                    width: `${REFERENCE_IMAGE_WIDTH_PX * (charmSizePercentage / 100)}px`,
                                    height: `${(REFERENCE_IMAGE_WIDTH_PX * (charmSizePercentage / 100)) / aspectRatio}px`,
                                }}
                                className="relative transition-all"
                            >
                                <Image
                                    src={charm.imageUrl}
                                    alt={charm.name}
                                    fill
                                    className="object-contain"
                                    sizes={`${REFERENCE_IMAGE_WIDTH_PX * (charmSizePercentage / 100)}px`}
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="size-slider" className="text-sm font-medium">Ajuster la taille</label>
                                <Slider
                                    id="size-slider"
                                    min={10}
                                    max={200}
                                    step={1}
                                    value={[charmSizePercentage]}
                                    onValueChange={(value) => setCharmSizePercentage(value[0])}
                                />
                            </div>
                            <div className="flex justify-between items-center text-sm p-3 bg-muted rounded-lg">
                                <div className="font-medium">Dimensions calculées :</div>
                                <div>
                                    <span className="font-mono">{calculatedDimensions.width}mm</span> (L) x <span className="font-mono">{calculatedDimensions.height}mm</span> (H)
                                </div>
                            </div>
                        </div>

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
