
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UploadCloud, AlertCircle } from 'lucide-react';
import type { CharmCategory } from '@/lib/types';
import { saveCharmCategory } from '@/app/actions/admin.actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Textarea } from './ui/textarea';

interface CharmCategoryFormProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    category?: CharmCategory | null;
    onSave: (category: CharmCategory) => void;
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

const initialState = { success: false, message: '', category: undefined };

export function CharmCategoryForm({ isOpen, onOpenChange, category, onSave, locale }: CharmCategoryFormProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [state, formAction] = useFormState(saveCharmCategory, initialState);

    useEffect(() => { setIsMounted(true); }, []);
    
    useEffect(() => {
        if (state.success && 'category' in state && state.category) {
            onSave(state.category);
            onOpenChange(false);
        }
    }, [state, onSave, onOpenChange]);

    if (!isMounted) return null;
    
    const key = category ? category.id : 'new-category';
    const isEditing = !!category;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]" key={key}>
                 <form action={formAction}>
                    <DialogHeader>
                        <DialogTitle>{category ? "Modifier la catégorie" : "Ajouter une catégorie"}</DialogTitle>
                        <DialogDescription>
                            Gérer les informations de la catégorie de breloques.
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
                        <input type="hidden" name="categoryId" value={category?.id || ''} />
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="originalImageUrl" value={category?.imageUrl || ''} />

                        <div className="space-y-2">
                            <Label htmlFor="name">Nom de la catégorie</Label>
                            <Input id="name" name="name" defaultValue={category?.name || ''} required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" name="description" defaultValue={category?.description || ''} />
                        </div>

                        <ImagePicker name="image" label="Image de la catégorie" defaultUrl={category?.imageUrl} />
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

    