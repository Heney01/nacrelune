
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useTranslations } from '@/hooks/use-translations';
import { Loader2, Check } from 'lucide-react';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import Link from 'next/link';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { saveCreation } from '@/app/actions/creation.actions';
import { JewelryModel, PlacedCharm, JewelryType } from '@/lib/types';

interface FinalizeCreationDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    getCanvasDataUri: () => Promise<string>;
    onConfirmAddToCart: (previewImage: string) => void;
    isEditing: boolean;
    placedCharms: PlacedCharm[];
    jewelryType: Omit<JewelryType, 'models' | 'icon'>;
    model: JewelryModel;
    locale: string;
}

export function FinalizeCreationDialog({ 
    isOpen, 
    onOpenChange, 
    getCanvasDataUri,
    onConfirmAddToCart,
    isEditing,
    placedCharms,
    jewelryType,
    model,
    locale,
}: FinalizeCreationDialogProps) {
    const t = useTranslations('Editor');
    const { firebaseUser } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [creationName, setCreationName] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    const [isLoadingPreview, setIsLoadingPreview] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setIsLoadingPreview(true);
            getCanvasDataUri()
                .then(setPreviewImage)
                .catch(error => {
                    console.error(error);
                    toast({
                        variant: "destructive",
                        title: "Erreur",
                        description: "Impossible de générer l'aperçu de la création.",
                    });
                    onOpenChange(false);
                })
                .finally(() => setIsLoadingPreview(false));
        } else {
            setPreviewImage(null);
        }
    }, [isOpen, getCanvasDataUri, onOpenChange, toast]);

    const handlePublish = async () => {
        if (!previewImage || !firebaseUser) {
            toast({ variant: 'destructive', title: "Non connecté", description: "Vous devez être connecté pour publier." });
            return;
        }
        if (!creationName.trim()) {
            toast({ variant: 'destructive', title: "Nom manquant", description: "Veuillez donner un nom à votre création." });
            return;
        }

        setIsPublishing(true);

        const creationPayload = {
            jewelryTypeId: jewelryType.id,
            modelId: model.id,
            placedCharms: placedCharms.map(pc => ({
                charmId: pc.charm.id,
                position: pc.position,
                rotation: pc.rotation
            })),
            previewImageUrl: previewImage,
        };

        try {
            const idToken = await firebaseUser.getIdToken();
            const result = await saveCreation(
                idToken,
                creationName,
                JSON.stringify(creationPayload)
            );

            if (result.success) {
                toast({ title: "Publication réussie !", description: result.message });
                onOpenChange(false);
                router.push(`/${locale}/profil`);
            } else {
                toast({ variant: 'destructive', title: "Erreur de publication", description: result.message });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Erreur d'authentification", description: "Impossible de vérifier votre session. Veuillez vous reconnecter." });
        }

        setIsPublishing(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('finalize_creation_title')}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? t('confirm_update_title') : t('confirm_add_description')}
                    </DialogDescription>
                </DialogHeader>
                <div className="my-4 grid place-items-center">
                    {isLoadingPreview || !previewImage ? (
                        <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
                            <Loader2 className="animate-spin" />
                        </div>
                    ) : (
                        <Image src={previewImage} alt={t('preview_alt')} width={300} height={300} className="rounded-lg border bg-muted/50 max-w-[75%] sm:max-w-full h-auto" />
                    )}
                </div>
                <Tabs defaultValue="buy" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="buy">{t('buy_tab')}</TabsTrigger>
                        <TabsTrigger value="publish">{t('publish_tab')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="buy">
                        <Card className="border-0 shadow-none">
                            <CardHeader>
                                <CardTitle>{t('buy_title')}</CardTitle>
                                <CardDescription>{t('buy_description')}</CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <Button onClick={() => onConfirmAddToCart(previewImage!)} className="w-full" disabled={!previewImage}>
                                    <Check className="mr-2 h-4 w-4" />
                                    {isEditing ? t('update_item_button') : t('add_to_cart_button')}
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                    <TabsContent value="publish">
                        <Card className="border-0 shadow-none">
                            <CardHeader>
                                <CardTitle>{t('publish_title')}</CardTitle>
                                <CardDescription>{t('publish_description')}</CardDescription>
                            </CardHeader>
                            {!firebaseUser ? (
                                <CardContent>
                                    <Alert>
                                        <AlertTitle>{t('publish_login_required_title')}</AlertTitle>
                                        <AlertDescription>
                                            {t('publish_login_required_desc')}{' '}
                                            <Link href={`/${locale}/connexion`} className="font-bold underline">
                                                {t('publish_login_link')}
                                            </Link>
                                            .
                                        </AlertDescription>
                                    </Alert>
                                </CardContent>
                            ) : (
                                <>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="creationName">{t('creation_name_label')}</Label>
                                        <Input id="creationName" value={creationName} onChange={(e) => setCreationName(e.target.value)} placeholder={t('creation_name_placeholder')} />
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button onClick={handlePublish} className="w-full" disabled={isPublishing || !creationName.trim()}>
                                        {isPublishing && <Loader2 className="animate-spin mr-2" />}
                                        {t('publish_button')}
                                    </Button>
                                </CardFooter>
                                </>
                            )}
                        </Card>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
