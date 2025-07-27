
"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { useTranslations } from '@/hooks/use-translations';
import { ShoppingCart, Loader2, Download, PartyPopper } from 'lucide-react';
import { JewelryModel, PlacedCharm } from '@/lib/types';
import { getGeneratedJewelryImage } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface PurchaseDialogProps {
    model: JewelryModel;
    placedCharms: PlacedCharm[];
    locale: string;
}

// Helper to convert an image URL to a data URI
async function toDataURI(url: string): Promise<string> {
  const response = await fetch(url, { mode: 'cors' });
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function PurchaseDialog({ model, placedCharms, locale }: PurchaseDialogProps) {
    const t = useTranslations('Editor');
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateImage = async () => {
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            // Convert all image URLs to data URIs
            const modelImageDaTaUri = await toDataURI(model.editorImageUrl);
            const charmsWithDataUris = await Promise.all(
                placedCharms.map(async (pc) => ({
                    name: pc.charm.name,
                    imageUrl: await toDataURI(pc.charm.imageUrl),
                    position: pc.position,
                }))
            );
            
            const result = await getGeneratedJewelryImage({
                modelName: model.name,
                modelImage: modelImageDaTaUri,
                charms: charmsWithDataUris,
                locale: locale,
            });

            setGeneratedImage(result.imageUrl);

        } catch (err) {
            console.error(err);
            setError(t('error_generating_purchase_image'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open) {
            // Reset state when dialog opens
            setGeneratedImage(null);
            setError(null);
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {t('purchase_button')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">
                        {generatedImage ? t('purchase_complete_title') : t('purchase_dialog_title')}
                    </DialogTitle>
                    <DialogDescription>
                        {generatedImage ? t('purchase_complete_description') : t('purchase_dialog_description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="my-4 flex items-center justify-center">
                    {isLoading && (
                        <div className="flex flex-col items-center gap-4 text-center">
                            <Loader2 className="h-16 w-16 animate-spin text-primary" />
                            <p className="text-muted-foreground">{t('generating_image_message')}</p>
                        </div>
                    )}
                    {error && (
                         <Alert variant="destructive">
                            <AlertTitle>{t('error_title')}</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    {generatedImage && (
                        <div className="flex flex-col items-center gap-4 text-center">
                            <Image src={generatedImage} alt={t('generated_image_alt')} width={400} height={400} className="rounded-lg border shadow-lg" />
                            <a href={generatedImage} download={`nacrelune-creation.png`}>
                                <Button variant="outline">
                                    <Download className="mr-2 h-4 w-4" />
                                    {t('download_image_button')}
                                </Button>
                            </a>
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-start">
                     {!isLoading && !generatedImage && (
                        <Button type="button" className="w-full" onClick={handleGenerateImage}>
                           <PartyPopper className="mr-2 h-4 w-4" />
                           {t('generate_final_image_button')}
                        </Button>
                    )}
                    <DialogClose asChild>
                        <Button type="button" variant="secondary" className="w-full">
                            {t('purchase_dialog_action')}
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
