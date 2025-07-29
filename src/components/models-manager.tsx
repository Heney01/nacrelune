
'use client';

import React, { useState, useReducer, useTransition, useMemo, FormEvent } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, ZoomIn, AlertTriangle, ShoppingCart, Info } from "lucide-react";
import type { JewelryType, JewelryModel, GeneralPreferences } from "@/lib/types";
import { ModelForm } from './model-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { 
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { deleteModel, markAsOrdered, markAsRestocked } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useTranslations } from '@/hooks/use-translations';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';

interface ModelsManagerProps {
    initialJewelryTypes: Omit<JewelryType, 'icon'>[];
    locale: string;
    preferences: GeneralPreferences;
}

type State = Omit<JewelryType, 'icon'>[];

type OptimisticUpdate = {
    type: 'DELETE';
    payload: { jewelryTypeId: string; modelId: string; }
} | {
    type: 'ADD' | 'UPDATE';
    payload: { jewelryTypeId: string; model: JewelryModel; }
} | {
    type: 'MARK_ORDERED',
    payload: { jewelryTypeId: string; modelId: string; }
} | {
    type: 'MARK_RESTOCKED',
    payload: { jewelryTypeId: string; modelId: string; newQuantity: number; }
}

const safeToLocaleDateString = (date: any) => {
    if (!date) return '';
    // Handle Firestore Timestamp
    if (typeof date === 'object' && date.seconds) {
        return new Date(date.seconds * 1000).toLocaleDateString();
    }
    // Handle JS Date or ISO string
    if (date instanceof Date || typeof date === 'string' || typeof date === 'number') {
        try {
            return new Date(date).toLocaleDateString();
        } catch (e) {
            return '';
        }
    }
    return '';
}

function jewelryTypesReducer(state: State, action: OptimisticUpdate): State {
    switch (action.type) {
        case 'DELETE':
            return state.map(jt => jt.id === action.payload.jewelryTypeId
                ? { ...jt, models: jt.models.filter(m => m.id !== action.payload.modelId) }
                : jt
            );
        case 'ADD':
            return state.map(jt => jt.id === action.payload.jewelryTypeId
                ? { ...jt, models: [...jt.models, action.payload.model] }
                : jt
            );
        case 'UPDATE':
             return state.map(jt => jt.id === action.payload.jewelryTypeId
                ? { ...jt, models: jt.models.map(m => m.id === action.payload.model.id ? action.payload.model : m) }
                : jt
            );
        case 'MARK_ORDERED':
            return state.map(jt => jt.id === action.payload.jewelryTypeId
                ? { ...jt, models: jt.models.map(m => m.id === action.payload.modelId ? { ...m, lastOrderedAt: new Date(), restockedAt: null } : m) }
                : jt
            );
         case 'MARK_RESTOCKED':
            return state.map(jt => jt.id === action.payload.jewelryTypeId
                ? { ...jt, models: jt.models.map(m => m.id === action.payload.modelId ? { ...m, lastOrderedAt: null, restockedAt: new Date(), quantity: action.payload.newQuantity } : m) }
                : jt
            );
        default:
            return state;
    }
}

function ReorderDialog({ model, jewelryTypeId, locale, onOrder, onRestock, t }: {
    model: JewelryModel,
    jewelryTypeId: string,
    locale: string,
    onOrder: (formData: FormData) => void,
    onRestock: (formData: FormData) => void,
    t: (key: string, values?: any) => string
}) {
    const [restockedQuantity, setRestockedQuantity] = useState(1);
    const [isOpen, setIsOpen] = useState(false);

    const handleOrderSubmit = (e: FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('itemId', model.id);
        formData.append('itemType', jewelryTypeId);
        formData.append('locale', locale);
        onOrder(formData);
        setIsOpen(false);
    }
    
    const handleRestockSubmit = (e: FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('itemId', model.id);
        formData.append('itemType', jewelryTypeId);
        formData.append('locale', locale);
        formData.append('restockedQuantity', String(restockedQuantity));
        onRestock(formData);
        setIsOpen(false);
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <ShoppingCart className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('reorder_dialog_title', {itemName: model.name})}</AlertDialogTitle>
                    <AlertDialogDescription>{t('reorder_dialog_description')}</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex flex-col gap-4 my-4">
                    <Button variant="outline" asChild disabled={!model.reorderUrl}>
                        <a href={model.reorderUrl || ''} target="_blank" rel="noopener noreferrer">{t('open_reorder_url')}</a>
                    </Button>
                    <form onSubmit={handleOrderSubmit}>
                        <Button type="submit" variant="secondary" className="w-full">{t('mark_as_ordered')}</Button>
                    </form>
                    
                    <div className="flex items-center gap-2">
                        <hr className="flex-grow" />
                        <span>{t('restock')}</span>
                        <hr className="flex-grow" />
                    </div>
                    
                    <form onSubmit={handleRestockSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="restock-quantity">{t('restocked_quantity')}</Label>
                            <Input 
                                id="restock-quantity"
                                type="number" 
                                value={restockedQuantity} 
                                onChange={(e) => setRestockedQuantity(parseInt(e.target.value, 10) || 1)}
                                min="1"
                            />
                        </div>
                        <Button type="submit" className="w-full">{t('mark_as_restocked')}</Button>
                    </form>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export function ModelsManager({ initialJewelryTypes, locale, preferences }: ModelsManagerProps) {
    const { toast } = useToast();
    const t = useTranslations('Admin');
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
                payload: { jewelryTypeId: selectedJewelryType.id, model: model }
            });
        });
        toast({ title: 'Succès', description: `Le modèle "${model.name}" a été ${isEditing ? 'mis à jour' : 'créé'}.` });
    }

    const handleDeleteAction = async (formData: FormData) => {
        const modelId = formData.get('modelId') as string;
        const jewelryTypeId = formData.get('jewelryTypeId') as string;
        startTransition(() => { dispatch({ type: 'DELETE', payload: { jewelryTypeId, modelId } }); });
        const result = await deleteModel(formData);
        toast({ title: result.success ? 'Succès' : 'Erreur', description: result.message, variant: result.success ? 'default' : 'destructive' });
    };

    const handleOrderAction = (formData: FormData) => {
        const modelId = formData.get('itemId') as string;
        const jewelryTypeId = formData.get('itemType') as string;
        startTransition(() => {
            dispatch({ type: 'MARK_ORDERED', payload: { jewelryTypeId, modelId } });
        });
        markAsOrdered(formData).then(result => {
            toast({ title: result.success ? 'Succès' : 'Erreur', description: result.message, variant: result.success ? 'default' : 'destructive' });
        });
    }

    const handleRestockAction = (formData: FormData) => {
        const modelId = formData.get('itemId') as string;
        const jewelryTypeId = formData.get('itemType') as string;
        
        markAsRestocked(formData).then(result => {
            if (result.success && result.newQuantity !== undefined) {
                startTransition(() => {
                    dispatch({ type: 'MARK_RESTOCKED', payload: { jewelryTypeId, modelId, newQuantity: result.newQuantity! } });
                });
                 toast({ title: 'Succès', description: result.message });
            } else {
                 toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
            }
        });
    }

    const getCategoryAlertState = (models: JewelryModel[]): 'critical' | 'alert' | 'none' => {
        if (models.some(m => (m.quantity ?? Infinity) <= preferences.criticalThreshold && !m.lastOrderedAt)) return 'critical';
        if (models.some(m => (m.quantity ?? Infinity) <= preferences.alertThreshold && !m.lastOrderedAt)) return 'alert';
        return 'none';
    };
    
    const getItemAlertState = (model: JewelryModel): 'reordered' | 'critical' | 'alert' | 'none' => {
        if (model.lastOrderedAt && !model.restockedAt) return 'reordered';
        const q = model.quantity ?? Infinity;
        if (q <= preferences.criticalThreshold) return 'critical';
        if (q <= preferences.alertThreshold) return 'alert';
        return 'none';
    }

    const AlertIcon = ({ state, message }: { state: 'critical' | 'alert' | 'reordered', message: string }) => {
        const stateClasses = {
            critical: 'text-red-500',
            alert: 'text-yellow-500',
            reordered: 'text-blue-500'
        };
        const Icon = state === 'reordered' ? Info : AlertTriangle;

        return (
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <Icon className={cn('h-5 w-5', stateClasses[state])} />
                    </TooltipTrigger>
                    <TooltipContent><p>{message}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    };
    
    return (
        <div className="p-4 bg-card rounded-lg border">
            <Accordion type="multiple" className="w-full">
                {jewelryTypes.map((jewelryType) => {
                    const alertState = getCategoryAlertState(jewelryType.models);
                    return (
                        <AccordionItem value={jewelryType.id} key={jewelryType.id}>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full py-4 gap-2">
                                <AccordionTrigger className="text-xl font-headline flex-1 py-0 hover:no-underline">
                                    <div className="flex items-center gap-2">
                                        {alertState !== 'none' && (
                                            <AlertIcon state={alertState} message={alertState === 'critical' ? "Un ou plusieurs modèles ont un stock critique." : "Un ou plusieurs modèles ont un stock bas."} />
                                        )}
                                        {jewelryType.name}
                                    </div>
                                </AccordionTrigger>
                                <Button size="sm" className="sm:mr-4 w-full sm:w-auto" onClick={(e) => { e.stopPropagation(); handleAddModelClick(jewelryType); }}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Ajouter un modèle
                                </Button>
                            </div>
                            <AccordionContent>
                                {/* Desktop View */}
                                <div className="hidden md:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-24">Image</TableHead>
                                                <TableHead>Nom</TableHead>
                                                <TableHead>Prix</TableHead>
                                                <TableHead>Stock</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {jewelryType.models.map((model) => {
                                                const itemAlertState = getItemAlertState(model);
                                                return (
                                                    <TableRow key={model.id} className={isPending ? 'opacity-50' : ''}>
                                                        <TableCell>
                                                            <Dialog><DialogTrigger asChild>
                                                                <div className="relative w-16 h-16 cursor-pointer group">
                                                                    <Image src={model.displayImageUrl} alt={model.name} width={64} height={64} className="w-16 h-16 object-cover rounded-md group-hover:opacity-75" />
                                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                                        <ZoomIn className="text-white h-6 w-6" />
                                                                    </div>
                                                                </div>
                                                            </DialogTrigger><DialogContent>
                                                                <DialogHeader><DialogTitle>{model.name}</DialogTitle></DialogHeader>
                                                                <Image src={model.displayImageUrl} alt={model.name} width={400} height={400} className="w-full h-auto object-contain rounded-lg" />
                                                            </DialogContent></Dialog>
                                                        </TableCell>
                                                        <TableCell className="font-medium">{model.name}</TableCell>
                                                        <TableCell>{model.price}€</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                {itemAlertState !== 'none' && (
                                                                    <AlertIcon state={itemAlertState} message={
                                                                        itemAlertState === 'critical' ? t('stock_critical', { threshold: preferences.criticalThreshold }) : 
                                                                        itemAlertState === 'alert' ? t('stock_low', { threshold: preferences.alertThreshold }) :
                                                                        t('stock_reordered', { date: safeToLocaleDateString(model.lastOrderedAt) })
                                                                    } />
                                                                )}
                                                                {model.quantity}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right space-x-1">
                                                            <ReorderDialog 
                                                                model={model}
                                                                jewelryTypeId={jewelryType.id}
                                                                locale={locale}
                                                                onOrder={handleOrderAction}
                                                                onRestock={handleRestockAction}
                                                                t={t}
                                                            />
                                                            <Button variant="ghost" size="icon" onClick={() => handleEditModelClick(jewelryType, model)}>
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
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
                                                                            <AlertDialogDescription>Cette action est irréversible. Le modèle "{model.name}" sera définitivement supprimé.</AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel type="button">Annuler</AlertDialogCancel>
                                                                            <AlertDialogAction type="submit" className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </form>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                                {/* Mobile View */}
                                <div className="md:hidden space-y-4">
                                     {jewelryType.models.map((model) => {
                                        const itemAlertState = getItemAlertState(model);
                                        return (
                                            <Card key={model.id} className="p-4">
                                                <div className="flex gap-4">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <div className="relative w-16 h-16 cursor-pointer group flex-shrink-0">
                                                                <Image src={model.displayImageUrl} alt={model.name} width={64} height={64} className="w-16 h-16 object-cover rounded-md group-hover:opacity-75" />
                                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                                    <ZoomIn className="text-white h-6 w-6" />
                                                                </div>
                                                            </div>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader><DialogTitle>{model.name}</DialogTitle></DialogHeader>
                                                            <Image src={model.displayImageUrl} alt={model.name} width={400} height={400} className="w-full h-auto object-contain rounded-lg" />
                                                        </DialogContent>
                                                    </Dialog>
                                                    <div className="flex-grow space-y-1">
                                                        <h4 className="font-bold">{model.name}</h4>
                                                        <p>Prix: {model.price}€</p>
                                                        <div className="flex items-center gap-2">
                                                            <span>Stock:</span>
                                                            {itemAlertState !== 'none' && (
                                                                <AlertIcon state={itemAlertState} message={
                                                                    itemAlertState === 'critical' ? t('stock_critical', { threshold: preferences.criticalThreshold }) :
                                                                    itemAlertState === 'alert' ? t('stock_low', { threshold: preferences.alertThreshold }) :
                                                                    t('stock_reordered', { date: safeToLocaleDateString(model.lastOrderedAt) })
                                                                } />
                                                            )}
                                                            <span>{model.quantity}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end items-center gap-1 mt-2">
                                                    <ReorderDialog 
                                                        model={model}
                                                        jewelryTypeId={jewelryType.id}
                                                        locale={locale}
                                                        onOrder={handleOrderAction}
                                                        onRestock={handleRestockAction}
                                                        t={t}
                                                    />
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditModelClick(jewelryType, model)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
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
                                                                    <AlertDialogDescription>Cette action est irréversible. Le modèle "{model.name}" sera définitivement supprimé.</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel type="button">Annuler</AlertDialogCancel>
                                                                    <AlertDialogAction type="submit" className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </form>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </Card>
                                        );
                                     })}
                                </div>

                                {jewelryType.models.length === 0 && (<p className="text-center text-muted-foreground py-8">Aucun modèle pour cette catégorie.</p>)}
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
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
