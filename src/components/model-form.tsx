
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UploadCloud, AlertCircle } from 'lucide-react';
import type { JewelryModel, JewelryType } from '@/lib/types';
import { saveModel } from '@/app/actions/admin.actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface ModelFormProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    jewelryType: Omit<JewelryType, 'models' | 'icon'>;
    model?: JewelryModel | null;
    onSave: (model: JewelryModel) => void;
    locale: string;
}

const ImagePicker = ({ name, label, defaultUrl }: { name: string; label: string; defaultUrl?: string }) => {
    const [preview, setPreview] = useState<string | null>(defaultUrl || null);
    
    // We store the original URL to compare if the image has changed.
    const [fileData, setFileData] = useState<string | null>(defaultUrl || null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                setPreview(dataUrl);
                // Store the new image as a JSON object to distinguish it from a simple URL string
                setFileData(JSON.stringify({
                    dataUrl: dataUrl,
                    name: file.name
                }));
            };
            reader.readAsDataURL(file);
        }
    };
    
    return (
        <div className="space-y-2">
            <Label htmlFor={name}>{label}</Label>
            <div className="flex items-center gap-4">
                <div className="w-24 h-24 border rounded-md flex items-center justify-center bg-muted overflow-hidden">
                    {preview ? (
                        <Image src={preview} alt="Aperçu" width={96} height={96} className="object-contain" />
                    ) : (
                        <UploadCloud className="text-muted-foreground" />
                    )}
                </div>
                <Input id={name} type="file" onChange={handleFileChange} className="max-w-xs" accept="image/png, image/jpeg, image/webp" />
                 <input type="hidden" name={name} value={fileData || ''} />
            </div>
        </div>
    );
};

function SubmitButton({ isEditing }: { isEditing: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin mr-2" />}
            {isEditing ? 'Mettre à jour' : 'Enregistrer'}
        </Button>
    )
}

const initialState = { success: false, message: '', model: undefined };

export function ModelForm({ isOpen, onOpenChange, jewelryType, model, onSave, locale }: ModelFormProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [state, formAction] = useFormState(saveModel, initialState);

    useEffect(() => {
        setIsMounted(true);
    }, []);
    
    useEffect(() => {
        if (state.success && 'model' in state && state.model) {
            onSave(state.model); // Trigger optimistic update
            onOpenChange(false);
        }
    }, [state, onSave, onOpenChange]);

    if (!isMounted) return null;
    
    const key = model ? model.id : 'new';
    const isEditing = !!model;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md" key={key}>
                 <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>{model ? "Modifier le modèle" : "Ajouter un nouveau modèle"}</DialogTitle>
                        <DialogDescription>
                            Remplissez les détails du modèle de {jewelryType.name.toLowerCase()}.
                        </DialogDescription>
                    </DialogHeader>

                    {state && !state.success && state.message && (
                        <Alert variant="destructive" className="my-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Erreur</AlertTitle>
                            <AlertDescription>{state.message}</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid gap-4 py-4">
                        <input type="hidden" name="modelId" value={model?.id || ''} />
                        <input type="hidden" name="jewelryTypeId" value={jewelryType.id} />
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="originalDisplayImageUrl" value={model?.displayImageUrl || ''} />
                        <input type="hidden" name="originalEditorImageUrl" value={model?.editorImageUrl || ''} />

                        <div className="space-y-2">
                            <Label htmlFor="name">Nom du modèle</Label>
                            <Input id="name" name="name" defaultValue={model?.name || ''} required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="price">Prix (€)</Label>
                                <Input id="price" name="price" type="number" step="0.01" defaultValue={model?.price || ''} required />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="quantity">Quantité en stock</Label>
                                <Input id="quantity" name="quantity" type="number" defaultValue={model?.quantity || 0} required />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="width">Largeur (mm)</Label>
                                <Input id="width" name="width" type="number" step="0.1" defaultValue={model?.width || ''} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="height">Hauteur (mm)</Label>
                                <Input id="height" name="height" type="number" step="0.1" defaultValue={model?.height || ''} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reorderUrl">URL de commande</Label>
                            <Input id="reorderUrl" name="reorderUrl" defaultValue={model?.reorderUrl || ''} />
                        </div>


                        <ImagePicker name="displayImage" label="Image de présentation" defaultUrl={model?.displayImageUrl} />
                        <ImagePicker name="editorImage" label="Image pour l'éditeur" defaultUrl={model?.editorImageUrl} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                        <SubmitButton isEditing={isEditing} />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

    