
'use client';

import React, { useState, useReducer, useTransition, useMemo, FormEvent } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Tag, WandSparkles, GripVertical, ZoomIn, AlertTriangle, ShoppingCart, Info } from "lucide-react";
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
import { Card, CardHeader, CardTitle } from './ui/card';
import { CharmCategoryForm } from './charm-category-form';
import { CharmForm } from './charm-form';
import { deleteCharmCategory, deleteCharm, markAsOrdered } from '@/app/actions';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

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
};

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
            return {
                ...state,
                categories: updatedCategories,
                charms: updatedCharms
            };
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
            return {
                ...state,
                charms: state.charms.map(c => c.id === action.payload.id ? action.payload : c)
            };
        case 'DELETE_CHARM':
            return {
                ...state,
                charms: state.charms.filter(c => c.id !== action.payload.charmId)
            };
        case 'MARK_ORDERED':
             return {
                ...state,
                charms: state.charms.map(c =>
                    c.id === action.payload.charmId ? { ...c, lastOrderedAt: new Date() } : c
                )
            };
        default:
            return state;
    }
}

export function CharmsManager({ initialCharms, initialCharmCategories, locale, preferences }: CharmsManagerProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    
    const [state, dispatch] = useReducer(charmsReducer, { charms: initialCharms, categories: initialCharmCategories });
    const { charms, categories } = state;

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
        startTransition(() => {
            dispatch({ type: isEditing ? 'UPDATE_CATEGORY' : 'ADD_CATEGORY', payload: category });
        });
        toast({ title: 'Succès', description: `La catégorie "${category.name}" a été ${isEditing ? 'mise à jour' : 'créée'}.` });
    }

    const handleSaveCharm = (charm: Charm & { categoryName?: string }) => {
        const isEditing = charms.some(c => c.id === charm.id);
        startTransition(() => {
            dispatch({ type: isEditing ? 'UPDATE_CHARM' : 'ADD_CHARM', payload: charm });
        });
        toast({ title: 'Succès', description: `La breloque "${charm.name}" a été ${isEditing ? 'mise à jour' : 'créée'}.` });
    }
    
    const handleDeleteCategoryAction = async (formData: FormData) => {
        const categoryId = formData.get('categoryId') as string;
        startTransition(() => {
            dispatch({ type: 'DELETE_CATEGORY', payload: { categoryId } });
        });
        const result = await deleteCharmCategory(formData);
        toast({ title: result.success ? 'Succès' : 'Erreur', description: result.message, variant: result.success ? 'default' : 'destructive' });
    }

    const handleDeleteCharmAction = async (formData: FormData) => {
        const charmId = formData.get('charmId') as string;
        startTransition(() => {
            dispatch({ type: 'DELETE_CHARM', payload: { charmId } });
        });
        const result = await deleteCharm(formData);
        toast({ title: result.success ? 'Succès' : 'Erreur', description: result.message, variant: result.success ? 'default' : 'destructive' });
    }
    
    const handleOrderAction = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const charmId = formData.get('itemId') as string;
        const reorderUrl = formData.get('reorderUrl') as string;

        startTransition(() => {
            dispatch({ type: 'MARK_ORDERED', payload: { charmId } });
            if (reorderUrl) {
                window.open(reorderUrl, '_blank');
            }
        });

        const result = await markAsOrdered(formData);
        if (result?.success) {
            toast({ title: 'Succès', description: result.message });
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result.message });
        }
    }

    const charmsByCategoryId = useMemo(() => {
        const acc: Record<string, (Charm & { categoryName?: string; })[]> = {};
        charms.forEach(charm => {
            if (charm.categoryIds) {
                charm.categoryIds.forEach(catId => {
                    if (!acc[catId]) {
                        acc[catId] = [];
                    }
                    acc[catId].push(charm);
                });
            }
        });
        return acc;
    }, [charms]);

    const getCategoryAlertState = (categoryId: string): 'critical' | 'alert' | 'none' => {
        const categoryCharms = charmsByCategoryId[categoryId] || [];
        if (categoryCharms.some(c => (c.quantity ?? Infinity) <= preferences.criticalThreshold)) {
            return 'critical';
        }
        if (categoryCharms.some(c => (c.quantity ?? Infinity) <= preferences.alertThreshold)) {
            return 'alert';
        }
        return 'none';
    };

    const getItemAlertState = (charm: Charm): 'reordered' | 'critical' | 'alert' | 'none' => {
        const q = charm.quantity ?? Infinity;
        if (q <= preferences.criticalThreshold) return 'critical';
        if (q <= preferences.alertThreshold) return 'alert';
        if (charm.lastOrderedAt) return 'reordered';
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
                    <TooltipContent>
                        <p>{message}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    };

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <CardTitle className="text-xl font-headline flex items-center gap-2">
                    <Tag/> Gestion des Breloques & Catégories
                </CardTitle>
                <div className='flex gap-2'>
                    <Button size="sm" onClick={handleAddCategoryClick}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Ajouter une catégorie
                    </Button>
                </div>
            </div>

            <div className="p-4 bg-card rounded-lg border">
                <Accordion type="multiple" className="w-full" disabled={isPending}>
                    {categories.map((category) => {
                        const alertState = getCategoryAlertState(category.id);
                        return (
                            <AccordionItem value={category.id} key={category.id}>
                                <div className="flex justify-between items-center w-full py-4 group">
                                    <AccordionTrigger className="text-xl font-headline flex-1 py-0 hover:no-underline">
                                        <div className="flex items-center gap-4">
                                            {alertState !== 'none' && (
                                                <AlertIcon state={alertState} message={alertState === 'critical' ? "Un ou plusieurs articles ont un stock critique." : "Un ou plusieurs articles ont un stock bas."} />
                                            )}
                                            <Image src={category.imageUrl || 'https://placehold.co/100x100.png'} alt={category.name} width={40} height={40} className="rounded-md"/>
                                            {category.name}
                                        </div>
                                    </AccordionTrigger>
                                    <div className="flex items-center gap-2 mr-4">
                                        <Button variant="outline" size="sm" onClick={(e) => {e.stopPropagation(); handleEditCategoryClick(category);}}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Modifier
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:border-destructive/50" onClick={(e) => e.stopPropagation()}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Supprimer
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                <form action={handleDeleteCategoryAction}>
                                                    <input type="hidden" name="categoryId" value={category.id} />
                                                    <input type="hidden" name="imageUrl" value={category.imageUrl || ''} />
                                                    <input type="hidden" name="locale" value={locale} />
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Cette action est irréversible. La catégorie "{category.name}" sera définitivement supprimée. Les breloques associées ne seront plus dans cette catégorie.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel type="button">Annuler</AlertDialogCancel>
                                                        <AlertDialogAction type="submit" className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </form>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                                <AccordionContent>
                                    <div className="pl-8">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-semibold text-lg flex items-center gap-2"><WandSparkles className="h-5 w-5 text-primary" /> Breloques dans cette catégorie</h4>
                                             <Button size="sm" variant="outline" onClick={handleAddCharmClick}>
                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                Ajouter une breloque
                                            </Button>
                                        </div>
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
                                                {(charmsByCategoryId[category.id] || []).map((charm) => {
                                                    const itemAlertState = getItemAlertState(charm);
                                                    return (
                                                        <TableRow key={charm.id}>
                                                            <TableCell>
                                                                <Dialog>
                                                                    <DialogTrigger asChild>
                                                                        <div className="relative w-16 h-16 cursor-pointer group">
                                                                            <Image src={charm.imageUrl} alt={charm.name} width={64} height={64} className="w-16 h-16 object-cover rounded-md bg-white p-1 border group-hover:opacity-75" />
                                                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                                                <ZoomIn className="text-white h-6 w-6" />
                                                                            </div>
                                                                        </div>
                                                                    </DialogTrigger>
                                                                    <DialogContent>
                                                                        <DialogHeader>
                                                                            <DialogTitle>{charm.name}</DialogTitle>
                                                                        </DialogHeader>
                                                                        <Image src={charm.imageUrl} alt={charm.name} width={400} height={400} className="w-full h-auto object-contain rounded-lg" />
                                                                    </DialogContent>
                                                                </Dialog>
                                                            </TableCell>
                                                            <TableCell className="font-medium">{charm.name}</TableCell>
                                                            <TableCell>{charm.price}€</TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    {itemAlertState !== 'none' && (
                                                                         <AlertIcon state={itemAlertState} message={
                                                                            itemAlertState === 'critical' ? 'Stock critique !' : 
                                                                            itemAlertState === 'alert' ? 'Stock bas' :
                                                                            `Commandé le ${charm.lastOrderedAt?.toLocaleDateString()}`
                                                                        } />
                                                                    )}
                                                                    {charm.quantity}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right space-x-1">
                                                                <form onSubmit={handleOrderAction} className="inline-block">
                                                                    <input type="hidden" name="itemId" value={charm.id} />
                                                                    <input type="hidden" name="itemType" value="charms" />
                                                                    <input type="hidden" name="reorderUrl" value={charm.reorderUrl || ''} />
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button type="submit" variant="ghost" size="icon" disabled={!charm.reorderUrl}>
                                                                                    <ShoppingCart className="h-4 w-4" />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>Passer une commande</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                </form>
                                                                <Button variant="ghost" size="icon" onClick={() => handleEditCharmClick(charm)}><Edit className="h-4 w-4" /></Button>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <form action={handleDeleteCharmAction}>
                                                                            <input type="hidden" name="charmId" value={charm.id} />
                                                                            <input type="hidden" name="imageUrl" value={charm.imageUrl} />
                                                                            <input type="hidden" name="locale" value={locale} />
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
                                        {(!charmsByCategoryId[category.id] || charmsByCategoryId[category.id].length === 0) && (
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
