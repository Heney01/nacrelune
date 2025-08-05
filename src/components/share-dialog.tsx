
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useTranslations } from '@/hooks/use-translations';
import { Loader2, Copy, Camera } from 'lucide-react';
import Image from 'next/image';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { Creation } from '@/lib/types';
import html2canvas from 'html2canvas';

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
    const [isCapturing, setIsCapturing] = useState(false);
    const [shareUrl, setShareUrl] = useState('');

    useEffect(() => {
        if (creation.creatorId) {
            setShareUrl(`https://www.atelierabijoux.com/${locale}/creators/${creation.creatorId}?creation=${creation.id}`);
        }
    }, [locale, creation]);

    const handleDownloadPolaroid = async () => {
        if (!polaroidRef.current) return;
        setIsCapturing(true);
        try {
            const canvas = await html2canvas(polaroidRef.current, { 
                useCORS: true, 
                allowTaint: true,
                backgroundColor: '#ffffff'
            });

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
    };
    
    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        toast({
            description: "Lien copié dans le presse-papiers !",
        });
    };

    const creatorDisplayName = creation.creator?.displayName || 'un créateur anonyme';


    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange} onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('share_creation_title')}</DialogTitle>
                    <DialogDescription>{t('share_creation_description')}</DialogDescription>
                </DialogHeader>

                <div className="flex justify-center items-center my-4">
                    <div ref={polaroidRef} className="p-4 bg-white shadow-lg w-full max-w-xs">
                        <div className="bg-white aspect-square relative">
                             <Image 
                                src={creation.previewImageUrl} 
                                alt={creation.name} 
                                fill
                                className="w-full h-full object-contain"
                                crossOrigin="anonymous"
                            />
                        </div>
                        <div className="pt-4 text-center bg-white">
                            <p className="font-headline text-xl text-stone-800 break-words">{creation.name}</p>
                            <p className="text-sm text-stone-500 mt-1">par {creatorDisplayName}</p>
                            <p className="text-xs text-stone-400 mt-4">www.atelierabijoux.com</p>
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
