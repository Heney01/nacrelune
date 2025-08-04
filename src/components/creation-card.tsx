
'use client';

import React, { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Creation, JewelryModel, JewelryType, PlacedCharm, Charm } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/hooks/use-translations';
import { Heart, User, Loader2, MoreHorizontal, Edit, Trash2, ShoppingCart, Share2 } from 'lucide-react';
import { toggleLikeCreation, deleteCreation, updateCreation } from '@/app/actions/creation.actions';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { useCart } from '@/hooks/use-cart';
import { getJewelryTypesAndModels, getCharms } from '@/lib/data';
import { ShareDialog } from './share-dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

function EditCreationDialog({ creation, onOpenChange, isOpen, onUpdate }: { 
    creation: Creation, 
    isOpen: boolean, 
    onOpenChange: (open: boolean) => void,
    onUpdate: (updatedCreation: Partial<Creation>) => void 
}) {
    const tEditor = useTranslations('Editor');
    const tAuth = useTranslations('Auth');
    const [name, setName] = useState(creation.name);
    const [isUpdating, setIsUpdating] = useState(false);
    const { firebaseUser } = useAuth();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firebaseUser) return;
        
        setIsUpdating(true);
        try {
            const idToken = await firebaseUser.getIdToken();
            const result = await updateCreation(idToken, creation.id, name);
            if (result.success) {
                toast({ title: tAuth('edit_creation_success_title'), description: result.message });
                onUpdate({ id: creation.id, name: name });
                onOpenChange(false);
            } else {
                toast({ variant: 'destructive', title: tAuth('edit_creation_error_title'), description: result.message });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: tAuth('edit_creation_error_title'), description: "Une erreur inattendue est survenue." });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                 <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{tAuth('edit_creation_title')}</DialogTitle>
                        <DialogDescription>{tAuth('edit_creation_description')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">{tEditor('creation_name_label')}</Label>
                            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>{tEditor('cancel_button')}</Button>
                        <Button type="submit" disabled={isUpdating || !name.trim()}>
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {tAuth('save_changes_button')}
                        </Button>
                    </DialogFooter>
                 </form>
            </DialogContent>
        </Dialog>
    )
}


export function CreationCard({ 
    creation, 
    locale,
    onUpdate,
    onDelete,
    openOnLoad,
}: { 
    creation: Creation; 
    locale: string;
    onUpdate?: (updatedCreation: Partial<Creation>) => void;
    onDelete?: (creationId: string) => void;
    openOnLoad?: boolean;
}) {
  const t = useTranslations('HomePage');
  const tEditor = useTranslations('Editor');
  const tCart = useTranslations('Cart');
  const [optimisticLikes, setOptimisticLikes] = useState(creation.likesCount);
  const { user, firebaseUser } = useAuth();
  const { toast } = useToast();
  const [isLikePending, startLikeTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  const { addToCart } = useCart();
  const [jewelryTypes, setJewelryTypes] = useState<Omit<JewelryType, 'icon'>[]>([]);
  const [allCharms, setAllCharms] = useState<Charm[]>([]);
  
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (openOnLoad) {
      setIsPreviewOpen(true);
    }
  }, [openOnLoad]);

  // Pre-fetch base data needed to add to cart
  React.useEffect(() => {
    const fetchBaseData = async () => {
         const JEWELRY_TYPES_INFO: Omit<JewelryType, 'models' | 'icon'>[] = [
            { id: 'necklace', name: "Colliers", description: "" },
            { id: 'bracelet', name: "Bracelets", description: "" },
            { id: 'earring', name: "Boucles d'oreilles", description: "" },
        ];
        const [types, charms] = await Promise.all([
            getJewelryTypesAndModels(JEWELRY_TYPES_INFO),
            getCharms()
        ]);
        setJewelryTypes(types);
        setAllCharms(charms);
    };
    fetchBaseData();
  }, []);

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!firebaseUser) {
      toast({
        variant: 'destructive',
        title: "Connexion requise",
        description: "Vous devez être connecté pour aimer une création.",
      });
      return;
    }

    const initialLikes = optimisticLikes;
    setOptimisticLikes(prev => prev + 1); // Optimistic update

    startLikeTransition(async () => {
        try {
            const idToken = await firebaseUser.getIdToken();
            const result = await toggleLikeCreation(creation.id, idToken);
            if (!result.success) {
                setOptimisticLikes(initialLikes); // Revert on error
                toast({ variant: 'destructive', title: "Erreur", description: result.message });
            } else if (result.newLikesCount !== undefined) {
                setOptimisticLikes(result.newLikesCount); // Sync with actual count
                if (onUpdate) onUpdate({ id: creation.id, likesCount: result.newLikesCount });
            }
        } catch (error) {
            setOptimisticLikes(initialLikes); // Revert on error
            toast({ variant: 'destructive', title: "Erreur", description: "Une erreur inattendue est survenue." });
        }
    });
  };
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const jewelryType = jewelryTypes.find(jt => jt.id === creation.jewelryTypeId);
    if (!jewelryType) {
        toast({ variant: 'destructive', title: 'Erreur', description: "Type de bijou non trouvé."});
        return;
    }

    const model = jewelryType.models.find(m => m.id === creation.modelId);
     if (!model) {
        toast({ variant: 'destructive', title: 'Erreur', description: "Modèle de base non trouvé."});
        return;
    }

    try {
        const placedCharms: PlacedCharm[] = creation.placedCharms.map(pc => {
            const fullCharm = allCharms.find(c => c.id === pc.charm.id);
            if (!fullCharm) {
                throw new Error(`La breloque avec l'ID ${pc.charm.id} est introuvable.`);
            }
            return {
                id: pc.id,
                charm: fullCharm,
                position: pc.position,
                rotation: pc.rotation,
            };
        });
        
        addToCart({
            model,
            jewelryType: { id: jewelryType.id, name: jewelryType.name, description: jewelryType.description },
            placedCharms,
            previewImage: creation.previewImageUrl,
            creationId: creation.id,
            creatorId: creation.creatorId,
            creatorName: creation.creatorName,
        });

        toast({
            title: "Ajouté au panier !",
            description: `La création "${creation.name}" est dans votre panier.`,
        });

    } catch (error: any) {
         toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    }
  }

  const handleDeleteClick = () => {
    if (!firebaseUser) {
        toast({ variant: 'destructive', title: "Non autorisé", description: "Vous devez être connecté." });
        return;
    }
    
    startDeleteTransition(async () => {
        try {
            const idToken = await firebaseUser.getIdToken();
            const result = await deleteCreation(idToken, creation.id);
            
            if (result.success) {
                toast({ title: "Succès", description: result.message });
                if (onDelete) onDelete(creation.id);
            } else {
                toast({ variant: 'destructive', title: "Erreur", description: result.message });
            }
        } catch (error) {
             toast({ variant: 'destructive', title: "Erreur", description: "Une erreur inattendue est survenue." });
        }
    });
};

  const handleShareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsShareOpen(true);
  };

  return (
    <>
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <Card className="overflow-hidden group flex flex-col h-full">
          <div className="relative">
              {user?.uid === creation.creatorId && onDelete && (
                  <div className="absolute top-2 right-2 z-10">
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="secondary" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="h-4 w-4" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                              <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Modifier
                              </DropdownMenuItem>
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <DropdownMenuItem
                                          className="text-destructive focus:text-destructive"
                                          onSelect={(e) => e.preventDefault()}
                                      >
                                          <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                                      </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                          <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer "{creation.name}" ?</AlertDialogTitle>
                                          <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                                          <AlertDialogAction
                                              onClick={handleDeleteClick}
                                              className="bg-destructive hover:bg-destructive/90"
                                              disabled={isDeletePending}
                                          >
                                              {isDeletePending ? <Loader2 className="animate-spin" /> : "Supprimer"}
                                          </AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                          </DropdownMenuContent>
                      </DropdownMenu>
                  </div>
              )}
              <DialogTrigger asChild>
                <div className="bg-muted/50 aspect-square relative overflow-hidden cursor-pointer">
                  <Image
                      src={creation.previewImageUrl}
                      alt={creation.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 33vw"
                      className="object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </DialogTrigger>
          </div>
          <CardContent className="p-4 flex-grow flex flex-col">
            <h3 className="font-headline text-lg truncate">{creation.name}</h3>
            <div className="flex justify-between items-center mt-1">
                <Link href={`/${locale}/creators/${creation.creatorId}`} className="contents">
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 hover:underline">
                        <User className="h-3 w-3" />
                        {creation.creatorName}
                    </p>
                </Link>
                <button
                    onClick={handleLikeClick}
                    disabled={isLikePending}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors disabled:cursor-not-allowed"
                >
                    {isLikePending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Heart className={cn("h-4 w-4", optimisticLikes > 0 && "text-primary fill-current")} />
                    )}
                    <span className="text-sm">{optimisticLikes}</span>
                </button>
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-0 grid grid-cols-2 gap-2">
             <Button variant="outline" size="sm" onClick={handleAddToCart} disabled={!allCharms.length}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                {tCart('checkout_button')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleShareClick}>
                <Share2 className="mr-2 h-4 w-4" />
                {tEditor('share_button')}
              </Button>
          </CardFooter>
        </Card>

        <DialogContent className="max-w-xl">
          <DialogHeader>
              <DialogTitle className="font-headline text-2xl">{creation.name}</DialogTitle>
              <DialogDescription>Par {creation.creatorName}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 -mx-6 sm:mx-0">
            <Image
                src={creation.previewImageUrl}
                alt={creation.name}
                width={800}
                height={800}
                className="w-full h-auto object-contain rounded-lg max-w-full max-h-[70vh]"
            />
          </div>
           <DialogFooter className="sm:justify-start gap-2">
              <Button onClick={handleAddToCart} disabled={!allCharms.length}>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {tEditor('add_to_cart_button')}
              </Button>
               <Button variant="outline" onClick={() => setIsShareOpen(true)}>
                  <Share2 className="mr-2 h-4 w-4" />
                  {tEditor('share_button')}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isShareOpen && (
         <ShareDialog
            isOpen={isShareOpen}
            onOpenChange={() => setIsShareOpen(false)}
            getCanvasDataUri={() => Promise.resolve(creation.previewImageUrl)}
            creation={creation}
            t={tEditor}
        />
      )}
      {isEditOpen && onUpdate && (
          <EditCreationDialog
            creation={creation}
            isOpen={isEditOpen}
            onOpenChange={setIsEditOpen}
            onUpdate={onUpdate}
           />
      )}
    </>
  );
}
