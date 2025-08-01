
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Share2, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';

interface ShareDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  getCanvasDataUri: () => Promise<string>;
  t: (key: string, values?: any) => string;
}

const Polaroid = React.forwardRef<HTMLDivElement, { creationImage: string, title: string, description: string }>(
  ({ creationImage, title, description }, ref) => (
    <div ref={ref} className="bg-white p-4 pb-2 shadow-lg rounded-sm" data-polaroid-container>
      <div className="bg-gray-200">
        <Image src={creationImage} alt="User creation" width={400} height={400} className="w-full h-auto object-contain" />
      </div>
      <div className="mt-3 text-center">
        <h3 className="font-caveat text-xl">{title || "Ma création"}</h3>
        {description && <p className="font-caveat text-base text-muted-foreground mt-1">{description}</p>}
      </div>
    </div>
  )
);
Polaroid.displayName = 'Polaroid';


export function ShareDialog({ isOpen, onOpenChange, getCanvasDataUri, t }: ShareDialogProps) {
  const [creationImage, setCreationImage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const polaroidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchImage = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const uri = await getCanvasDataUri();
          setCreationImage(uri);
        } catch (err) {
          console.error("Error getting canvas data URI:", err);
          setError(t('share_error_image'));
        } finally {
          setIsLoading(false);
        }
      };
      fetchImage();
    } else {
        // Reset state on close
        setCreationImage(null);
        setTitle('');
        setDescription('');
        setIsLoading(true);
        setError(null);
    }
  }, [isOpen, getCanvasDataUri, t]);

  const handleShare = async () => {
    if (!polaroidRef.current || !navigator.share) {
        setError(t('share_not_supported'));
        return;
    }
    
    setIsSharing(true);
    setError(null);

    try {
        const canvas = await html2canvas(polaroidRef.current, { 
            backgroundColor: null, 
            useCORS: true,
            allowTaint: true,
            scale: 2 // Higher scale for better quality
        });
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        
        if (!blob) {
            throw new Error("Could not create blob from canvas");
        }

        const file = new File([blob], 'ma-creation.png', { type: 'image/png' });

        await navigator.share({
            title: title || t('share_default_title'),
            text: description || t('share_default_text'),
            files: [file],
            url: window.location.origin
        });

    } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.error('Share error:', err);
          setError(t('share_error_generic'));
        }
    } finally {
        setIsSharing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('share_creation_title')}</DialogTitle>
          <DialogDescription>{t('share_creation_description')}</DialogDescription>
        </DialogHeader>

        <div className="my-4">
            {isLoading && <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin" /></div>}
            
            {creationImage && (
              <div className="space-y-4">
                <div className="grid place-items-center">
                    <Polaroid ref={polaroidRef} creationImage={creationImage} title={title} description={description} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="share-title">{t('share_title_label')}</Label>
                    <Input id="share-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('share_title_placeholder')} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="share-description">{t('share_description_label')}</Label>
                    <Textarea id="share-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('share_description_placeholder')} />
                </div>
              </div>
            )}
        </div>

        {error && <div className="text-destructive text-sm text-center my-2">{error}</div>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('close_button')}
          </Button>
          <Button onClick={handleShare} disabled={isLoading || isSharing || !creationImage || !navigator.share}>
            {isSharing ? <Loader2 className="animate-spin" /> : <Share2 />}
            {t('share_button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
