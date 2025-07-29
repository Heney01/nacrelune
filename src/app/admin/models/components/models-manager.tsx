
'use client';

import { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import type { JewelryType, JewelryModel } from "@/lib/types";
import { ModelForm } from './model-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { deleteModel } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface ModelsManagerProps {
    initialJewelryTypes: Omit<JewelryType, 'icon'>[];
}

export function ModelsManager({ initialJewelryTypes }: ModelsManagerProps) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedJewelryType, setSelectedJewelryType] = useState<Omit<JewelryType, 'models'|'icon'>>(initialJewelryTypes[0]);
    const [selectedModel, setSelectedModel] = useState<JewelryModel | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const { toast } = useToast();
    const router = useRouter();

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

    const handleDeleteModel = async (jewelryType: Omit<JewelryType, 'models'|'icon'>, model: JewelryModel) => {
        console.log('=== handleDeleteModel START ===');
        console.log('handleDeleteModel called with:', { 
            jewelryTypeId: jewelryType.id, 
            modelId: model.id,
            modelName: model.name,
            displayImageUrl: model.displayImageUrl,
            editorImageUrl: model.editorImageUrl
        });
        
        if (isDeleting === model.id) return;
        setIsDeleting(model.id);
        
        try {
            console.log('Calling deleteModel action...');
            const resultString = await deleteModel(
                jewelryType.id, 
                model.id, 
                model.displayImageUrl || '', 
                model.editorImageUrl || ''
            );
            console.log('deleteModel result string:', resultString);

            if (typeof resultString === 'string') {
                 const result = JSON.parse(resultString);
                if (result.success) {
                    console.log('Delete successful, showing success toast');
                    toast({
                        title: 'Succès',
                        description: result.message,
                    });
                    router.refresh();
                } else {
                    console.error('Delete failed:', result);
                    toast({
                        variant: 'destructive',
                        title: 'Erreur',
                        description: result?.message || 'Une erreur inconnue est survenue.',
                    });
                }
            } else {
                 throw new Error("La réponse du serveur n'est pas valide.");
            }
        } catch (error) {
            console.error('Exception in handleDeleteModel:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: `Une erreur inattendue est survenue: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
            });
        } finally {
            setIsDeleting(null);
            console.log('=== handleDeleteModel END ===');
        }
    };

    return (
        <div className="p-4 bg-card rounded-lg border">
            <Accordion type="multiple" defaultValue={initialJewelryTypes.map(jt => jt.id)} className="w-full">
                {initialJewelryTypes.map((jewelryType) => (
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
                                       <TableRow key={model.id}>
                                           <TableCell>
                                               <Image src={model.displayImageUrl} alt={model.name} width={64} height={64} className="rounded-md object-cover bg-muted h-auto" />
                                           </TableCell>
                                           <TableCell className="font-medium">{model.name}</TableCell>
                                           <TableCell>{model.price}€</TableCell>
                                           <TableCell className="text-right">
                                               <Button 
                                                   variant="ghost" 
                                                   size="icon" 
                                                   onClick={() => handleEditModelClick(jewelryType, model)}
                                                   disabled={isDeleting === model.id}
                                               >
                                                   <Edit className="h-4 w-4" />
                                               </Button>
                                               
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="text-destructive hover:text-destructive"
                                                            disabled={isDeleting === model.id}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Cette action est irréversible. Le modèle "{model.name}" sera définitivement supprimé.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                className="bg-destructive hover:bg-destructive/90"
                                                                disabled={isDeleting === model.id}
                                                                onClick={() => handleDeleteModel(jewelryType, model)}
                                                            >
                                                                {isDeleting === model.id ? 'Suppression...' : 'Supprimer'}
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
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
                />
            )}
        </div>
    );
}
