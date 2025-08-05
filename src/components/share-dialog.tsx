'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

interface ShareDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    creation: Creation;
    locale: string;
}

export function ShareDialog({ isOpen, onOpenChange, creation, locale }: ShareDialogProps) {
    const t = useTranslations('Editor');
    const { toast } = useToast();

    const [title, setTitle] = useState(creation.name);
    const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    const getCanvasDataUri = useCallback(async (): Promise<string> => {
        // This is a simplified version. In a real app, you might want to re-render
        // the creation on a hidden canvas to get a fresh image if it's dynamic.
        // For now, we assume the previewImageUrl is sufficient.
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
        setIsSharing(true);
        try {
            const response = await fetch(creation.previewImageUrl);
            const blob = await response.blob();
            const file = new File([blob], `${title}.png`, { type: blob.type });

            const shareData: ShareData = {
                title: title || t('share_default_title'),
                text: t('share_default_text'),
                url: window.location.href, // Or a direct link to the creation
                files: [file],
            };

            if (navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                throw new Error(t('share_not_supported'));
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
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