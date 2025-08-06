

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { updateUserProfile, deleteUserAccount } from '@/app/actions/auth.actions';
import { useToast } from '@/hooks/use-toast';
import { BrandLogo } from './icons';
import { Button } from './ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, UserCircle, UploadCloud, AlertCircle, ShieldAlert } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
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
import { useTranslations } from '@/hooks/use-translations';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer les modifications
        </Button>
    )
}

const initialState = { success: false, message: '' };

export function AccountSettingsClient({ locale }: { locale: string }) {
    const { user, firebaseUser, loading: authLoading, signOut } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const t = useTranslations('Auth');
    
    const [updateState, updateFormAction] = useFormState(updateUserProfile, initialState);
    
    const [displayName, setDisplayName] = useState('');
    const [photoURL, setPhotoURL] = useState<string | null>(null);
    const [newPhoto, setNewPhoto] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    useEffect(() => {
        if (updateState.success) {
            toast({ title: "Profil mis à jour", description: updateState.message });
        } else if (updateState.message) {
            toast({ variant: 'destructive', title: "Erreur", description: updateState.message });
        }
    }, [updateState, toast]);

    useEffect(() => {
        if (!authLoading) {
            if (!firebaseUser) {
                router.push(`/${locale}/connexion`);
            } else {
                setDisplayName(user?.displayName || firebaseUser.displayName || '');
                setPhotoURL(user?.photoURL || firebaseUser.photoURL || null);
            }
        }
    }, [authLoading, firebaseUser, user, router, locale]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                setPhotoURL(dataUrl); // For preview
                setNewPhoto(JSON.stringify({ dataUrl, name: file.name }));
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleDeleteAccount = async () => {
        if (!firebaseUser) return;
        setIsDeleting(true);
        try {
            const idToken = await firebaseUser.getIdToken();
            const result = await deleteUserAccount(idToken);
            if (result.success) {
                toast({ title: "Compte supprimé", description: "Votre compte a été supprimé avec succès." });
                await signOut();
                router.push(`/${locale}`);
            } else {
                toast({ variant: 'destructive', title: "Erreur", description: result.error });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "Erreur", description: "Une erreur inattendue est survenue." });
        } finally {
            setIsDeleting(false);
        }
    };


    if (authLoading || !firebaseUser) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    const fallbackDisplayName = displayName?.charAt(0) || firebaseUser.email?.charAt(0) || '?';

    return (
        <div className="flex flex-col min-h-screen bg-stone-50">
            <header className="p-4 border-b bg-white">
                <div className="container mx-auto flex justify-between items-center">
                    <Link href={`/${locale}`} className="flex items-center gap-2">
                        <BrandLogo className="h-8 w-auto" />
                    </Link>
                </div>
            </header>
            <main className="flex-grow p-4 md:p-8">
                <div className="container mx-auto max-w-2xl">
                    <div className="flex justify-start mb-8">
                        <Button variant="ghost" asChild>
                            <Link href={`/${locale}/profil`}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Retour au profil
                            </Link>
                        </Button>
                    </div>
                    
                    <div className="space-y-8">
                        <form action={updateFormAction}>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Paramètres du compte</CardTitle>
                                    <CardDescription>Gérez les informations de votre profil public.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {updateState && !updateState.success && updateState.message && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertTitle>Erreur</AlertTitle>
                                            <AlertDescription>{updateState.message}</AlertDescription>
                                        </Alert>
                                    )}
                                    <input type="hidden" name="uid" value={firebaseUser.uid} />
                                    <input type="hidden" name="newPhoto" value={newPhoto || ''} />
                                    <input type="hidden" name="originalPhotoURL" value={user?.photoURL || firebaseUser.photoURL || ''} />
                                    <div className="space-y-2">
                                        <Label htmlFor="displayName">Nom d'affichage</Label>
                                        <Input 
                                            id="displayName" 
                                            name="displayName"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            required
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Ce nom sera visible par les autres utilisateurs sur la plateforme.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Photo de profil</Label>
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-20 w-20">
                                                <AvatarImage src={photoURL || undefined} alt="Avatar" />
                                                <AvatarFallback className="text-3xl">{fallbackDisplayName.toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="relative">
                                                <Button type="button" variant="outline" asChild>
                                                    <label htmlFor="photo-upload" className="cursor-pointer">
                                                        <UploadCloud className="mr-2 h-4 w-4" />
                                                        Changer de photo
                                                    </label>
                                                </Button>
                                                <input 
                                                    id="photo-upload" 
                                                    type="file" 
                                                    className="sr-only" 
                                                    accept="image/png, image/jpeg, image/webp"
                                                    onChange={handleFileChange}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <SubmitButton />
                                </CardFooter>
                            </Card>
                        </form>
                        
                        <Separator />
                        
                        <Card className="border-destructive">
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-destructive">
                                    <ShieldAlert /> {t('danger_zone_title')}
                                </CardTitle>
                                <CardDescription>{t('danger_zone_description')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">
                                   {t('delete_account_explanation')}
                                </p>
                            </CardContent>
                            <CardFooter>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive">
                                            {t('delete_account_button')}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t('delete_account_confirm_title')}</AlertDialogTitle>
                                            <AlertDialogDescription>{t('delete_account_confirm_description')}</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleDeleteAccount}
                                                disabled={isDeleting}
                                                className="bg-destructive hover:bg-destructive/90"
                                            >
                                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                {t('delete_account_confirm_button')}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
