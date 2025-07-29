
'use client';

import React, { useState, useReducer, useTransition } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Tag, WandSparkles, GripVertical } from "lucide-react";
import type { Charm, CharmCategory } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';
import { CharmCategoryForm } from './charm-category-form';
import { CharmForm } from './charm-form';
import { deleteCharmCategory, deleteCharm } from '@/app/actions';

interface CharmsManagerProps {
    initialCharms: (Charm & { categoryName?: string })[];
    initialCharmCategories: CharmCategory[];
    locale: string;
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
};

function charmsReducer(state: State, action: Action): State {
    switch (action.type) {
        case 'ADD_CATEGORY':
            return { ...state, categories: [...state.categories, action.payload] };
        case 'UPDATE_CATEGORY':
            return {
                ...state,
                categories: state.categories.map(c => c.id === action.payload.id ? action.payload : c),
                charms: state.charms.map(ch => ch.categoryId === action.payload.id ? {...ch, categoryName: action.payload.name } : ch)
            };
        case 'DELETE_CATEGORY':
            return {
                ...state,
                categories: state.categories.filter(c => c.id !== action.payload.categoryId),
                charms: state.charms.filter(ch => ch.categoryId !== action.payload.categoryId)
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
        default:
            return state;
    }
}

export function CharmsManager({ initialCharms, initialCharmCategories, locale }: CharmsManagerProps) {
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

    const handleAddCharmClick = (category: CharmCategory) => {
        setSelectedCharm(null);
        setSelectedCategory(category);
        setIsCharmFormOpen(true);
    };

    const handleEditCharmClick = (charm: Charm) => {
        setSelectedCharm(charm);
        const category = categories.find(c => c.id === charm.categoryId);
        setSelectedCategory(category || null);
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
    
    const charmsByCategoryId = charms.reduce((acc, charm) => {
        (acc[charm.categoryId] = acc[charm.categoryId] || []).push(charm);
        return acc;
    }, {} as Record<string, (Charm & { categoryName?: string; })[]>);

    return (
        <>
            <div className="p-4 bg-card rounded-lg border">
                <CardHeader className="p-0 mb-4">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-xl font-headline flex items-center gap-2"><Tag/> Catégories de Breloques</CardTitle>
                        <Button size="sm" onClick={handleAddCategoryClick}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Ajouter une catégorie
                        </Button>
                    </div>
                </CardHeader>

                <Accordion type="multiple" className="w-full" disabled={isPending}>
                    {categories.map((category) => (
                        <AccordionItem value={category.id} key={category.id}>
                            <div className="flex justify-between items-center w-full py-4 group">
                                <GripVertical className="h-5 w-5 text-muted-foreground mr-2" />
                                <AccordionTrigger className="text-xl font-headline flex-1 py-0 hover:no-underline">
                                    <div className="flex items-center gap-4">
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
                                                        Cette action est irréversible. La catégorie "{category.name}" et <strong>toutes les breloques</strong> qu'elle contient seront définitivement supprimées.
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
                                         <Button size="sm" variant="secondary" onClick={() => handleAddCharmClick(category)}>
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Ajouter une breloque
                                        </Button>
                                    </div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-24">Image</TableHead>
                                                <TableHead>Nom</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Prix</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(charmsByCategoryId[category.id] || []).map((charm) => (
                                                <TableRow key={charm.id}>
                                                    <TableCell><Image src={charm.imageUrl} alt={charm.name} width={64} height={64} className="w-12 h-12 object-cover rounded-md bg-white p-1 border" /></TableCell>
                                                    <TableCell className="font-medium">{charm.name}</TableCell>
                                                    <TableCell className="text-muted-foreground text-xs max-w-xs truncate">{charm.description}</TableCell>
                                                    <TableCell>{charm.price}€</TableCell>
                                                    <TableCell className="text-right">
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
                                            ))}
                                        </TableBody>
                                    </Table>
                                    {(!charmsByCategoryId[category.id] || charmsByCategoryId[category.id].length === 0) && (
                                        <p className="text-center text-muted-foreground py-8">Aucune breloque dans cette catégorie.</p>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
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
            {isCharmFormOpen && selectedCategory && (
                <CharmForm
                    isOpen={isCharmFormOpen}
                    onOpenChange={setIsCharmFormOpen}
                    charm={selectedCharm}
                    category={selectedCategory}
                    allCategories={categories}
                    onSave={handleSaveCharm}
                    locale={locale}
                />
            )}
        </>
    );
}
