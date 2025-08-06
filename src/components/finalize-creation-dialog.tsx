

'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useTranslations } from '@/hooks/use-translations';
import { Loader2, Check, Send, ShoppingCart, AlertCircle, Award, Share2 } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { saveCreation } from '@/app/actions/creation.actions';
import { purchaseCreationSlot } from '@/app/actions/user.actions';
import { JewelryModel, PlacedCreationCharm, JewelryType, Creation } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { useAuthDialog } from '@/hooks/use-auth-dialog';
import { ShareDialog } from './share-dialog';

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
    const { user, firebaseUser } = useAuth();
    const { open: openAuthDialog } = useAuthDialog();
    const { toast } = useToast();

    const [step, setStep] = useState<'publish' | 'confirm'>(isEditing ? 'confirm' : 'publish');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [creationName, setCreationName] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    const [isLoadingPreview, setIsLoadingPreview] = useState(true);
    const [publishedCreation, setPublishedCreation] = useState<Creation | null>(null);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [publishError, setPublishError] = useState<{message: string, reason?: string} | null>(null);
    const [isBuyingSlot, setIsBuyingSlot] = useState(false);

    const resetState = () => {
        setStep(isEditing ? 'confirm' : 'publish');
        setPreviewImage(null);
        setCreationName('');
        setIsPublishing(false);
        setIsLoadingPreview(true);
        setPublishedCreation(null);
        setPublishError(null);
        setIsBuyingSlot(false);
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
           setTimeout(resetState, 300);
        }
    }, [isOpen, getCanvasDataUri, onOpenChange, toast, isEditing]);

    const handlePublishAndContinue = async () => {
        if (!previewImage || !firebaseUser) {
            openAuthDialog('login');
            return;
        }
        if (!creationName.trim()) {
            toast({ variant: 'destructive', title: "Nom manquant", description: "Veuillez donner un nom à votre création." });
            return;
        }

        setIsPublishing(true);
        setPublishError(null);

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

            if (result.success && result.creationId) {
                toast({ title: "Publication réussie !", description: result.message });
                setPublishedCreation({
                    id: result.creationId,
                    name: creationName,
                    creatorId: firebaseUser.uid,
                    previewImageUrl: previewImage,
                    creator: user || undefined,
                    // Add other necessary fields with default/dummy values
                    jewelryTypeId: jewelryType.id,
                    modelId: model.id,
                    placedCharms: [], 
                    createdAt: new Date(),
                    salesCount: 0,
                    likesCount: 0,
                });
                setStep('confirm');
            } else {
                setPublishError({message: result.message, reason: result.reason});
                toast({ variant: 'destructive', title: "Erreur de publication", description: result.message });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Erreur d'authentification", description: "Impossible de vérifier votre session. Veuillez vous reconnecter." });
        }

        setIsPublishing(false);
    };

    const handlePurchaseSlot = async () => {
        if (!firebaseUser) return;
        setIsBuyingSlot(true);
        try {
            const idToken = await firebaseUser.getIdToken();
            const result = await purchaseCreationSlot(idToken);
            if(result.success) {
                toast({ title: "Succès", description: "Nouvel emplacement débloqué ! Vous pouvez maintenant publier votre création."});
                setPublishError(null); // Clear the error to allow publishing again
            } else {
                toast({ variant: 'destructive', title: "Erreur", description: result.message});
            }
        } catch (error: any) {
             toast({ variant: 'destructive', title: "Erreur", description: "Une erreur inattendue est survenue."});
        } finally {
            setIsBuyingSlot(false);
        }
    }

    const handleSkipToPurchase = () => {
        setStep('confirm');
    }
    
    const handleAddToCartClick = () => {
        if (previewImage) {
            onConfirmAddToCart(previewImage);
        }
    }
    
    const renderContent = () => {
        if (isLoadingPreview || !previewImage) {
             return (
                <div className="flex flex-col h-full">
                    <DialogHeader>
                        <DialogTitle>Finalisation</DialogTitle>
                    </DialogHeader>
                    <div className="flex-grow flex items-center justify-center">
                        <Loader2 className="animate-spin h-8 w-8 text-primary" />
                    </div>
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
                <div className="flex-grow my-4 space-y-4 flex flex-col min-h-0">
                    <div className="w-full max-w-[200px] mx-auto flex-shrink-0">
                        <Image src={previewImage} alt={t('preview_alt')} width={200} height={200} className="rounded-lg border bg-muted/50 w-full h-auto" />
                    </div>
                     <div className="w-full space-y-4 flex-grow flex flex-col justify-center">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1" className="border-b-0">
                                <AccordionTrigger className="text-sm font-semibold text-primary hover:no-underline [&>svg]:ml-1">
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
                        {!firebaseUser ? (
                             <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>{t('publish_login_required_title')}</AlertTitle>
                                <AlertDescription>
                                    {t('publish_login_required_desc')}{' '}
                                    <button type="button" onClick={() => openAuthDialog('login')} className="font-bold underline">
                                        {t('publish_login_link')}
                                    </button>
                                    .
                                </AlertDescription>
                            </Alert>
                        ) : publishError?.reason === 'limit_reached' ? (
                             <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>{t('creation_limit_title')}</AlertTitle>
                                <AlertDescription>
                                    {t('creation_limit_description')}
                                    {(user?.rewardPoints || 0) >= 50 && (
                                        <Button size="sm" className="mt-2 w-full" onClick={handlePurchaseSlot} disabled={isBuyingSlot}>
                                            {isBuyingSlot ? <Loader2 className="animate-spin mr-2"/> : <Award className="mr-2 h-4 w-4"/>}
                                            {t('unlock_slot_button')}
                                        </Button>
                                    )}
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <div className="space-y-2">
                                <Label htmlFor="creationName">{t('creation_name_label')}</Label>
                                <Input id="creationName" value={creationName} onChange={(e) => setCreationName(e.target.value)} placeholder={t('creation_name_placeholder')} />
                            </div>
                        )}
                    </div>
                </div>
                 <DialogFooter className="flex-col gap-2 pt-0 flex-shrink-0">
                     <Button onClick={handlePublishAndContinue} className="w-full" disabled={isPublishing || !firebaseUser || !creationName.trim() || !!publishError}>
                        {isPublishing && <Loader2 className="animate-spin mr-2" />}
                        <Send className="mr-2 h-4 w-4" />
                        {t('publish_button')}
                    </Button>
                    <Button variant="outline" onClick={handleSkipToPurchase} className="w-full">
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
                    {publishedCreation && <DialogDescription>{t('publish_success_message')}</DialogDescription>}
                </DialogHeader>
                <div className="my-4 grid place-items-center flex-grow overflow-y-auto">
                    <Image src={previewImage} alt={t('preview_alt')} width={300} height={300} className="rounded-lg border bg-muted/50 max-w-full h-auto max-h-full object-contain" />
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 flex-shrink-0">
                    {publishedCreation && (
                        <Button variant="secondary" onClick={() => setIsShareOpen(true)} className="w-full">
                            <Share2 className="mr-2 h-4 w-4" />
                            {t('share_button')}
                        </Button>
                    )}
                    <Button onClick={handleAddToCartClick} className="w-full" disabled={!previewImage}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        {isEditing ? t('update_item_button') : t('add_to_cart_button')}
                    </Button>
                </DialogFooter>
                </>
             )
        }
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="flex flex-col max-h-[90vh]">
                    {renderContent()}
                </DialogContent>
            </Dialog>
            {isShareOpen && publishedCreation && (
                <ShareDialog
                    isOpen={isShareOpen}
                    onOpenChange={setIsShareOpen}
                    creation={publishedCreation}
                    locale={locale}
                />
            )}
        </>
    );
}
