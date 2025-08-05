
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useTranslations } from '@/hooks/use-translations';
import { Loader2, Check, Send, ShoppingCart, AlertCircle, Award } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import Link from 'next/link';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { saveCreation } from '@/app/actions/creation.actions';
import { JewelryModel, PlacedCreationCharm, JewelryType } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

interface FinalizeCreationDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    getCanvasDataUri: () => Promise<string>;
    onConfirmAddToCart: (previewImage: string) => void;
    isEditing: boolean;
    placedCharms: PlacedCreationCharm[];
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

    const [step, setStep] = useState<'publish' | 'confirm'>(isEditing ? 'confirm' : 'publish');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [creationName, setCreationName] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    const [isLoadingPreview, setIsLoadingPreview] = useState(true);
    const [wasPublished, setWasPublished] = useState(false);

    const resetState = () => {
        setStep(isEditing ? 'confirm' : 'publish');
        setPreviewImage(null);
        setCreationName('');
        setIsPublishing(false);
        setIsLoadingPreview(true);
        setWasPublished(false);
    }
    
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
           // Reset state when closing the dialog
           setTimeout(resetState, 300);
        }
    }, [isOpen, getCanvasDataUri, onOpenChange, toast, isEditing]);

    const handlePublishAndContinue = async () => {
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
                charmId: pc.charmId,
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
                setWasPublished(true);
                setStep('confirm'); // Move to next step
            } else {
                toast({ variant: 'destructive', title: "Erreur de publication", description: result.message });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Erreur d'authentification", description: "Impossible de vérifier votre session. Veuillez vous reconnecter." });
        }

        setIsPublishing(false);
    };

    const handleSkipToPurchase = () => {
        setStep('confirm');
    }
    
    const handleAddToCartClick = () => {
        if (previewImage) {
            onConfirmAddToCart(previewImage);
        }
    }
    
    const getLoginRedirectUrl = () => {
        const serializedCharms = encodeURIComponent(JSON.stringify(
            placedCharms.map(pc => ({ id: pc.charmId, x: pc.position.x, y: pc.position.y, r: pc.rotation }))
        ));
        return `/${locale}/connexion?redirect=/&type=${jewelryType.id}&model=${model.id}&charms=${serializedCharms}`;
    }

    const renderContent = () => {
        if (isLoadingPreview || !previewImage) {
             return (
                <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
                    <Loader2 className="animate-spin h-8 w-8 text-primary" />
                </div>
            );
        }
        
        if (step === 'publish') {
            return (
                <>
                <DialogHeader>
                    <DialogTitle>{t('publish_title')}</DialogTitle>
                    <DialogDescription>{t('publish_description_new')}</DialogDescription>
                </DialogHeader>
                <div className="my-4 grid place-items-center">
                    <Image src={previewImage} alt={t('preview_alt')} width={300} height={300} className="rounded-lg border bg-muted/50 max-w-[75%] sm:max-w-full h-auto" />
                </div>
                {!firebaseUser ? (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>{t('publish_login_required_title')}</AlertTitle>
                        <AlertDescription>
                            {t('publish_login_required_desc')}{' '}
                            <Link href={getLoginRedirectUrl()} className="font-bold underline">
                                {t('publish_login_link')}
                            </Link>
                            .
                        </AlertDescription>
                    </Alert>
                ) : (
                    <div className="space-y-4">
                        <Accordion type="single" collapsible>
                            <AccordionItem value="item-1">
                                <AccordionTrigger className="text-sm font-semibold text-primary hover:no-underline">
                                    <div className="flex items-center gap-2">
                                         <Award className="h-4 w-4"/>
                                        {t('publish_incentive_title')}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-muted-foreground">
                                        <li>{t('publish_incentive_line1')}</li>
                                        <li>{t('publish_incentive_line2')}</li>
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                         <div className="space-y-2">
                            <Label htmlFor="creationName">{t('creation_name_label')}</Label>
                            <Input id="creationName" value={creationName} onChange={(e) => setCreationName(e.target.value)} placeholder={t('creation_name_placeholder')} />
                        </div>
                    </div>
                )}
                 <DialogFooter className="flex-col gap-2 mt-4">
                     {firebaseUser && (
                        <Button onClick={handlePublishAndContinue} className="w-full" disabled={isPublishing || !creationName.trim()}>
                            {isPublishing && <Loader2 className="animate-spin mr-2" />}
                            <Send className="mr-2 h-4 w-4" />
                            {t('publish_button')}
                        </Button>
                     )}
                     <Button variant="ghost" onClick={handleSkipToPurchase} className="w-full text-sm">
                        {t('skip_publish_button')}
                    </Button>
                </DialogFooter>
                </>
            )
        }
        
        if (step === 'confirm') {
             return (
                <>
                <DialogHeader>
                    <DialogTitle>{isEditing ? t('confirm_update_title') : t('buy_title')}</DialogTitle>
                    {wasPublished && <DialogDescription>{t('publish_success_message')}</DialogDescription>}
                </DialogHeader>
                <div className="my-4 grid place-items-center">
                    <Image src={previewImage} alt={t('preview_alt')} width={300} height={300} className="rounded-lg border bg-muted/50 max-w-[75%] sm:max-w-full h-auto" />
                </div>
                <DialogFooter className="flex-col gap-2">
                    <Button onClick={handleAddToCartClick} className="w-full" disabled={!previewImage}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        {isEditing ? t('update_item_button') : t('add_to_cart_button')}
                    </Button>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                        {t('close_button')}
                    </Button>
                </DialogFooter>
                </>
             )
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                {renderContent()}
            </DialogContent>
        </Dialog>
    );
}
