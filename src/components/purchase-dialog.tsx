
"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { useTranslations, useRichTranslations } from '@/hooks/use-translations';
import { ShoppingCart, Loader2, Download, PartyPopper, ArrowLeft, CreditCard, CheckCircle } from 'lucide-react';
import { JewelryModel, PlacedCharm, Order } from '@/lib/types';
import { getGeneratedJewelryImage, createOrder } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from './ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

type Step = 'preview' | 'shipping' | 'payment' | 'confirmation';

const ShippingSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  address: z.string().min(5, { message: "Address must be at least 5 characters." }),
  city: z.string().min(2, { message: "City must be at least 2 characters." }),
  zip: z.string().min(3, { message: "ZIP code must be at least 3 characters." }),
  country: z.string().min(2, { message: "Country must be at least 2 characters." }),
});

interface PurchaseDialogProps {
    model: JewelryModel;
    placedCharms: PlacedCharm[];
    locale: string;
}

export function PurchaseDialog({ model, placedCharms, locale }: PurchaseDialogProps) {
    const t = useTranslations('Editor');
    const tRich = useRichTranslations();
    const { toast } = useToast();

    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<Step>('preview');
    const [orderId, setOrderId] = useState<string | null>(null);

    const form = useForm<z.infer<typeof ShippingSchema>>({
      resolver: zodResolver(ShippingSchema),
      defaultValues: {
        name: "",
        address: "",
        city: "",
        zip: "",
        country: "",
      },
    });

    const handleGenerateImage = async () => {
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const result = await getGeneratedJewelryImage({
                modelName: model.name,
                modelImage: model.displayImageUrl,
                charms: placedCharms.map(pc => ({ name: pc.charm.name })),
                locale: locale,
            });

            setGeneratedImage(result.imageUrl);

        } catch (err) {
            console.error(err);
            setError(t('error_generating_purchase_image'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleShippingSubmit = async (values: z.infer<typeof ShippingSchema>) => {
      setIsLoading(true);
      try {
        const orderData: Omit<Order, 'id' | 'createdAt'> = {
            modelName: model.name,
            modelImage: model.displayImageUrl,
            charms: placedCharms.map(pc => ({ name: pc.charm.name, imageUrl: pc.charm.imageUrl })),
            shippingInfo: values,
        };
        const result = await createOrder(orderData);
        setOrderId(result.id);
        setStep('payment');
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not save your order. Please try again.",
        })
      } finally {
        setIsLoading(false);
      }
    };
    
    const handlePaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate payment processing
        setTimeout(() => {
            setIsLoading(false);
            setStep('confirmation');
        }, 1500);
    }

    const resetDialog = () => {
        setGeneratedImage(null);
        setError(null);
        setIsLoading(false);
        setStep('preview');
        setOrderId(null);
        form.reset();
    }

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            resetDialog();
        }
    }
    
    const goBack = () => {
        if (step === 'shipping') setStep('preview');
        if (step === 'payment') setStep('shipping');
    }

    const getTitle = () => {
        switch(step) {
            case 'preview':
                return generatedImage ? t('purchase_complete_title') : t('purchase_dialog_title');
            case 'shipping':
                return "Enter Shipping Details";
            case 'payment':
                return "Payment Information";
            case 'confirmation':
                return "Order Confirmed!";
            default:
                return "";
        }
    }

    const getDescription = () => {
         switch(step) {
            case 'preview':
                return generatedImage ? t('purchase_complete_description') : t('purchase_dialog_description');
            case 'shipping':
                return "We need your address to ship your masterpiece.";
            case 'payment':
                return "Enter your credit card details below.";
            case 'confirmation':
                return `Thank you for your purchase! Your order ID is #${orderId}. We will notify you when it ships.`;
            default:
                return "";
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {t('purchase_button')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    {step !== 'preview' && (
                        <Button variant="ghost" size="icon" className="absolute top-3 left-3 h-7 w-7" onClick={goBack}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <DialogTitle className="font-headline text-2xl text-center pt-2">
                        {getTitle()}
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        {getDescription()}
                    </DialogDescription>
                </DialogHeader>
                
                {/* Step: Preview */}
                {step === 'preview' && (
                    <div className="my-4 flex items-center justify-center">
                        {isLoading && (
                            <div className="flex flex-col items-center gap-4 text-center">
                                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                                <p className="text-muted-foreground">{t('generating_image_message')}</p>
                            </div>
                        )}
                        {error && (
                             <Alert variant="destructive">
                                <AlertTitle>{t('error_title')}</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        {generatedImage && (
                            <div className="flex flex-col items-center gap-4 text-center">
                                <Image src={generatedImage} alt={t('generated_image_alt')} width={400} height={400} className="rounded-lg border shadow-lg" />
                                <a href={generatedImage} download={`nacrelune-creation.png`}>
                                    <Button variant="outline">
                                        <Download className="mr-2 h-4 w-4" />
                                        {t('download_image_button')}
                                    </Button>
                                </a>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Step: Shipping */}
                {step === 'shipping' && (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleShippingSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="address" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="city" render={({ field }) => (
                              <FormItem>
                                <FormLabel>City</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={form.control} name="zip" render={({ field }) => (
                              <FormItem>
                                <FormLabel>ZIP Code</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />
                        </div>
                         <FormField control={form.control} name="country" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" /> : "Continue to Payment"}
                        </Button>
                      </form>
                    </Form>
                )}

                {/* Step: Payment */}
                {step === 'payment' && (
                    <form onSubmit={handlePaymentSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                           <Label htmlFor="card-number">Card Number</Label>
                           <Input id="card-number" placeholder="0000 0000 0000 0000" />
                        </div>
                         <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="expiry">Expiry</Label>
                                <Input id="expiry" placeholder="MM/YY" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cvc">CVC</Label>
                                <Input id="cvc" placeholder="123" />
                            </div>
                         </div>
                         <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" /> : `Pay & Complete Order`}
                         </Button>
                    </form>
                )}

                {/* Step: Confirmation */}
                {step === 'confirmation' && (
                    <div className="py-4 flex flex-col items-center text-center">
                        <CheckCircle className="h-20 w-20 text-green-500 mb-4" />
                        <p className="text-lg font-semibold mb-2">Thank you!</p>
                        <p className="text-muted-foreground">Your order has been placed successfully.</p>
                         <p className="text-muted-foreground mt-2 text-sm">Order ID: #{orderId}</p>
                         <DialogClose asChild>
                            <Button className="mt-6 w-full">Close</Button>
                         </DialogClose>
                    </div>
                )}

                {/* Footer buttons */}
                <DialogFooter className="sm:justify-start">
                     {step === 'preview' && !isLoading && !generatedImage && (
                        <Button type="button" className="w-full" onClick={handleGenerateImage}>
                           <PartyPopper className="mr-2 h-4 w-4" />
                           {t('generate_final_image_button')}
                        </Button>
                    )}
                    {step === 'preview' && generatedImage && (
                        <Button type="button" className="w-full" onClick={() => setStep('shipping')}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Proceed to Checkout
                        </Button>
                    )}
                    {step !== 'confirmation' && (
                         <DialogClose asChild>
                            <Button type="button" variant="secondary" className="w-full">
                                {tRich(step === 'preview' ? 'Editor.purchase_dialog_action' : 'HomePage.back_button')}
                            </Button>
                        </DialogClose>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    