
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useTranslations } from '@/hooks/use-translations';
import { Loader2, Share2, Sparkles, Copy } from 'lucide-react';
import Image from 'next/image';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { generateShareContentAction } from '@/app/actions/ai.actions';
import { Creation } from '@/lib/types';
import html2canvas from 'html2canvas';
import { BrandLogo } from './icons';

interface ShareDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    creation: Creation;
    locale: string;
}

export function ShareDialog({ isOpen, onOpenChange, creation, locale }: ShareDialogProps) {
    const t = useTranslations('Editor');
    const { toast } = useToast();
    const polaroidRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);

    const handleShare = async () => {
        if (!polaroidRef.current) return;
        setIsSharing(true);
        try {
            const canvas = await html2canvas(polaroidRef.current, { 
                useCORS: true, 
                allowTaint: true,
                backgroundColor: '#ffffff' // Set a white background to avoid transparency issues
            });
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            
            if (!blob) {
                throw new Error("Impossible de générer l'image de partage.");
            }

            const file = new File([blob], `${creation.name.replace(/ /g, '_')}.png`, { type: 'image/png' });
            
            const shareUrl = `${window.location.origin}/${locale}/creators/${creation.creatorId}?creation=${creation.id}`;

            const shareData: ShareData = {
                title: creation.name || t('share_default_title'),
                text: t('share_default_text'),
                url: shareUrl,
                files: [file],
            };

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share(shareData);
            } else {
                 toast({ variant: "destructive", title: "Non supporté", description: t('share_not_supported') });
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error("Share error:", error);
                toast({ variant: "destructive", title: "Erreur de partage", description: error.message || t('share_error_generic') });
            }
        } finally {
            setIsSharing(false);
        }
    };
    
    const creatorDisplayName = creation.creator?.displayName || 'un créateur anonyme';


    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('share_creation_title')}</DialogTitle>
                    <DialogDescription>{t('share_creation_description')}</DialogDescription>
                </DialogHeader>

                <div className="flex justify-center items-center my-4">
                    <div ref={polaroidRef} className="p-4 bg-white shadow-lg w-full max-w-xs">
                        <div className="bg-stone-100 aspect-square relative">
                             <Image 
                                src={creation.previewImageUrl} 
                                alt={creation.name} 
                                fill
                                className="w-full h-full object-contain"
                                crossOrigin="anonymous"
                            />
                        </div>
                        <div className="pt-4 text-center">
                            <p className="font-headline text-xl text-stone-800 break-words">{creation.name}</p>
                            <p className="text-sm text-stone-500 mt-1">par {creatorDisplayName}</p>
                            <p className="text-xs text-stone-400 mt-4">www.atelierabijoux.com</p>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handleShare} className="w-full" disabled={isSharing || !navigator.share}>
                        {isSharing ? <Loader2 className="animate-spin mr-2" /> : <Share2 className="mr-2 h-4 w-4" />}
                        {t('share_button')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
