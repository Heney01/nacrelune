
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

interface ModelsManagerProps {
    initialJewelryTypes: Omit<JewelryType, 'icon'>[];
}

export function ModelsManager({ initialJewelryTypes }: ModelsManagerProps) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedJewelryType, setSelectedJewelryType] = useState<Omit<JewelryType, 'models'|'icon'>>(initialJewelryTypes[0]);
    const [selectedModel, setSelectedModel] = useState<JewelryModel | null>(null);

    const handleAddModelClick = (jewelryType: Omit<JewelryType, 'models'|'icon'>) => {
        console.log(`--- TEST: Bouton 'Ajouter un modèle' cliqué pour ${jewelryType.name}`);
        setSelectedJewelryType(jewelryType);
        setSelectedModel(null);
        setIsFormOpen(true);
    };

    const handleEditModelClick = (jewelryType: Omit<JewelryType, 'models'|'icon'>, model: JewelryModel) => {
        console.log(`--- TEST: Bouton 'Modifier' cliqué pour le modèle ${model.name}`);
        setSelectedJewelryType(jewelryType);
        setSelectedModel(model);
        setIsFormOpen(true);
    };

    const handleDeleteModel = (model: JewelryModel) => {
        console.log(`--- TEST: Bouton 'Supprimer' cliqué pour le modèle ${model.name}`);
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
                                               <Image src={model.displayImageUrl} alt={model.name} width={64} height={64} className="rounded-md object-cover h-auto" />
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
                                                                onClick={() => handleDeleteModel(model)}
                                                            >
                                                                Supprimer
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
