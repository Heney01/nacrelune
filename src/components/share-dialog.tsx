
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useTranslations } from '@/hooks/use-translations';
import { Loader2, Share2, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { generateShareContentAction } from '@/app/actions/ai.actions';
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

    const [title, setTitle] = useState(creation.name);
    const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    const getCanvasDataUri = useCallback(async (): Promise<string> => {
        return creation.previewImageUrl;
    }, [creation.previewImageUrl]);

    const handleGenerateTitle = async () => {
        setIsGeneratingTitle(true);
        try {
            const photoDataUri = await getCanvasDataUri();
            const result = await generateShareContentAction({ photoDataUri, locale });
            if (result.success && result.content?.title) {
                setTitle(result.content.title);
            } else {
                toast({ variant: "destructive", title: t('toast_error_title'), description: result.error });
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: t('toast_error_title'), description: error.message });
        } finally {
            setIsGeneratingTitle(false);
        }
    };
    
    const handleShare = async () => {
        if (!polaroidRef.current) return;
        setIsSharing(true);
        try {
            const canvas = await html2canvas(polaroidRef.current, { 
                useCORS: true, 
                allowTaint: true,
                backgroundColor: null 
            });
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            
            if (!blob) {
                throw new Error("Impossible de générer l'image de partage.");
            }

            const file = new File([blob], `${title.replace(/ /g, '_')}.png`, { type: 'image/png' });
            
            const shareUrl = `${window.location.origin}/${locale}/creators/${creation.creatorId}?creation=${creation.id}`;

            const shareData: ShareData = {
                title: title || t('share_default_title'),
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


    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('share_creation_title')}</DialogTitle>
                    <DialogDescription>{t('share_creation_description')}</DialogDescription>
                </DialogHeader>

                {/* Hidden Polaroid for screenshot */}
                <div className="absolute left-[-9999px] top-[-9999px]">
                    <div ref={polaroidRef} className="p-4 bg-white shadow-lg w-[400px]">
                        <div className="bg-stone-100">
                             <Image 
                                src={creation.previewImageUrl} 
                                alt={creation.name} 
                                width={400} 
                                height={400} 
                                className="w-full h-auto object-contain"
                                crossOrigin="anonymous"
                            />
                        </div>
                        <div className="pt-4 text-center">
                            <p className="font-headline text-2xl text-stone-800">{title}</p>
                            <p className="text-sm text-stone-500 mt-1">par {creation.creator?.displayName || 'un créateur anonyme'}</p>
                             <p className="text-xs text-stone-400 mt-4">www.nacrelune.com</p>
                        </div>
                    </div>
                </div>

                <div className="my-4 grid place-items-center">
                     <Image src={creation.previewImageUrl} alt={t('preview_alt')} width={250} height={250} className="rounded-lg border bg-muted/50 max-w-full h-auto" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="share-title">{t('share_title_label')}</Label>
                    <div className="flex gap-2">
                        <Input id="share-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('share_title_placeholder')} />
                         <Button variant="outline" onClick={handleGenerateTitle} disabled={isGeneratingTitle}>
                            {isGeneratingTitle ? <Loader2 className="animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        </Button>
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
