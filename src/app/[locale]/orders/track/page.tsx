
'use client';

import React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getOrderDetailsByNumber } from '@/app/actions';
import { useTranslations } from '@/hooks/use-translations';
import { Loader2, PackageCheck, Truck, Home, Package, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Order, OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

const initialState = { success: false, message: '', order: null };

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Suivre ma commande
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
                    {order.items.map((item, index) => (
                        <div key={index} className="flex gap-4 items-center">
                            <Image src={item.previewImageUrl} alt={item.modelName} width={80} height={80} className="rounded-md border aspect-square object-cover" data-ai-hint="jewelry" />
                            <div>
                                <p className="font-semibold">{item.modelName}</p>
                                <p className="text-sm text-muted-foreground">{item.jewelryTypeName}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

export default function TrackOrderPage() {
    const [state, formAction] = useFormState(getOrderDetailsByNumber, initialState);

    return (
        <div className="container mx-auto py-12 px-4 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle className="text-center text-2xl font-headline">Suivre votre commande</CardTitle>
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
