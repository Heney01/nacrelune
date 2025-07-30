
'use client';

import React, { useState, useReducer, useTransition, useMemo, FormEvent } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Tag, WandSparkles, ZoomIn, AlertTriangle, ShoppingCart, Info, Search } from "lucide-react";
import type { Charm, CharmCategory, GeneralPreferences } from "@/lib/types";
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
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { CharmCategoryForm } from './charm-category-form';
import { CharmForm } from './charm-form';
import { deleteCharmCategory, deleteCharm, markAsOrdered, markAsRestocked } from '@/app/actions';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useTranslations } from '@/hooks/use-translations';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface CharmsManagerProps {
    initialCharms: (Charm & { categoryName?: string })[];
    initialCharmCategories: CharmCategory[];
    locale: string;
    preferences: GeneralPreferences;
}

type State = {
    charms: (Charm & { categoryName?: string })[];
    categories: CharmCategory[];
};

type Action = {
    type: 'ADD_CATEGORY' | 'UPDATE_CATEGORY';
    payload: CharmCategory;
} | {
    type: 'DELETE_CATEGORY';
    payload: { categoryId: string };
} | {
    type: 'ADD_CHARM' | 'UPDATE_CHARM';
    payload: Charm & { categoryName?: string };
} | {
    type: 'DELETE_CHARM';
    payload: { charmId: string };
} | {
    type: 'MARK_ORDERED',
    payload: { charmId: string; }
} | {
    type: 'MARK_RESTOCKED',
    payload: { charmId: string; newQuantity: number; }
};

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

function charmsReducer(state: State, action: Action): State {
    switch (action.type) {
        case 'ADD_CATEGORY':
            return { ...state, categories: [...state.categories, action.payload] };
        case 'UPDATE_CATEGORY': {
            const updatedCategories = state.categories.map(c => c.id === action.payload.id ? action.payload : c);
            const updatedCharms = state.charms.map(charm => {
                if (charm.categoryIds.includes(action.payload.id)) {
                    // This part is complex to update optimistically as we don't have the full category mapping here easily
                    return charm; // simplified: re-fetch would handle the name change
                }
                return charm;
            });
            return { ...state, categories: updatedCategories, charms: updatedCharms };
        }
        case 'DELETE_CATEGORY':
            return {
                ...state,
                categories: state.categories.filter(c => c.id !== action.payload.categoryId),
                charms: state.charms.map(ch => ({
                    ...ch,
                    categoryIds: ch.categoryIds.filter(id => id !== action.payload.categoryId)
                }))
            };
        case 'ADD_CHARM':
            return { ...state, charms: [...state.charms, action.payload] };
        case 'UPDATE_CHARM':
            return { ...state, charms: state.charms.map(c => c.id === action.payload.id ? action.payload : c) };
        case 'DELETE_CHARM':
            return { ...state, charms: state.charms.filter(c => c.id !== action.payload.charmId) };
        case 'MARK_ORDERED':
             return {
                ...state,
                charms: state.charms.map(c => c.id === action.payload.charmId ? { ...c, lastOrderedAt: new Date(), restockedAt: null } : c )
            };
        case 'MARK_RESTOCKED':
            return {
                ...state,
                charms: state.charms.map(c => c.id === action.payload.charmId ? { ...c, lastOrderedAt: null, restockedAt: new Date(), quantity: action.payload.newQuantity } : c )
            };
        default:
            return state;
    }
}

function ReorderDialog({ charm, locale, onOrder, onRestock, t }: {
    charm: Charm,
    locale: string,
    onOrder: (formData: FormData) => void,
    onRestock: (formData: FormData) => void,
    t: (key: string, values?: any) => string
}) {
    const [restockedQuantity, setRestockedQuantity] = useState(1);
    const [isOpen, setIsOpen] = useState(false);

    const handleOrderSubmit = () => {
        const formData = new FormData();
        formData.append('itemId', charm.id);
        formData.append('itemType', 'charms');
        formData.append('locale', locale);
        onOrder(formData);
        setIsOpen(false);
    }
    
    const handleRestockSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        formData.append('itemId', charm.id);
        formData.append('itemType', 'charms');
        formData.append('locale', locale);
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
                    <AlertDialogTitle>{t('reorder_dialog_title', {itemName: charm.name})}</AlertDialogTitle>
                    <AlertDialogDescription>{t('reorder_dialog_description')}</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex flex-col gap-4 my-4">
                    <Button variant="outline" asChild disabled={!charm.reorderUrl}>
                        <a href={charm.reorderUrl || ''} target="_blank" rel="noopener noreferrer">{t('open_reorder_url')}</a>
                    </Button>
                    <AlertDialogAction onClick={handleOrderSubmit} className="w-full">{t('mark_as_ordered')}</AlertDialogAction>
                    
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
            </AlertDialogContent>
        </AlertDialog>
    );
}

export function CharmsManager({ initialCharms, initialCharmCategories, locale, preferences }: CharmsManagerProps) {
    const { toast } = useToast();
    const t = useTranslations('Admin');
    const [isPending, startTransition] = useTransition();
    
    const [state, dispatch] = useReducer(charmsReducer, { charms: initialCharms, categories: initialCharmCategories });
    const { charms, categories } = state;

    const [searchTerm, setSearchTerm] = useState('');

    const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<CharmCategory | null>(null);

    const [isCharmFormOpen, setIsCharmFormOpen] = useState(false);
    const [selectedCharm, setSelectedCharm] = useState<Charm | null>(null);

    const handleAddCategoryClick = () => {
        setSelectedCategory(null);
        setIsCategoryFormOpen(true);
    };

    const handleEditCategoryClick = (category: CharmCategory) => {
        setSelectedCategory(category);
        setIsCategoryFormOpen(true);
    };

    const handleAddCharmClick = () => {
        setSelectedCharm(null);
        setIsCharmFormOpen(true);
    };

    const handleEditCharmClick = (charm: Charm) => {
        setSelectedCharm(charm);
        setIsCharmFormOpen(true);
    };
    
    const handleSaveCategory = (category: CharmCategory) => {
        const isEditing = categories.some(c => c.id === category.id);
        startTransition(() => { dispatch({ type: isEditing ? 'UPDATE_CATEGORY' : 'ADD_CATEGORY', payload: category }); });
        toast({ title: 'Succès', description: `La catégorie "${category.name}" a été ${isEditing ? 'mise à jour' : 'créée'}.` });
    }

    const handleSaveCharm = (charm: Charm & { categoryName?: string }) => {
        const isEditing = charms.some(c => c.id === charm.id);
        startTransition(() => { dispatch({ type: isEditing ? 'UPDATE_CHARM' : 'ADD_CHARM', payload: charm }); });
        toast({ title: 'Succès', description: `La breloque "${charm.name}" a été ${isEditing ? 'mise à jour' : 'créée'}.` });
    }
    
    const handleDeleteCategoryAction = async (formData: FormData) => {
        const categoryId = formData.get('categoryId') as string;
        startTransition(() => { dispatch({ type: 'DELETE_CATEGORY', payload: { categoryId } }); });
        const result = await deleteCharmCategory(formData);
        toast({ title: result.success ? 'Succès' : 'Erreur', description: result.message, variant: result.success ? 'default' : 'destructive' });
    }

    const handleDeleteCharmAction = async (formData: FormData) => {
        const charmId = formData.get('charmId') as string;
        startTransition(() => { dispatch({ type: 'DELETE_CHARM', payload: { charmId } }); });
        const result = await deleteCharm(formData);
        toast({ title: result.success ? 'Succès' : 'Erreur', description: result.message, variant: result.success ? 'default' : 'destructive' });
    }
    
    const handleOrderAction = (formData: FormData) => {
        const charmId = formData.get('itemId') as string;
        startTransition(() => { dispatch({ type: 'MARK_ORDERED', payload: { charmId } }); });
        markAsOrdered(formData).then(result => {
            toast({ title: result.success ? 'Succès' : 'Erreur', description: result.message, variant: result.success ? 'default' : 'destructive' });
        });
    }

    const handleRestockAction = (formData: FormData) => {
        const charmId = formData.get('itemId') as string;
        
        markAsRestocked(formData).then(result => {
            if(result.success && result.newQuantity !== undefined) {
                startTransition(() => { dispatch({ type: 'MARK_RESTOCKED', payload: { charmId, newQuantity: result.newQuantity! } }); });
                toast({ title: 'Succès', description: result.message });
            } else {
                toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
            }
        });
    }

    const filteredCharms = useMemo(() => {
        if (!searchTerm) return charms;
        return charms.filter(charm =>
            charm.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [charms, searchTerm]);

    const charmsByCategoryId = useMemo(() => {
        const acc: Record<string, (Charm & { categoryName?: string; })[]> = {};
        filteredCharms.forEach(charm => {
            if (charm.categoryIds) {
                charm.categoryIds.forEach(catId => {
                    if (!acc[catId]) acc[catId] = [];
                    acc[catId].push(charm);
                });
            }
        });
        return acc;
    }, [filteredCharms]);

    const getCategoryAlertState = (categoryId: string): 'critical' | 'alert' | 'none' => {
        const categoryCharms = charmsByCategoryId[categoryId] || [];
        if (categoryCharms.some(c => (c.quantity ?? Infinity) <= preferences.criticalThreshold && !c.lastOrderedAt)) return 'critical';
        if (categoryCharms.some(c => (c.quantity ?? Infinity) <= preferences.alertThreshold && !c.lastOrderedAt)) return 'alert';
        return 'none';
    };

    const getItemAlertState = (charm: Charm): 'reordered' | 'critical' | 'alert' | 'none' => {
        const q = charm.quantity ?? Infinity;
        if (charm.lastOrderedAt && !charm.restockedAt) return 'reordered';
        if (q <= preferences.criticalThreshold) return 'critical';
        if (q <= preferences.alertThreshold) return 'alert';
        return 'none';
    }

     const AlertIcon = ({ state, message }: { state: 'critical' | 'alert' | 'reordered', message: string }) => {
        const stateClasses = { critical: 'text-red-500', alert: 'text-yellow-500', reordered: 'text-blue-500' };
        const Icon = state === 'reordered' ? Info : AlertTriangle;
        return (
             <TooltipProvider><Tooltip><TooltipTrigger>
                <Icon className={cn('h-5 w-5', stateClasses[state])} />
            </TooltipTrigger><TooltipContent><p>{message}</p></TooltipContent></Tooltip></TooltipProvider>
        )
    };

    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <CardTitle className="text-xl font-headline flex items-center gap-2">
                    <Tag/> Gestion des Breloques & Catégories
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                       <Input 
                           placeholder="Rechercher une breloque..."
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           className="pl-9 w-full sm:w-auto"
                       />
                    </div>
                    <Button size="sm" onClick={handleAddCategoryClick} className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" />Ajouter une catégorie</Button>
                </div>
            </div>

            <div className="p-4 bg-card rounded-lg border">
                <Accordion type="multiple" className="w-full" disabled={isPending}>
                    {categories.map((category) => {
                        const alertState = getCategoryAlertState(category.id);
                        const categoryCharms = charmsByCategoryId[category.id] || [];
                        
                        if (categoryCharms.length === 0 && searchTerm) return null;

                        return (
                            <AccordionItem value={category.id} key={category.id}>
                                <AccordionTrigger className="text-xl font-headline flex-1 py-4 hover:no-underline [&>svg]:hidden">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4">
                                        <div className="flex items-center gap-4">
                                            {alertState !== 'none' && (
                                                <AlertIcon state={alertState} message={alertState === 'critical' ? "Un ou plusieurs articles ont un stock critique." : "Un ou plusieurs articles ont un stock bas."} />
                                            )}
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <div className="relative w-10 h-10 cursor-pointer group flex-shrink-0">
                                                        <Image src={category.imageUrl || 'https://placehold.co/100x100.png'} alt={category.name} fill className="rounded-md object-cover group-hover:opacity-75"/>
                                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                                                            <ZoomIn className="text-white h-5 w-5" />
                                                        </div>
                                                    </div>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader><DialogTitle>{category.name}</DialogTitle></DialogHeader>
                                                    <Image src={category.imageUrl || 'https://placehold.co/400x400.png'} alt={category.name} width={400} height={400} className="w-full h-auto object-contain rounded-lg" />
                                                </DialogContent>
                                            </Dialog>
                                            <span className='mr-auto'>{category.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 self-end sm:self-center">
                                            <Button variant="outline" size="sm" onClick={(e) => {e.stopPropagation(); handleEditCategoryClick(category);}}><Edit className="mr-2 h-4 w-4" />Modifier</Button>
                                            <AlertDialog><AlertDialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:border-destructive/50" onClick={(e) => e.stopPropagation()}><Trash2 className="mr-2 h-4 w-4" />Supprimer</Button>
                                            </AlertDialogTrigger><AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                <form action={handleDeleteCategoryAction}>
                                                    <input type="hidden" name="categoryId" value={category.id} /><input type="hidden" name="imageUrl" value={category.imageUrl || ''} /><input type="hidden" name="locale" value={locale} />
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                                                        <AlertDialogDescription>Cette action est irréversible. La catégorie "{category.name}" sera définitivement supprimée. Les breloques associées ne seront plus dans cette catégorie.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel type="button">Annuler</AlertDialogCancel><AlertDialogAction type="submit" className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
                                                </form>
                                            </AlertDialogContent></AlertDialog>
                                            <AccordionTrigger className="p-2" />
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="pl-0 sm:pl-8">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                                            <h4 className="font-semibold text-lg flex items-center gap-2"><WandSparkles className="h-5 w-5 text-primary" /> Breloques dans cette catégorie</h4>
                                             <Button size="sm" variant="outline" onClick={handleAddCharmClick} className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" />Ajouter une breloque</Button>
                                        </div>
                                        {/* Desktop View */}
                                        <div className="hidden md:block">
                                            <Table>
                                                <TableHeader><TableRow>
                                                    <TableHead className="w-24">Image</TableHead><TableHead>Nom</TableHead><TableHead>Prix</TableHead><TableHead>Stock</TableHead><TableHead className="text-right">Actions</TableHead>
                                                </TableRow></TableHeader>
                                                <TableBody>
                                                    {categoryCharms.map((charm) => {
                                                        const itemAlertState = getItemAlertState(charm);
                                                        return (
                                                            <TableRow key={charm.id}>
                                                                <TableCell>
                                                                    <Dialog><DialogTrigger asChild>
                                                                        <div className="relative w-16 h-16 cursor-pointer group">
                                                                            <Image src={charm.imageUrl} alt={charm.name} width={64} height={64} className="w-16 h-16 object-cover rounded-md bg-white p-1 border group-hover:opacity-75" />
                                                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md"><ZoomIn className="text-white h-6 w-6" /></div>
                                                                        </div>
                                                                    </DialogTrigger><DialogContent>
                                                                        <DialogHeader><DialogTitle>{charm.name}</DialogTitle></DialogHeader>
                                                                        <Image src={charm.imageUrl} alt={charm.name} width={400} height={400} className="w-full h-auto object-contain rounded-lg" />
                                                                    </DialogContent></Dialog>
                                                                </TableCell>
                                                                <TableCell className="font-medium">{charm.name}</TableCell>
                                                                <TableCell>{charm.price}€</TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        {itemAlertState !== 'none' && (
                                                                             <AlertIcon state={itemAlertState} message={
                                                                                itemAlertState === 'critical' ? t('stock_critical', { threshold: preferences.criticalThreshold }) : 
                                                                                itemAlertState === 'alert' ? t('stock_low', { threshold: preferences.alertThreshold }) :
                                                                                t('stock_reordered', { date: safeToLocaleDateString(charm.lastOrderedAt) })
                                                                            } />
                                                                        )}
                                                                        {charm.quantity}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right space-x-1">
                                                                    <ReorderDialog
                                                                        charm={charm}
                                                                        locale={locale}
                                                                        onOrder={handleOrderAction}
                                                                        onRestock={handleRestockAction}
                                                                        t={t}
                                                                    />
                                                                    <Button variant="ghost" size="icon" onClick={() => handleEditCharmClick(charm)}><Edit className="h-4 w-4" /></Button>
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                                        <AlertDialogContent>
                                                                            <form action={handleDeleteCharmAction}>
                                                                                <input type="hidden" name="charmId" value={charm.id} /><input type="hidden" name="imageUrl" value={charm.imageUrl} /><input type="hidden" name="locale" value={locale} />
                                                                                <AlertDialogHeader>
                                                                                    <AlertDialogTitle>Supprimer la breloque "{charm.name}" ?</AlertDialogTitle>
                                                                                    <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
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
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                         {/* Mobile View */}
                                        <div className="md:hidden space-y-4">
                                            {categoryCharms.map((charm) => {
                                                const itemAlertState = getItemAlertState(charm);
                                                return (
                                                    <Card key={charm.id} className="p-4">
                                                        <div className="flex gap-4">
                                                            <Dialog><DialogTrigger asChild>
                                                                <div className="relative w-16 h-16 cursor-pointer group flex-shrink-0">
                                                                    <Image src={charm.imageUrl} alt={charm.name} width={64} height={64} className="w-16 h-16 object-cover rounded-md group-hover:opacity-75" />
                                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                                                                        <ZoomIn className="text-white h-6 w-6" />
                                                                    </div>
                                                                </div>
                                                            </DialogTrigger><DialogContent>
                                                                <DialogHeader><DialogTitle>{charm.name}</DialogTitle></DialogHeader>
                                                                <Image src={charm.imageUrl} alt={charm.name} width={400} height={400} className="w-full h-auto object-contain rounded-lg" />
                                                            </DialogContent></Dialog>
                                                            <div className="flex-grow space-y-1">
                                                                <h4 className="font-bold">{charm.name}</h4>
                                                                <p>Prix: {charm.price}€</p>
                                                                <div className="flex items-center gap-2">
                                                                    <span>Stock:</span>
                                                                    {itemAlertState !== 'none' && (
                                                                        <AlertIcon state={itemAlertState} message={
                                                                            itemAlertState === 'critical' ? t('stock_critical', { threshold: preferences.criticalThreshold }) :
                                                                            itemAlertState === 'alert' ? t('stock_low', { threshold: preferences.alertThreshold }) :
                                                                            t('stock_reordered', { date: safeToLocaleDateString(charm.lastOrderedAt) })
                                                                        } />
                                                                    )}
                                                                    <span>{charm.quantity}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-end items-center gap-1 mt-2">
                                                            <ReorderDialog
                                                                charm={charm}
                                                                locale={locale}
                                                                onOrder={handleOrderAction}
                                                                onRestock={handleRestockAction}
                                                                t={t}
                                                            />
                                                            <Button variant="ghost" size="icon" onClick={() => handleEditCharmClick(charm)}><Edit className="h-4 w-4" /></Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <form action={handleDeleteCharmAction}>
                                                                        <input type="hidden" name="charmId" value={charm.id} /><input type="hidden" name="imageUrl" value={charm.imageUrl} /><input type="hidden" name="locale" value={locale} />
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Supprimer la breloque "{charm.name}" ?</AlertDialogTitle>
                                                                            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
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
                                                )
                                            })}
                                        </div>

                                        {categoryCharms.length === 0 && (
                                            <p className="text-center text-muted-foreground py-8">Aucune breloque dans cette catégorie.</p>
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
                 {categories.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">Commencez par ajouter une catégorie.</p>
                )}
            </div>
            {isCategoryFormOpen && (
                <CharmCategoryForm
                    isOpen={isCategoryFormOpen}
                    onOpenChange={setIsCategoryFormOpen}
                    category={selectedCategory}
                    onSave={handleSaveCategory}
                    locale={locale}
                />
            )}
            {isCharmFormOpen && (
                <CharmForm
                    isOpen={isCharmFormOpen}
                    onOpenChange={setIsCharmFormOpen}
                    charm={selectedCharm}
                    allCategories={categories}
                    onSave={handleSaveCharm}
                    locale={locale}
                />
            )}
        </>
    );
}
