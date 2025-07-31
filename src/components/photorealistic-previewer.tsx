
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
import { JewelryType, JewelryModel, PlacedCharm } from '@/lib/types';
import { generatePhotorealisticPreviewAction, generatePhotorealisticPreviewActionV2 } from '@/app/actions';
import { PhotorealisticPreviewV2Input } from '@/ai/flows/photorealistic-preview-v2';

interface PhotorealisticPreviewerProps {
  jewelryType: Omit<JewelryType, 'models' | 'icon'>;
  model: JewelryModel;
  placedCharms: PlacedCharm[];
  getCanvasDataUri: () => Promise<string>;
}

export function PhotorealisticPreviewer({ jewelryType, model, placedCharms, getCanvasDataUri }: PhotorealisticPreviewerProps) {
  const [userPrompt, setUserPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const t = useTranslations('Editor');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setIsPreviewOpen(true);
    setResultImage(null);
    setSourceImage(null);

    try {
      const baseJewelryImageUri = model.editorImageUrl;
      setSourceImage(baseJewelryImageUri); // Show the base model as source

      const charmsWithUris = placedCharms.map((pc) => ({
        charmName: pc.charm.name,
        charmImageUri: pc.charm.imageUrl, // Pass URL directly
        position: pc.position
      }));
      
      const input: PhotorealisticPreviewV2Input = {
        baseJewelryImageUri,
        jewelryTypeName: jewelryType.name,
        charms: charmsWithUris,
        userPrompt
      };

      const result = await generatePhotorealisticPreviewActionV2(input);

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
    setSourceImage(null);
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('photorealistic_preview_modal_title')}</DialogTitle>
            <DialogDescription>
              {isLoading ? t('photorealistic_preview_modal_loading') : t('photorealistic_preview_modal_done')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 min-h-[300px] grid place-items-center bg-muted/50 rounded-lg p-4">
            {isLoading && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
            {error && (
                <Alert variant="destructive" className="w-full">
                    <AlertTitle>{t('toast_error_title')}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {resultImage && sourceImage && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <div>
                  <Label className="text-center block mb-2 font-semibold">Source</Label>
                  <Image 
                    src={sourceImage}
                    alt="Source design"
                    width={512}
                    height={512}
                    className="rounded-lg object-contain w-full h-auto border bg-white"
                  />
                </div>
                <div>
                  <Label className="text-center block mb-2 font-semibold">Résultat</Label>
                  <Image 
                    src={resultImage}
                    alt={t('photorealistic_preview_modal_title')} 
                    width={512}
                    height={512}
                    className="rounded-lg object-contain w-full h-auto border"
                  />
                </div>
              </div>
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
