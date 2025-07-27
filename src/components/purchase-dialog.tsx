
"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { useTranslations, useRichTranslations } from '@/hooks/use-translations';
import { ShoppingCart, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { JewelryModel, PlacedCharm, Order } from '@/lib/types';
import { createOrder } from '@/app/actions';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from './ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Separator } from './ui/separator';

type Step = 'shipping' | 'payment' | 'confirmation';

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
    const { toast } = useToast();

    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<Step>('shipping');
    const [orderId, setOrderId] = useState<string | null>(null);

    const totalPrice = useMemo(() => {
        const charmsPrice = placedCharms.reduce((total, pc) => total + (pc.charm.price || 0), 0);
        return (model.price || 0) + charmsPrice;
    }, [model, placedCharms]);

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
            modelName: model.name,
            modelImage: model.displayImageUrl,
            charms: placedCharms.map(pc => ({ 
              name: pc.charm.name, 
              imageUrl: pc.charm.imageUrl,
              price: pc.charm.price || 0,
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
        }, 1500);
    }

    const resetDialog = () => {
        setIsLoading(false);
        setStep('shipping');
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
        if (step === 'payment') setStep('shipping');
    }

    const getTitle = () => {
        switch(step) {
            case 'shipping':
                return "Order Summary";
            case 'payment':
                return "Payment Information";
            case 'confirmation':
                return "Order Confirmed!";
            default:
                return "";
        }
    }
    
    const OrderSummary = () => (
      <div className="space-y-4 my-4">
        <div>
          <h3 className="text-lg font-medium mb-2">Your Creation</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Model: {model.name}</span>
              <span>{(model.price || 0).toFixed(2)}€</span>
            </div>
             {placedCharms.length > 0 && (
                <div className="pl-4">
                    <h4 className="font-medium text-muted-foreground">Charms:</h4>
                    {placedCharms.map(pc => (
                        <div key={pc.id} className="flex justify-between">
                            <span>{pc.charm.name}</span>
                            <span>{(pc.charm.price || 0).toFixed(2)}€</span>
                        </div>
                    ))}
                </div>
            )}
          </div>
        </div>
        <Separator />
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>{totalPrice.toFixed(2)}€</span>
        </div>
      </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button disabled={placedCharms.length === 0}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {t('purchase_button')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    {step !== 'shipping' && (
                        <Button variant="ghost" size="icon" className="absolute top-3 left-3 h-7 w-7" onClick={goBack}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <DialogTitle className="font-headline text-2xl text-center pt-2">
                        {getTitle()}
                    </DialogTitle>
                </DialogHeader>
                
                {/* Step: Shipping */}
                {step === 'shipping' && (
                  <>
                    <OrderSummary />
                    <Separator />
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleShippingSubmit)} className="space-y-4 py-4">
                        <h3 className="font-medium">Shipping Details</h3>
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
                  </>
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
                            {isLoading ? <Loader2 className="animate-spin" /> : `Pay ${totalPrice.toFixed(2)}€`}
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
                
                <DialogFooter className="sm:justify-start">
                    {step !== 'confirmation' && (
                         <DialogClose asChild>
                            <Button type="button" variant="secondary" className="w-full">
                                {t('purchase_dialog_action')}
                            </Button>
                        </DialogClose>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
