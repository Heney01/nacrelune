
"use client";

import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useTranslations } from '@/hooks/use-translations';
import Image from 'next/image';
import { JewelryType } from '@/lib/types';
import { generatePhotorealisticPreviewAction } from '@/app/actions';

interface PhotorealisticPreviewerProps {
  jewelryType: Omit<JewelryType, 'models' | 'icon'>;
  getCanvasDataUri: () => Promise<string>;
}

export function PhotorealisticPreviewer({ jewelryType, getCanvasDataUri }: PhotorealisticPreviewerProps) {
  const [userPrompt, setUserPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const t = useTranslations('Editor');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setIsPreviewOpen(true);
    setResultImage(null);

    try {
      const designPreviewDataUri = await getCanvasDataUri();
      
      const result = await generatePhotorealisticPreviewAction({
        designPreviewDataUri,
        jewelryTypeName: jewelryType.name,
        userPrompt,
      });

      if (result.success && result.imageDataUri) {
        setResultImage(result.imageDataUri);
      } else {
        throw new Error(result.error || t('toast_error_title'));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsPreviewOpen(false);
    setResultImage(null);
    setError(null);
  }

  return (
    <>
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center gap-2">
              <ImageIcon className="text-primary" />
              {t('photorealistic_preview_title')}
            </CardTitle>
            <CardDescription>
              {t('photorealistic_preview_description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="userPrompt" className="font-bold">{t('photorealistic_preview_prompt_label')}</Label>
              <Textarea
                id="userPrompt"
                placeholder={t('photorealistic_preview_prompt_placeholder')}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                className="mt-2"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('generating_button')}</>
              ) : (
                <>{t('photorealistic_preview_button')}</>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Dialog open={isPreviewOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('photorealistic_preview_modal_title')}</DialogTitle>
            <DialogDescription>
              {isLoading ? t('photorealistic_preview_modal_loading') : t('photorealistic_preview_modal_done')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 min-h-[300px] grid place-items-center bg-muted/50 rounded-lg">
            {isLoading && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
            {error && (
                <Alert variant="destructive" className="w-full">
                    <AlertTitle>{t('toast_error_title')}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {resultImage && (
                <Image 
                    src={resultImage} 
                    alt={t('photorealistic_preview_modal_title')} 
                    width={1024}
                    height={1024}
                    className="rounded-lg object-contain w-full h-auto"
                />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>{t('close_button')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
