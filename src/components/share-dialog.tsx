
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Share2, AlertCircle, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import { generateShareContentAction } from '@/app/actions';
import { useParams } from 'next/navigation';

interface ShareDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  getCanvasDataUri: () => Promise<string>;
  t: (key: string, values?: any) => string;
}

const Polaroid = React.forwardRef<HTMLDivElement, { creationImage: string, title: string, description: string }>(
  ({ creationImage, title, description }, ref) => (
    <div ref={ref} className="bg-white p-4 shadow-lg rounded-sm" data-polaroid-container>
      <div className="bg-gray-200">
        <Image src={creationImage} alt="User creation" width={400} height={400} className="w-full h-auto object-contain" />
      </div>
      <div className="mt-3 text-center">
        <h3 className="font-caveat text-xl">{title || "Ma création"}</h3>
        {description && <p className="font-caveat text-base text-muted-foreground mt-1">{description}</p>}
        <p className="text-xs text-muted-foreground/50 mt-2 font-sans">www.atelierabijoux.com</p>
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
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const polaroidRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const locale = params.locale as string;

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

  const downloadImage = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = 'ma-creation.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleShare = async () => {
    if (!polaroidRef.current) {
        setError(t('share_error_generic'));
        return;
    }
    
    setIsSharing(true);
    setError(null);

    try {
        const canvas = await html2canvas(polaroidRef.current, { 
            backgroundColor: null, 
            useCORS: true,
            allowTaint: true,
            scale: 3
        });
        
        if (!navigator.share) {
            downloadImage(canvas);
            setIsSharing(false);
            return;
        }

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

    } catch (err: any) {
        if (err instanceof DOMException && (err.name === 'AbortError')) {
          // User cancelled the share sheet
        } else if (err instanceof DOMException && err.name === 'NotAllowedError') {
           console.warn("Share API permission denied, falling back to download.");
            try {
                const canvas = await html2canvas(polaroidRef.current!, { backgroundColor: null, useCORS: true, allowTaint: true, scale: 2 });
                downloadImage(canvas);
            } catch (downloadErr) {
                 console.error('Download fallback error:', downloadErr);
                 setError(t('share_error_generic'));
            }
        }
        else {
          console.error('Share error:', err);
          setError(t('share_error_generic'));
        }
    } finally {
        setIsSharing(false);
    }
  };

  const handleGenerateContent = async () => {
    if (!creationImage) return;

    setIsGeneratingContent(true);
    setError(null);

    try {
      const result = await generateShareContentAction({
        photoDataUri: creationImage,
        locale: locale,
      });

      if (result.success && result.content) {
        setTitle(result.content.title);
        setDescription(result.content.description);
      } else {
        throw new Error(result.error || t('ai_error_generic'));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingContent(false);
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
                    <div className="flex justify-between items-center">
                        <Label htmlFor="share-title">{t('share_title_label')}</Label>
                         <Button variant="ghost" size="sm" onClick={handleGenerateContent} disabled={isGeneratingContent}>
                             {isGeneratingContent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        </Button>
                    </div>
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
          <Button onClick={handleShare} disabled={isLoading || isSharing || isGeneratingContent || !creationImage}>
            {isSharing ? <Loader2 className="animate-spin" /> : <Share2 />}
            {t('share_button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
