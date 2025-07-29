
'use client';

import React, { useState, useReducer, useTransition } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import type { JewelryType, JewelryModel } from "@/lib/types";
import { ModelForm } from './model-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { deleteModel } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

interface ModelsManagerProps {
    initialJewelryTypes: Omit<JewelryType, 'icon'>[];
    locale: string;
}

type OptimisticUpdate = {
    type: 'DELETE';
    payload: {
        jewelryTypeId: string;
        modelId: string;
    }
} | {
    type: 'ADD';
    payload: {
        jewelryTypeId: string;
        model: JewelryModel;
    }
} | {
    type: 'UPDATE';
    payload: {
        jewelryTypeId: string;
        model: JewelryModel;
    }
}


function jewelryTypesReducer(state: Omit<JewelryType, 'icon'>[], action: OptimisticUpdate): Omit<JewelryType, 'icon'>[] {
    switch (action.type) {
        case 'DELETE':
            return state.map(jt => {
                if (jt.id === action.payload.jewelryTypeId) {
                    return {
                        ...jt,
                        models: jt.models.filter(m => m.id !== action.payload.modelId)
                    };
                }
                return jt;
            });
        case 'ADD':
            return state.map(jt => {
                if (jt.id === action.payload.jewelryTypeId) {
                    // Avoid adding duplicates during optimistic update
                    if (jt.models.some(m => m.id === action.payload.model.id)) {
                        return jt;
                    }
                    return {
                        ...jt,
                        models: [...jt.models, action.payload.model]
                    };
                }
                return jt;
            });
        case 'UPDATE':
             return state.map(jt => {
                if (jt.id === action.payload.jewelryTypeId) {
                    return {
                        ...jt,
                        models: jt.models.map(m => m.id === action.payload.model.id ? action.payload.model : m)
                    };
                }
                return jt;
            });
        default:
            return state;
    }
}


export function ModelsManager({ initialJewelryTypes, locale }: ModelsManagerProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [jewelryTypes, dispatch] = useReducer(jewelryTypesReducer, initialJewelryTypes);
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedJewelryType, setSelectedJewelryType] = useState<Omit<JewelryType, 'models'|'icon'>>(initialJewelryTypes[0]);
    const [selectedModel, setSelectedModel] = useState<JewelryModel | null>(null);

    const handleAddModelClick = (jewelryType: Omit<JewelryType, 'models'|'icon'>) => {
        setSelectedJewelryType(jewelryType);
        setSelectedModel(null);
        setIsFormOpen(true);
    };

    const handleEditModelClick = (jewelryType: Omit<JewelryType, 'models'|'icon'>, model: JewelryModel) => {
        setSelectedJewelryType(jewelryType);
        setSelectedModel(model);
        setIsFormOpen(true);
    };

    const handleSaveModel = (model: JewelryModel) => {
        const isEditing = jewelryTypes.some(jt => jt.id === selectedJewelryType.id && jt.models.some(m => m.id === model.id));
        
        startTransition(() => {
            dispatch({
                type: isEditing ? 'UPDATE' : 'ADD',
                payload: {
                    jewelryTypeId: selectedJewelryType.id,
                    model: model
                }
            });
        });
        toast({
            title: 'Succès',
            description: `Le modèle "${model.name}" a été ${isEditing ? 'mis à jour' : 'créé'}.`
        });
    }

    const handleDeleteAction = async (formData: FormData) => {
        const modelId = formData.get('modelId') as string;
        const jewelryTypeId = formData.get('jewelryTypeId') as string;
        
        startTransition(() => {
            dispatch({ type: 'DELETE', payload: { jewelryTypeId, modelId } });
        });

        const result = await deleteModel(formData);

        if (result?.success) {
            toast({ title: 'Succès', description: result.message });
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result?.message || 'Une erreur inconnue est survenue.' });
            // Here you could revert the state if needed, but revalidation should fix it.
        }
    };
    
    return (
        <div className="p-4 bg-card rounded-lg border">
            <Accordion type="multiple" defaultValue={initialJewelryTypes.map(jt => jt.id)} className="w-full">
                {jewelryTypes.map((jewelryType) => (
                    <AccordionItem value={jewelryType.id} key={jewelryType.id}>
                        <div className="flex justify-between items-center w-full py-4">
                            <AccordionTrigger className="text-xl font-headline flex-1 py-0">
                                {jewelryType.name}
                            </AccordionTrigger>
                            <Button
                                size="sm"
                                className="mr-4"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddModelClick(jewelryType);
                                }}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Ajouter un modèle
                            </Button>
                        </div>
                        <AccordionContent>
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead className="w-24">Image</TableHead>
                                       <TableHead>Nom</TableHead>
                                       <TableHead>Prix</TableHead>
                                       <TableHead className="text-right">Actions</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {jewelryType.models.map((model) => (
                                        <TableRow key={model.id} className={isPending ? 'opacity-50' : ''}>
                                            <TableCell>
                                                <Image src={model.displayImageUrl} alt={model.name} width={64} height={64} className="w-full h-auto object-cover rounded-md" />
                                            </TableCell>
                                            <TableCell className="font-medium">{model.name}</TableCell>
                                            <TableCell>{model.price}€</TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => handleEditModelClick(jewelryType, model)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                
                                                 <AlertDialog>
                                                     <AlertDialogTrigger asChild>
                                                         <Button 
                                                             variant="ghost" 
                                                             size="icon" 
                                                             className="text-destructive hover:text-destructive"
                                                         >
                                                             <Trash2 className="h-4 w-4" />
                                                         </Button>
                                                     </AlertDialogTrigger>
                                                     <AlertDialogContent>
                                                         <form action={handleDeleteAction}>
                                                            <input type="hidden" name="modelId" value={model.id} />
                                                            <input type="hidden" name="jewelryTypeId" value={jewelryType.id} />
                                                            <input type="hidden" name="displayImageUrl" value={model.displayImageUrl} />
                                                            <input type="hidden" name="editorImageUrl" value={model.editorImageUrl} />
                                                            <input type="hidden" name="locale" value={locale} />
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Cette action est irréversible. Le modèle "{model.name}" sera définitivement supprimé.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel type="button">Annuler</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    type="submit"
                                                                    className="bg-destructive hover:bg-destructive/90"
                                                                >
                                                                    Supprimer
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                         </form>
                                                     </AlertDialogContent>
                                                 </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                   ))}
                               </TableBody>
                           </Table>
                           {jewelryType.models.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">Aucun modèle pour cette catégorie.</p>
                           )}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
             {isFormOpen && (
                <ModelForm 
                    isOpen={isFormOpen} 
                    onOpenChange={setIsFormOpen} 
                    jewelryType={selectedJewelryType} 
                    model={selectedModel}
                    onSave={handleSaveModel}
                    locale={locale}
                />
            )}
        </div>
    );
}
