

'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UploadCloud } from 'lucide-react';
import type { JewelryModel, JewelryType } from '@/lib/types';

interface ModelFormProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    jewelryType: Omit<JewelryType, 'models' | 'icon'>;
    model?: JewelryModel | null;
    onSave: (modelData: any) => void;
}

const ImagePicker = ({ name, label, defaultUrl }: { name: string; label: string; defaultUrl?: string }) => {
    const [preview, setPreview] = useState<string | null>(defaultUrl || null);
    const [fileData, setFileData] = useState<{dataUrl: string, name: string} | string | null>(defaultUrl || null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                setPreview(dataUrl);
                setFileData({
                    dataUrl: dataUrl,
                    name: file.name
                });
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
                        <Image src={preview} alt="Aperçu" width={96} height={96} className="object-cover" />
                    ) : (
                        <UploadCloud className="text-muted-foreground" />
                    )}
                </div>
                <Input id={name} type="file" onChange={handleFileChange} className="max-w-xs" accept="image/png, image/jpeg, image/webp" />
                 <input type="hidden" name={name} value={JSON.stringify(fileData)} />
            </div>
        </div>
    );
};

export function ModelForm({ isOpen, onOpenChange, jewelryType, model, onSave }: ModelFormProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleSave = () => {
        console.log(`--- TEST: Bouton 'Enregistrer' cliqué pour le modèle ${model ? model.name : 'nouveau'}`);
        // This is a placeholder for demonstration.
        // In a real scenario, you'd gather form data here.
        onSave({ 
            id: model?.id, 
            name: 'Test Model', // Replace with actual form data
        });
        onOpenChange(false);
    }
    
    if (!isMounted) return null;
    
    const key = model ? model.id : 'new';

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]" key={key}>
                <DialogHeader>
                    <DialogTitle>{model ? "Modifier le modèle" : "Ajouter un nouveau modèle"}</DialogTitle>
                    <DialogDescription>
                        Remplissez les détails du modèle de {jewelryType.name.toLowerCase()}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nom du modèle</Label>
                        <Input id="name" name="name" defaultValue={model?.name || ''} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="price">Prix</Label>
                        <Input id="price" name="price" type="number" step="0.01" defaultValue={model?.price || ''}/>
                    </div>

                    <ImagePicker name="displayImage" label="Image de présentation" defaultUrl={model?.displayImageUrl} />
                    <ImagePicker name="editorImage" label="Image pour l'éditeur" defaultUrl={model?.editorImageUrl} />
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                    <Button onClick={handleSave}>Enregistrer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
