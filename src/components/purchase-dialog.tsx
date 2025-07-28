
"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { useTranslations } from '@/hooks/use-translations';
import { Loader2, CheckCircle, ArrowLeft, ShoppingBag } from 'lucide-react';
import { CartItem, Order } from '@/lib/types';
import { createOrder } from '@/app/actions';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from './ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Separator } from './ui/separator';
import Image from 'next/image';
import { ScrollArea } from './ui/scroll-area';

type Step = 'review' | 'shipping' | 'payment' | 'confirmation';

const ShippingSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  address: z.string().min(5, { message: "Address must be at least 5 characters." }),
  city: z.string().min(2, { message: "City must be at least 2 characters." }),
  zip: z.string().min(3, { message: "ZIP code must be at least 3 characters." }),
  country: z.string().min(2, { message: "Country must be at least 2 characters." }),
});

interface PurchaseDialogProps {
    cart: CartItem[];
    onSuccessfulOrder: () => void;
}

export function PurchaseDialog({ cart, onSuccessfulOrder }: PurchaseDialogProps) {
    const t = useTranslations('Editor.PurchaseDialog');
    const tGlobal = useTranslations('Editor');
    const { toast } = useToast();

    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<Step>('review');
    const [orderId, setOrderId] = useState<string | null>(null);

    const totalPrice = useMemo(() => {
        return cart.reduce((total, item) => total + item.price, 0);
    }, [cart]);


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

    const handleShippingSubmit = async (values: z.infer<typeof ShippingSchema>) => {
      setIsLoading(true);
      try {
        const orderData: Omit<Order, 'id' | 'createdAt'> = {
            items: cart.map(item => ({
                modelName: item.model.name,
                modelImage: item.model.displayImageUrl,
                charms: item.placedCharms.map(pc => ({ 
                    name: pc.charm.name, 
                    imageUrl: pc.charm.imageUrl,
                    price: pc.charm.price || 0,
                })),
                price: item.price,
            })),
            totalPrice: totalPrice,
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
            onSuccessfulOrder();
        }, 1500);
    }

    const resetDialog = () => {
        setIsLoading(false);
        setStep('review');
        setOrderId(null);
        form.reset();
    }

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            // Delay reset to allow animation to finish
            setTimeout(resetDialog, 300);
        }
    }
    
    const goBack = () => {
        if (step === 'payment') setStep('shipping');
        if (step === 'shipping') setStep('review');
    }

    const getTitle = () => {
        switch(step) {
            case 'review':
                return t('order_summary_title');
            case 'shipping':
                 return t('shipping_details_title');
            case 'payment':
                return t('payment_information_title');
            case 'confirmation':
                return t('order_confirmed_title');
            default:
                return "";
        }
    }
    
    const OrderSummary = () => (
      <div className="space-y-4 my-4">
        <ScrollArea className="max-h-64 pr-4">
        <div className="space-y-4">
            {cart.map(item => (
                 <div key={item.id} className="space-y-3 text-sm pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Image src={item.model.displayImageUrl} alt={item.model.name} width={40} height={40} className="rounded-md border bg-muted" data-ai-hint="jewelry" />
                            <span className="font-medium">{t('model_label', { modelName: item.model.name })}</span>
                        </div>
                      <span>{(item.model.price || 0).toFixed(2)}€</span>
                    </div>
                     {item.placedCharms.length > 0 && (
                        <div className="space-y-3 pl-4 border-l-2 border-dashed ml-5">
                            {item.placedCharms.map((pc) => (
                                <div key={pc.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Image src={pc.charm.imageUrl} alt={pc.charm.name} width={40} height={40} className="rounded-md border bg-muted p-1" data-ai-hint="jewelry charm" />
                                        <div>
                                            <span className="font-medium">{pc.charm.name}</span>
                                        </div>
                                    </div>
                                    <span>{((pc.charm.price || 0)).toFixed(2)}€</span>
                                </div>
                            ))}
                        </div>
                    )}
                  </div>
            ))}
        </div>
        </ScrollArea>
        <Separator />
        <div className="flex justify-between font-bold text-lg">
          <span>{t('total_label')}</span>
          <span>{totalPrice.toFixed(2)}€</span>
        </div>
      </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button disabled={cart.length === 0}>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    {tGlobal('checkout_button')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
                <DialogHeader>
                    {step !== 'review' && step !== 'confirmation' && (
                        <Button variant="ghost" size="icon" className="absolute top-3 left-3 h-7 w-7" onClick={goBack}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <DialogTitle className="font-headline text-2xl text-center pt-2">
                        {getTitle()}
                    </DialogTitle>
                </DialogHeader>
                
                <div className="flex-grow overflow-y-auto -mx-6 px-6">
                
                {step === 'review' && (
                  <>
                    <OrderSummary />
                    <Button onClick={() => setStep('shipping')} className="w-full">
                       {t('continue_to_shipping_button')}
                    </Button>
                  </>
                )}

                {step === 'shipping' && (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleShippingSubmit)} className="space-y-4 py-4">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('full_name_label')}</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('address_label')}</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="city" render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('city_label')}</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="zip" render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('zip_code_label')}</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                      </div>
                       <FormField control={form.control} name="country" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('country_label')}</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" className="w-full" disabled={isLoading}>
                          {isLoading ? <Loader2 className="animate-spin" /> : t('continue_to_payment_button')}
                      </Button>
                    </form>
                  </Form>
                )}

                {step === 'payment' && (
                    <form onSubmit={handlePaymentSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                           <Label htmlFor="card-number">{t('card_number_label')}</Label>
                           <Input id="card-number" placeholder="0000 0000 0000 0000" />
                        </div>
                         <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="expiry">{t('expiry_label')}</Label>
                                <Input id="expiry" placeholder="MM/YY" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cvc">{t('cvc_label')}</Label>
                                <Input id="cvc" placeholder="123" />
                            </div>
                         </div>
                         <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" /> : t('pay_button', { price: totalPrice.toFixed(2) })}
                         </Button>
                    </form>
                )}

                {step === 'confirmation' && (
                    <div className="py-4 flex flex-col items-center text-center">
                        <CheckCircle className="h-20 w-20 text-green-500 mb-4" />
                        <p className="text-lg font-semibold mb-2">{t('thank_you_message')}</p>
                        <p className="text-muted-foreground">{t('order_placed_message')}</p>
                         <p className="text-muted-foreground mt-2 text-sm">{t('order_id_message', { orderId })}</p>
                         <DialogClose asChild>
                            <Button className="mt-6 w-full">{t('close_button')}</Button>
                         </DialogClose>
                    </div>
                )}
                </div>
                
                <DialogFooter className="sm:justify-start pt-4">
                    {step !== 'confirmation' && (
                         <DialogClose asChild>
                            <Button type="button" variant="secondary" className="w-full">
                                {tGlobal('purchase_dialog_action')}
                            </Button>
                        </DialogClose>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
