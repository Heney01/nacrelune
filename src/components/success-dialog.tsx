

'use client';

import React from 'react';
import { useTranslations } from '@/hooks/use-translations';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface SuccessDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  orderNumber: string;
  email: string;
}

export function SuccessDialog({ isOpen, onOpenChange, orderNumber, email }: SuccessDialogProps) {
  const t = useTranslations('Checkout');
  const tHome = useTranslations('HomePage');
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const handleCopy = () => {
    navigator.clipboard.writeText(orderNumber);
    toast({
      description: 'Numéro de commande copié !',
    });
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
        router.push(`/${locale}`);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" aria-hidden="true" />
          </div>
          <DialogTitle className="mt-4 text-center text-2xl font-headline">{t('success_title')}</DialogTitle>
          <DialogDescription className="text-center">
            {t('success_description', { email })}
          </DialogDescription>
        </DialogHeader>
        <div className="my-4">
          <div className="text-sm font-medium text-center text-muted-foreground">{t('success_order_number')}</div>
          <div className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-dashed bg-muted p-3 text-lg font-semibold text-center">
            <span>{orderNumber}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <DialogFooter className="sm:justify-center flex-col-reverse sm:flex-row gap-2">
           <Button type="button" variant="outline" asChild>
                <Link href={`/${locale}/orders/track?orderNumber=${orderNumber}`}>{tHome('track_order_link')}</Link>
           </Button>
          <Button type="button" onClick={() => handleOpenChange(false)}>
            Continuer mes achats
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
