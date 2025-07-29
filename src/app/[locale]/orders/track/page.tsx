
'use client';

import React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getOrderDetailsByNumber } from '@/app/actions';
import { useTranslations } from '@/hooks/use-translations';
import { Loader2, PackageCheck, Truck, Home, Package, AlertCircle, WandSparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Order, OrderItem, OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const initialState = { success: false, message: '', order: null };

function SubmitButton() {
    const { pending } = useFormStatus();
    const t = useTranslations('HomePage');
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('track_order_link')}
        </Button>
    )
}

function OrderStatusTracker({ status }: { status: OrderStatus }) {
    const t = useTranslations('OrderStatus');
    const statuses: OrderStatus[] = ['commandée', 'en cours de préparation', 'expédiée', 'livrée'];
    const statusIndex = statuses.indexOf(status);

    const ICONS = {
        'commandée': PackageCheck,
        'en cours de préparation': Package,
        'expédiée': Truck,
        'livrée': Home
    };

    return (
        <div className="flex justify-between items-start">
            {statuses.map((s, index) => {
                const Icon = ICONS[s];
                const isCompleted = index <= statusIndex;
                const isCurrent = index === statusIndex;
                return (
                    <React.Fragment key={s}>
                        <div className="flex flex-col items-center text-center">
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors duration-300",
                                isCompleted ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-border text-muted-foreground"
                            )}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <p className={cn(
                                "mt-2 text-sm font-medium",
                                isCurrent ? "text-primary" : "text-muted-foreground"
                            )}>
                                {t(s)}
                            </p>
                        </div>
                        {index < statuses.length - 1 && (
                            <div className={cn(
                                "flex-1 h-0.5 mt-6 transition-colors duration-300",
                                isCompleted ? "bg-primary" : "bg-border"
                            )} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

function OrderDetails({ order }: { order: Order }) {
    const tCheckout = useTranslations('Checkout');
    const tCart = useTranslations('Cart');
    const formatPrice = (price: number) => tCart('price', { price });

    return (
        <Card className="mt-8">
            <CardHeader>
                <CardTitle>{tCheckout('order_summary')}</CardTitle>
                <CardDescription>
                    Commande #{order.orderNumber} - {new Date(order.createdAt).toLocaleDateString()}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <OrderStatusTracker status={order.status} />
                <Separator className="my-6" />
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Détails de votre commande</h3>
                    <Accordion type="multiple" className="w-full space-y-4">
                        {order.items.map((item, index) => (
                            <AccordionItem value={`item-${index}`} key={index} className="border rounded-lg">
                                <AccordionTrigger className="p-4 hover:no-underline">
                                    <div className="flex justify-between w-full items-center gap-4">
                                        {item.modelImageUrl && (
                                            <Image src={item.modelImageUrl} alt={item.modelName} width={64} height={64} className="rounded-md border bg-white p-1" data-ai-hint="jewelry model"/>
                                        )}
                                        <div className="text-left flex-grow">
                                            <p className="font-semibold">{item.modelName}</p>
                                            <p className="text-sm text-muted-foreground">{item.jewelryTypeName}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold">{formatPrice(item.price)}</p>
                                             <p className="text-sm text-muted-foreground">{tCart('item_count', {count: item.charms?.length || 0})}</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 pt-0">
                                    {item.charms && item.charms.length > 0 ? (
                                        <ul className="space-y-3 mt-4">
                                            {item.charms.map(charm => (
                                                <li key={charm.id} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Image src={charm.imageUrl} alt={charm.name} width={40} height={40} className="rounded-md border bg-white p-1" data-ai-hint="jewelry charm" />
                                                        <div>
                                                            <p className="font-medium">{charm.name}</p>
                                                            <p className="text-xs text-muted-foreground">{charm.description}</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{formatPrice(charm.price || 0)}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-center text-sm text-muted-foreground mt-4">Aucune breloque pour cet article.</p>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </CardContent>
        </Card>
    )
}

export default function TrackOrderPage() {
    const [state, formAction] = useFormState(getOrderDetailsByNumber, initialState);
    const t = useTranslations('HomePage');

    return (
        <div className="container mx-auto py-12 px-4 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle className="text-center text-2xl font-headline">{t('track_order_link')}</CardTitle>
                    <CardDescription className="text-center">
                        Entrez votre numéro de commande pour voir son statut.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="space-y-4">
                        <Input
                            name="orderNumber"
                            placeholder="ex: NAC-240726-AB12CD"
                            required
                        />
                        <SubmitButton />
                    </form>
                    {state && !state.success && state.message && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Erreur</AlertTitle>
                            <AlertDescription>{state.message}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {state.success && state.order && (
                <OrderDetails order={state.order} />
            )}
        </div>
    );
}
