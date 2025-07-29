
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UploadCloud, AlertCircle } from 'lucide-react';
import type { Charm, CharmCategory } from '@/lib/types';
import { saveCharm } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface CharmFormProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    charm?: Charm | null;
    category: CharmCategory;
    allCategories: CharmCategory[];
    onSave: (charm: Charm & { categoryName?: string }) => void;
    locale: string;
}

const ImagePicker = ({ name, label, defaultUrl }: { name: string; label: string; defaultUrl?: string }) => {
    const [preview, setPreview] = useState<string | null>(defaultUrl || null);
    const [fileData, setFileData] = useState<string | null>(defaultUrl || null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                setPreview(dataUrl);
                setFileData(JSON.stringify({ dataUrl, name: file.name }));
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

const initialState = { success: false, message: '' };

export function CharmForm({ isOpen, onOpenChange, charm, category, allCategories, onSave, locale }: CharmFormProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [state, formAction] = useFormState(saveCharm, initialState);
    
    useEffect(() => { setIsMounted(true) }, []);

    useEffect(() => {
        if (state.success && state.charm) {
            onSave(state.charm);
            onOpenChange(false);
        }
    }, [state, onSave, onOpenChange]);

    if (!isMounted) return null;
    
    const key = charm ? charm.id : 'new-charm';
    const isEditing = !!charm;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl" key={key}>
                 <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>{charm ? "Modifier la breloque" : "Ajouter une breloque"}</DialogTitle>
                        <DialogDescription>
                            Remplissez les détails de la breloque pour la catégorie "{category.name}".
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
                        <input type="hidden" name="charmId" value={charm?.id || ''} />
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="originalImageUrl" value={charm?.imageUrl || ''} />

                        <div className="space-y-2">
                            <Label htmlFor="name">Nom de la breloque</Label>
                            <Input id="name" name="name" defaultValue={charm?.name || ''} required />
                        </div>
                        
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="categoryId">Catégorie</Label>
                                <Select name="categoryId" defaultValue={charm?.categoryId || category.id} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner une catégorie" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allCategories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="price">Prix (€)</Label>
                                <Input id="price" name="price" type="number" step="0.01" defaultValue={charm?.price || ''} required />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" name="description" defaultValue={charm?.description || ''} />
                        </div>

                        <ImagePicker name="image" label="Image de la breloque" defaultUrl={charm?.imageUrl} />
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
