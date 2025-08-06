
'use client';

import React, { useState, useReducer, useTransition, useMemo, FormEvent } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, ZoomIn, AlertTriangle, ShoppingCart, Info, Search, Gem, Ruler, EllipsisVertical } from "lucide-react";
import type { JewelryType, JewelryModel, GeneralPreferences, Charm } from "@/lib/types";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteModel, markAsOrdered, markAsRestocked } from '@/app/actions/admin.actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useTranslations } from '@/hooks/use-translations';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardTitle } from './ui/card';
import { ModelSizingTool } from './model-sizing-tool';

interface ModelsManagerProps {
    initialJewelryTypes: Omit<JewelryType, 'icon'>[];
    allCharms: Charm[];
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
    return state.map(jt => {
        if (jt.id !== action.payload.jewelryTypeId) {
            return jt;
        }

        switch (action.type) {
            case 'DELETE':
                return { ...jt, models: jt.models.filter(m => m.id !== action.payload.modelId) };
            case 'ADD':
                return { ...jt, models: [...jt.models, action.payload.model] };
            case 'UPDATE':
                return { ...jt, models: jt.models.map(m => m.id === action.payload.model.id ? action.payload.model : m) };
            case 'MARK_ORDERED':
                return { ...jt, models: jt.models.map(m => m.id === action.payload.modelId ? { ...m, lastOrderedAt: new Date(), restockedAt: null } : m) };
            case 'MARK_RESTOCKED':
                return { ...jt, models: jt.models.map(m => m.id === action.payload.modelId ? { ...m, lastOrderedAt: null, restockedAt: new Date(), quantity: action.payload.newQuantity } : m) };
            default:
                return jt;
        }
    });
}

function ReorderDialog({ model, jewelryTypeId, locale, onOrder, onRestock, t, children }: {
    model: JewelryModel,
    jewelryTypeId: string,
    locale: string,
    onOrder: (formData: FormData) => void,
    onRestock: (formData: FormData) => void,
    t: (key: string, values?: any) => string,
    children: React.ReactNode,
}) {
    const [restockedQuantity, setRestockedQuantity] = useState(1);
    const [isOpen, setIsOpen] = useState(false);

    const handleOrderSubmit = () => {
        const formData = new FormData();
        formData.append('itemId', model.id);
        formData.append('itemType', jewelryTypeId);
        formData.append('locale', locale);
        onOrder(formData);
        setIsOpen(false);
    }
    
    const handleRestockSubmit = (e: FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        formData.append('itemId', model.id);
        formData.append('itemType', jewelryTypeId);
        formData.append('locale', locale);
        onRestock(formData);
        setIsOpen(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('reorder_dialog_title', {itemName: model.name})}</AlertDialogTitle>
                    <AlertDialogDescription>{t('reorder_dialog_description')}</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex flex-col gap-4 my-4">
                    <Button variant="outline" asChild disabled={!model.reorderUrl}>
                        <a href={model.reorderUrl || ''} target="_blank" rel="noopener noreferrer">{t('open_reorder_url')}</a>
                    </Button>
                    
                    <form onSubmit={(e) => { e.preventDefault(); handleOrderSubmit(); }}>
                        <AlertDialogAction type="submit" className="w-full">{t('mark_as_ordered')}</AlertDialogAction>
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
                                name="restockedQuantity"
                                type="number" 
                                defaultValue={restockedQuantity} 
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
            </DialogContent>
        </Dialog>
    );
}

export function ModelsManager({ initialJewelryTypes, allCharms, locale, preferences }: ModelsManagerProps) {
    const { toast } = useToast();
    const t = useTranslations('Admin');
    const [isPending, startTransition] = useTransition();
    const [jewelryTypes, dispatch] = useReducer(jewelryTypesReducer, initialJewelryTypes);
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedJewelryType, setSelectedJewelryType] = useState<Omit<JewelryType, 'models'|'icon'>>(initialJewelryTypes[0]);
    const [selectedModel, setSelectedModel] = useState<JewelryModel | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSizingToolOpen, setIsSizingToolOpen] = useState(false);
    const [modelToSize, setModelToSize] = useState<JewelryModel | null>(null);

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
    
    const handleSizeModelClick = (jewelryType: Omit<JewelryType, 'models'|'icon'>, model: JewelryModel) => {
        setSelectedJewelryType(jewelryType);
        setModelToSize(model);
        setIsSizingToolOpen(true);
    }

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

    const filteredJewelryTypes = useMemo(() => {
        if (!searchTerm) return jewelryTypes;
        return jewelryTypes
            .map(jt => ({
                ...jt,
                models: jt.models.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
            }))
            .filter(jt => jt.models.length > 0);
    }, [jewelryTypes, searchTerm]);

    const getCategoryAlertState = (models: JewelryModel[]): 'critical' | 'alert' | 'none' => {
        if (models.some(m => (m.quantity ?? Infinity) <= preferences.criticalThreshold && !m.lastOrderedAt)) return 'critical';
        if (models.some(m => (m.quantity ?? Infinity) <= preferences.alertThreshold && !m.lastOrderedAt)) return 'alert';
        return 'none';
    };
    
    const getItemAlertState = (model: JewelryModel): 'reordered' | 'critical' | 'alert' | 'none' => {
        const q = model.quantity ?? Infinity;
        if (model.lastOrderedAt && !model.restockedAt) return 'reordered';
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
        <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <CardTitle className="text-xl font-headline flex items-center gap-2">
                    <Gem /> Gestion des Modèles
                </CardTitle>
                 <div className="relative w-full sm:w-auto sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher un modèle..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            <div className="p-4 bg-card rounded-lg border">
                <Accordion type="multiple" className="w-full" defaultValue={jewelryTypes.map(jt => jt.id)}>
                    {filteredJewelryTypes.map((jewelryType) => {
                        const alertState = getCategoryAlertState(jewelryType.models);
                        const titleId = `dialog-title-${jewelryType.id}`;
                        const descriptionId = `dialog-description-${jewelryType.id}`;
                        return (
                            <AccordionItem value={jewelryType.id} key={jewelryType.id}>
                                <AccordionTrigger className="text-xl font-headline flex-1 py-4 hover:no-underline [&>svg]:hidden">
                                     <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4">
                                        <div className="flex items-center gap-2">
                                            {alertState !== 'none' && (
                                                <AlertIcon state={alertState} message={alertState === 'critical' ? "Un ou plusieurs modèles ont un stock critique." : "Un ou plusieurs modèles ont un stock bas."} />
                                            )}
                                            {jewelryType.name}
                                        </div>
                                        <div className="flex items-center gap-2 self-end sm:self-center">
                                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleAddModelClick(jewelryType); }}>
                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                Ajouter un modèle
                                            </Button>
                                            <AccordionTrigger className="p-2" />
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    {/* Desktop View */}
                                    <div className="hidden md:block">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-24">Image</TableHead>
                                                    <TableHead>Nom</TableHead>
                                                    <TableHead>Dimensions (mm)</TableHead>
                                                    <TableHead>Coût Achat</TableHead>
                                                    <TableHead>Prix Vente</TableHead>
                                                    <TableHead>Marge</TableHead>
                                                    <TableHead>Stock</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {jewelryType.models.map((model) => {
                                                    const itemAlertState = getItemAlertState(model);
                                                    const margin = model.price && model.purchasePrice ? model.price - model.purchasePrice : null;
                                                    return (
                                                        <TableRow key={model.id} className={isPending ? 'opacity-50' : ''}>
                                                            <TableCell>
                                                                <Dialog>
                                                                    <DialogTrigger asChild>
                                                                        <div className="relative w-16 h-16 cursor-pointer group">
                                                                            <Image src={model.displayImageUrl} alt={model.name} fill className="w-16 h-16 object-cover rounded-md group-hover:opacity-75" sizes="64px" />
                                                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                                                                                <ZoomIn className="text-white h-6 w-6" />
                                                                            </div>
                                                                        </div>
                                                                    </DialogTrigger>
                                                                    <DialogContent aria-labelledby={titleId} aria-describedby={descriptionId}>
                                                                        <DialogHeader><DialogTitle id={titleId}>{model.name}</DialogTitle><DialogDescription id={descriptionId}>{jewelryType.name}</DialogDescription></DialogHeader>
                                                                        <Image src={model.displayImageUrl} alt={model.name} width={400} height={400} className="w-full h-auto object-contain rounded-lg" sizes="400px"/>
                                                                    </DialogContent>
                                                                </Dialog>
                                                            </TableCell>
                                                            <TableCell className="font-medium">{model.name}</TableCell>
                                                             <TableCell className="font-mono text-xs">
                                                                {model.width && model.height ? `${model.width} x ${model.height}` : 'N/A'}
                                                            </TableCell>
                                                            <TableCell>{model.purchasePrice ? `${model.purchasePrice.toFixed(2)}€` : '-'}</TableCell>
                                                            <TableCell>{model.price ? `${model.price.toFixed(2)}€` : '-'}</TableCell>
                                                            <TableCell>{margin !== null ? `${margin.toFixed(2)}€` : '-'}</TableCell>
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
                                                            <TableCell className="text-right">
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon">
                                                                            <EllipsisVertical className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent>
                                                                        <DropdownMenuItem onSelect={() => handleSizeModelClick(jewelryType, model)}>
                                                                            <Ruler className="mr-2 h-4 w-4" />Calibrer
                                                                        </DropdownMenuItem>
                                                                        <ReorderDialog model={model} jewelryTypeId={jewelryType.id} locale={locale} onOrder={handleOrderAction} onRestock={handleRestockAction} t={t}>
                                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                                <ShoppingCart className="mr-2 h-4 w-4" />Gérer commande
                                                                            </DropdownMenuItem>
                                                                        </ReorderDialog>
                                                                        <DropdownMenuItem onSelect={() => handleEditModelClick(jewelryType, model)}>
                                                                            <Edit className="mr-2 h-4 w-4" />Modifier
                                                                        </DropdownMenuItem>
                                                                        <AlertDialog>
                                                                            <AlertDialogTrigger asChild>
                                                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={e => e.preventDefault()}>
                                                                                    <Trash2 className="mr-2 h-4 w-4" />Supprimer
                                                                                </DropdownMenuItem>
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
                                                                                    <AlertDialogFooter><AlertDialogCancel type="button">Annuler</AlertDialogCancel><AlertDialogAction type="submit" className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
                                                                                </form>
                                                                            </AlertDialogContent>
                                                                        </AlertDialog>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
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
                                            const margin = model.price && model.purchasePrice ? model.price - model.purchasePrice : null;
                                            return (
                                                <Card key={model.id} className="p-4">
                                                    <div className="flex gap-4">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <div className="relative w-16 h-16 cursor-pointer group flex-shrink-0">
                                                                    <Image src={model.displayImageUrl} alt={model.name} fill className="object-cover rounded-md group-hover:opacity-75" sizes="64px"/>
                                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                                                                        <ZoomIn className="text-white h-6 w-6" />
                                                                    </div>
                                                                </div>
                                                            </DialogTrigger>
                                                            <DialogContent aria-labelledby={titleId} aria-describedby={descriptionId}>
                                                                <DialogHeader><DialogTitle id={titleId}>{model.name}</DialogTitle><DialogDescription id={descriptionId}>{jewelryType.name}</DialogDescription></DialogHeader>
                                                                <Image src={model.displayImageUrl} alt={model.name} width={400} height={400} className="w-full h-auto object-contain rounded-lg" sizes="400px"/>
                                                            </DialogContent>
                                                        </Dialog>
                                                        <div className="flex-grow space-y-1">
                                                            <h4 className="font-bold">{model.name}</h4>
                                                            <p className="text-sm">Dimensions: {model.width && model.height ? `${model.width} x ${model.height}mm` : 'N/A'}</p>
                                                            <p className="text-sm">Coût: {model.purchasePrice ? `${model.purchasePrice.toFixed(2)}€` : '-'}</p>
                                                            <p className="text-sm">Vente: {model.price ? `${model.price.toFixed(2)}€` : '-'}</p>
                                                            <p className="text-sm">Marge: {margin !== null ? `${margin.toFixed(2)}€` : '-'}</p>
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
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="flex-shrink-0">
                                                                    <EllipsisVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent>
                                                                <DropdownMenuItem onSelect={() => handleSizeModelClick(jewelryType, model)}>
                                                                    <Ruler className="mr-2 h-4 w-4" />Calibrer
                                                                </DropdownMenuItem>
                                                                 <ReorderDialog model={model} jewelryTypeId={jewelryType.id} locale={locale} onOrder={handleOrderAction} onRestock={handleRestockAction} t={t}>
                                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                                        <ShoppingCart className="mr-2 h-4 w-4" />Gérer commande
                                                                    </DropdownMenuItem>
                                                                </ReorderDialog>
                                                                <DropdownMenuItem onSelect={() => handleEditModelClick(jewelryType, model)}>
                                                                    <Edit className="mr-2 h-4 w-4" />Modifier
                                                                </DropdownMenuItem>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={e => e.preventDefault()}>
                                                                            <Trash2 className="mr-2 h-4 w-4" />Supprimer
                                                                        </DropdownMenuItem>
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
                                                                            <AlertDialogFooter><AlertDialogCancel type="button">Annuler</AlertDialogCancel><AlertDialogAction type="submit" className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
                                                                        </form>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
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
            </div>
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
             {isSizingToolOpen && modelToSize && (
                <ModelSizingTool
                    isOpen={isSizingToolOpen}
                    onOpenChange={setIsSizingToolOpen}
                    model={modelToSize}
                    allCharms={allCharms}
                    onSave={handleSaveModel}
                    locale={locale}
                    jewelryType={selectedJewelryType}
                />
            )}
        </>
    );
}
