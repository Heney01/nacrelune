

'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getUserCreations, toggleLikeCreation, deleteCreation, logout } from '@/app/actions';
import { Creation, JewelryModel, JewelryType, PlacedCharm, Charm } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, PlusCircle, Heart, MoreHorizontal, Trash2, ShoppingCart, LogOut, UserCircle, Award } from 'lucide-react';
import { BrandLogo } from './icons';
import { Button } from './ui/button';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useCart } from '@/hooks/use-cart';
import { getJewelryTypesAndModels, getCharms } from '@/lib/data';
import { CartWidget } from './cart-widget';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';


function UserNav({ locale }: { locale: string }) {
    const { user, firebaseUser } = useAuth();
    const t = useTranslations('HomePage');
    const tAuth = useTranslations('Auth');

    if (!firebaseUser) {
        return (
            <Button asChild variant="ghost" size="icon">
                <Link href={`/${locale}/connexion`}>
                    <UserCircle className="h-6 w-6" />
                    <span className="sr-only">{tAuth('login_button')}</span>
                </Link>
            </Button>
        )
    }
    
    const fallbackDisplayName = user?.displayName?.charAt(0) || firebaseUser?.email?.charAt(0) || '?';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.photoURL || firebaseUser.photoURL || undefined} alt={user?.displayName || 'Avatar'} />
                        <AvatarFallback>{fallbackDisplayName.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="sr-only">{t('profile_menu_button')}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.displayName || firebaseUser.email}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user?.email || firebaseUser.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                     <Link href={`/${locale}/profil`}>{tAuth('my_creations')}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={logout}>
                    <input type="hidden" name="locale" value={locale} />
                    <DropdownMenuItem asChild>
                        <button type="submit" className="w-full">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>{tAuth('logout_button')}</span>
                        </button>
                    </DropdownMenuItem>
                </form>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export function ProfileClient({ locale }: { locale: string }) {
    const { user, firebaseUser, loading: authLoading } = useAuth();
    const [creations, setCreations] = useState<Creation[] | null>(null);
    const [loadingCreations, setLoadingCreations] = useState(true);
    const router = useRouter();
    const t = useTranslations('Auth');
    const tEditor = useTranslations('Editor');
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const { addToCart } = useCart();
    
    // State to hold all base models and charms for cart logic
    const [jewelryTypes, setJewelryTypes] = useState<Omit<JewelryType, 'icon'>[]>([]);
    const [allCharms, setAllCharms] = useState<Charm[]>([]);


    useEffect(() => {
        if (authLoading) {
            return;
        }
        if (!firebaseUser) {
            router.push(`/${locale}/connexion`);
            return;
        }

        const fetchCreations = async () => {
            setLoadingCreations(true);
            const userCreations = await getUserCreations(firebaseUser.uid);
            setCreations(userCreations);
            setLoadingCreations(false);
        };

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
        
        fetchCreations();
        fetchBaseData();

    }, [authLoading, firebaseUser, router, locale]);
    
    const handleLikeClick = async (creationId: string) => {
        if (!firebaseUser) {
            toast({
                variant: 'destructive',
                title: "Vous n'êtes pas connecté",
                description: "Vous devez être connecté pour aimer une création.",
            });
            return;
        }
        
        const currentCreation = creations?.find(c => c.id === creationId);
        if (!currentCreation) return;

        startTransition(async () => {
            try {
                const idToken = await firebaseUser.getIdToken();
                const result = await toggleLikeCreation(creationId, idToken);
                if (result.success && result.newLikesCount !== undefined) {
                     setCreations(prev => 
                        prev!.map(c => 
                            c.id === creationId ? { ...c, likesCount: result.newLikesCount! } : c
                        )
                    );
                }
                else {
                    toast({
                        variant: 'destructive',
                        title: "Erreur",
                        description: result.message,
                    });
                }
            } catch (error) {
                 toast({
                    variant: 'destructive',
                    title: "Erreur",
                    description: "Une erreur inattendue est survenue.",
                });
            }
        });
    };

    const handleDeleteClick = (creationId: string) => {
        if (!firebaseUser) {
            toast({ variant: 'destructive', title: "Non autorisé", description: "Vous devez être connecté." });
            return;
        }
        
        startTransition(async () => {
            try {
                const idToken = await firebaseUser.getIdToken();
                const result = await deleteCreation(idToken, creationId);
                
                if (result.success) {
                    toast({ title: "Succès", description: result.message });
                    // Optimistic update: remove from local state
                    setCreations(prev => prev ? prev.filter(c => c.id !== creationId) : null);
                } else {
                    toast({ variant: 'destructive', title: "Erreur", description: result.message });
                }
            } catch (error) {
                 toast({ variant: 'destructive', title: "Erreur", description: "Une erreur inattendue est survenue." });
            }
        });
    };
    
    const handleAddToCart = (creation: Creation) => {
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

        const placedCharms: PlacedCharm[] = creation.placedCharms.map(pc => {
            const fullCharm = allCharms.find(c => c.id === pc.charm.id);
            if (!fullCharm) {
                // This should not happen if data is consistent
                throw new Error(`Charm with ID ${pc.charm.id} not found in allCharms list.`);
            }
            return {
                id: pc.id,
                charm: fullCharm,
                position: pc.position,
                rotation: pc.rotation,
            };
        }).filter(Boolean);
        
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
    }


    if (authLoading || loadingCreations) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }
    
    if (!firebaseUser) {
        return null; // Should be redirected, but as a fallback.
    }

    return (
        <div className="flex flex-col min-h-screen bg-stone-50">
             <header className="p-4 border-b bg-white">
                <div className="container mx-auto flex justify-between items-center">
                    <Link href={`/${locale}`} className="flex items-center gap-2">
                        <BrandLogo className="h-8 w-auto text-foreground" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <CartWidget />
                        <UserNav locale={locale} />
                    </div>
                </div>
            </header>
            <main className="flex-grow p-4 md:p-8">
                <div className="container mx-auto">
                     <div className="flex justify-start mb-8">
                        <Button variant="ghost" asChild>
                            <Link href={`/${locale}`}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Retour à la création
                            </Link>
                        </Button>
                    </div>
                    <div className="flex items-center gap-4 mb-2">
                         <h1 className="text-3xl font-headline">{user?.displayName || 'Mon Profil'}</h1>
                         <div className="flex items-center gap-2 text-primary font-bold bg-primary/10 px-3 py-1.5 rounded-full">
                            <Award className="h-5 w-5"/>
                            <span>{user?.rewardPoints || 0}</span>
                         </div>
                    </div>
                    <p className="text-muted-foreground mb-8">Retrouvez ici toutes les créations que vous avez publiées.</p>

                   {(creations && creations.length > 0) ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {creations.map(creation => (
                                <Dialog key={creation.id}>
                                    <Card className="flex flex-col group">
                                         <div className="relative">
                                            {firebaseUser?.uid === creation.creatorId && (
                                                <div className="absolute top-2 right-2 z-10">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="secondary" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem disabled>Modifier</DropdownMenuItem>
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
                                                                        <AlertDialogDescription>
                                                                            Cette action est irréversible. Votre création sera définitivement supprimée.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => handleDeleteClick(creation.id)}
                                                                            className="bg-destructive hover:bg-destructive/90"
                                                                            disabled={isPending}
                                                                        >
                                                                            {isPending ? <Loader2 className="animate-spin" /> : "Supprimer"}
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            )}
                                            <DialogTrigger asChild>
                                                <CardHeader className="p-0 relative cursor-pointer">
                                                    <div className="aspect-square relative w-full bg-muted/50">
                                                        <Image 
                                                            src={creation.previewImageUrl} 
                                                            alt={creation.name} 
                                                            fill 
                                                            className="object-contain"
                                                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                                                        />
                                                    </div>
                                                </CardHeader>
                                            </DialogTrigger>
                                        </div>
                                        <CardContent className="p-4 flex-grow">
                                            <CardTitle className="text-base font-headline">{creation.name}</CardTitle>
                                            {creation.description && <CardDescription className="text-xs mt-1">{creation.description}</CardDescription>}
                                        </CardContent>
                                        <CardFooter className="p-4 pt-0 flex justify-between items-center">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddToCart(creation);
                                                }}
                                            >
                                                <ShoppingCart className="h-4 w-4" />
                                                <span className="sr-only">Ajouter au panier</span>
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="flex items-center gap-1.5 text-muted-foreground hover:text-primary"
                                                onClick={() => handleLikeClick(creation.id)}
                                                disabled={isPending}
                                            >
                                                <Heart className={cn("h-4 w-4", (creation.likesCount || 0) > 0 && "text-primary fill-current")} />
                                                <span className="font-mono text-sm">{creation.likesCount || 0}</span>
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                     <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>{creation.name}</DialogTitle>
                                            <DialogDescription>
                                                {creation.description || `Une création de ${creation.creatorName}`}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="mt-4 grid place-items-center">
                                            <Image 
                                                src={creation.previewImageUrl} 
                                                alt={creation.name} 
                                                width={800}
                                                height={800}
                                                className="w-full h-auto object-contain rounded-lg max-w-full max-h-[80vh]"
                                                sizes="100vw"
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button className="w-full" onClick={() => handleAddToCart(creation)}>
                                                <ShoppingCart className="mr-2 h-4 w-4" />
                                                {tEditor('add_to_cart_button')}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            ))}
                        </div>
                   ) : (
                       <div className="text-center py-16 border border-dashed rounded-lg">
                           <h3 className="text-xl font-semibold">Aucune création publiée</h3>
                           <p className="text-muted-foreground mt-2">Il est temps de laisser parler votre créativité !</p>
                           <Button asChild className="mt-6">
                               <Link href={`/${locale}`}>
                                   <PlusCircle className="mr-2 h-4 w-4" />
                                   Créer un bijou
                               </Link>
                           </Button>
                       </div>
                   )}
                </div>
            </main>
        </div>
    );
}
