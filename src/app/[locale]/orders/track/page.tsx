
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useTranslations } from '@/hooks/use-translations';
import { PackageCheck, Truck, Home, AlertCircle, ArrowLeft, Package } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Order, OrderItem, OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { TrackByNumberForm, TrackByEmailForm } from '@/components/order-tracking-forms';


function OrderStatusTracker({ status }: { status: OrderStatus }) {
    const t = useTranslations('OrderStatus');
    const statuses: OrderStatus[] = ['commandée', 'en cours de préparation', 'expédiée', 'livrée'];
    const statusIndex = statuses.indexOf(status);

    const ICONS: Record<OrderStatus, React.ElementType> = {
        'commandée': PackageCheck,
        'en cours de préparation': Package,
        'expédiée': Truck,
        'livrée': Home,
        'annulée': AlertCircle,
    };

    if (status === 'annulée') {
         return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('status_cancelled_title')}</AlertTitle>
                <AlertDescription>{t('status_cancelled_description')}</AlertDescription>
            </Alert>
        )
    }

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

function ShippingInfo({ order, t }: { order: Order, t: (key: string, values?: any) => string}) {
    const { toast } = useToast();
    
    if (order.status !== 'expédiée' && order.status !== 'livrée') {
        return null;
    }

    if (!order.shippingCarrier || !order.trackingNumber) {
        return null;
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(order.trackingNumber!);
        toast({
            description: t('tracking_number_copied'),
        });
    };

    return (
        <div className="mt-6 border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">{t('shipping_details_title')}</h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start bg-muted/50 p-4 rounded-lg">
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{t('shipping_carrier')}</p>
                    <p className="font-medium">{order.shippingCarrier}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{t('tracking_number')}</p>
                    <div className="flex items-center gap-2">
                        <p className="font-medium font-mono">{order.trackingNumber}</p>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function OrderDetails({ order }: { order: Order }) {
    const tCheckout = useTranslations('Checkout');
    const tCart = useTranslations('Cart');
    const tStatus = useTranslations('OrderStatus');
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
                <ShippingInfo order={order} t={tStatus} />
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
    const t = useTranslations('HomePage');
    const params = useParams();
    const locale = params.locale as string;
    const [order, setOrder] = useState<Order | null>(null);
    
    return (
        <div className="container mx-auto py-12 px-4 max-w-2xl">
            <div className="flex justify-start mb-8">
                <Button variant="ghost" asChild>
                    <Link href={`/${locale}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('back_button')}
                    </Link>
                </Button>
            </div>
            
            <TrackByNumberForm onOrderFound={setOrder} />
            
            {order && (
                <OrderDetails order={order} />
            )}

            <Separator className="my-12" />

            <TrackByEmailForm />
        </div>
    );
}