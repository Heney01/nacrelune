
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useTranslations } from '@/hooks/use-translations';
import { Loader2, Copy, Camera } from 'lucide-react';
import Image from 'next/image';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { Creation } from '@/lib/types';

interface ShareDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    creation: Creation;
    locale: string;
}

export function ShareDialog({ isOpen, onOpenChange, creation, locale }: ShareDialogProps) {
    const t = useTranslations('Editor');
    const { toast } = useToast();
    const [isCapturing, setIsCapturing] = useState(false);
    const [shareUrl, setShareUrl] = useState('');

    useEffect(() => {
        if (creation.creatorId) {
            setShareUrl(`https://www.atelierabijoux.com/${locale}/creators/${creation.creatorId}?creation=${creation.id}`);
        }
    }, [locale, creation]);
    
    const creatorDisplayName = creation.creator?.displayName || 'un créateur anonyme';

    const handleDownloadPolaroid = useCallback(async () => {
        setIsCapturing(true);
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error("Impossible de créer le contexte du canvas.");
            }

            const scale = 2; // For higher resolution
            const width = 300 * scale;
            const height = 360 * scale;
            canvas.width = width;
            canvas.height = height;

            // 1. Draw white polaroid background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            
            // 2. Draw light gray background for the image
            const imagePadding = 20 * scale;
            const imageContainerSize = width - 2 * imagePadding;
            ctx.fillStyle = '#f3f4f6'; // Light gray background (e.g., Tailwind gray-100)
            ctx.fillRect(imagePadding, imagePadding, imageContainerSize, imageContainerSize);

            // 3. Draw creation image on top of the gray background
            const image = new window.Image();
            image.crossOrigin = 'Anonymous';
            image.src = creation.previewImageUrl;
            
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = () => reject(new Error("Impossible de charger l'image de la création."));
            });

            ctx.drawImage(image, imagePadding, imagePadding, imageContainerSize, imageContainerSize);
            
            // 4. Draw text
            const textYStart = imageContainerSize + imagePadding * 1.5;
            ctx.textAlign = 'center';

            // Creation Name
            ctx.fillStyle = '#1c1917'; // stone-800
            ctx.font = `bold ${18 * scale}px "Playfair Display", serif`;
            ctx.fillText(creation.name, width / 2, textYStart);

            // Creator Name
            ctx.fillStyle = '#78716c'; // stone-500
            ctx.font = `${12 * scale}px "Montserrat", sans-serif`;
            ctx.fillText(`par ${creatorDisplayName}`, width / 2, textYStart + 22 * scale);

            // URL
            ctx.fillStyle = '#a8a29e'; // stone-400
            ctx.font = `${10 * scale}px "Montserrat", sans-serif`;
            ctx.fillText('www.atelierabijoux.com', width / 2, textYStart + 55 * scale);


            // 5. Download the canvas image
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `${creation.name.replace(/ /g, '_')}.png`;
            link.click();

        } catch (error: any) {
             console.error("Capture error:", error);
             toast({ variant: "destructive", title: "Erreur de capture", description: error.message || t('share_error_generic') });
        } finally {
            setIsCapturing(false);
        }
    }, [creation, creatorDisplayName, t, toast]);
    
    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        toast({
            description: "Lien copié dans le presse-papiers !",
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>{t('share_creation_title')}</DialogTitle>
                    <DialogDescription>{t('share_creation_description')}</DialogDescription>
                </DialogHeader>

                <div className="flex justify-center items-center my-4">
                     <div className="shadow-lg w-full max-w-xs bg-white">
                        <div className="p-4">
                            <div className="bg-gray-100 aspect-square relative">
                                <Image 
                                    src={creation.previewImageUrl} 
                                    alt={creation.name} 
                                    fill
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <div className="pt-4 text-center">
                                <p className="font-headline text-lg text-stone-800 break-words">{creation.name}</p>
                                <p className="text-xs text-stone-500 mt-1">par {creatorDisplayName}</p>
                                <p className="text-[10px] text-stone-400 mt-4">www.atelierabijoux.com</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="share-link">Lien de partage direct</Label>
                    <div className="flex gap-2">
                        <Input id="share-link" value={shareUrl} readOnly />
                        <Button variant="outline" size="icon" onClick={handleCopyLink}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <DialogFooter>
                     <Button onClick={handleDownloadPolaroid} className="w-full" disabled={isCapturing}>
                        {isCapturing ? <Loader2 className="animate-spin mr-2" /> : <Camera className="mr-2 h-4 w-4" />}
                        {t('share_polaroid_button')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
