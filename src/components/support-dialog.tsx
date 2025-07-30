
'use client';

import React from 'react';
import { useTranslations } from '@/hooks/use-translations';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Copy, Mail, LifeBuoy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@example.com';

export function SupportDialog() {
  const t = useTranslations('HomePage');
  const { toast } = useToast();

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(SUPPORT_EMAIL);
    toast({
      description: t('support_email_copied'),
    });
  };

  return (
    <Dialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <LifeBuoy className="h-6 w-6" />
                <span className="sr-only">{t('contact_support_link')}</span>
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('contact_support_link')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{t('support_dialog_title')}</DialogTitle>
          <DialogDescription>
            {t('support_dialog_description')}
          </DialogDescription>
        </DialogHeader>
        <div className="my-4 space-y-4">
            <p className="text-sm text-muted-foreground">{t('support_dialog_instructions')}</p>
            <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed bg-muted p-3 text-lg font-semibold text-center">
                <span>{SUPPORT_EMAIL}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyEmail}>
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
        </div>
        <DialogFooter className="sm:justify-start gap-2">
            <Button asChild>
                <a href={`mailto:${SUPPORT_EMAIL}`}>
                    <Mail className="mr-2 h-4 w-4" />
                    {t('support_open_mail_button')}
                </a>
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
