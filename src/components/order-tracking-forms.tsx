
'use client';

import React, { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getOrderDetailsByNumber, getOrdersByEmail } from '@/app/actions';
import { useTranslations } from '@/hooks/use-translations';
import { Loader2, Mail, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Order } from '@/lib/types';
import { useParams, useSearchParams } from 'next/navigation';

const initialOrderState: { success: boolean; message: string; order?: Order | null } = { success: false, message: '', order: null };
const initialEmailState: { success: boolean; message: string } = { success: false, message: '' };


function TrackSubmitButton() {
    const { pending } = useFormStatus();
    const t = useTranslations('OrderStatus');
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('track_button')}
        </Button>
    )
}

function EmailSubmitButton() {
    const { pending } = useFormStatus();
    const t = useTranslations('OrderStatus');
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('find_orders_button')}
        </Button>
    )
}

export function TrackByNumberForm({ onOrderFound }: { onOrderFound: (order: Order | null) => void }) {
    const [orderState, orderAction] = useFormState(getOrderDetailsByNumber, initialOrderState);
    const tHome = useTranslations('HomePage');
    const tStatus = useTranslations('OrderStatus');
    const searchParams = useSearchParams();
    const orderNumberFromUrl = searchParams.get('orderNumber');
    
    // Autofill and submit form if orderNumber is in URL
    useEffect(() => {
        if (orderNumberFromUrl) {
            const formData = new FormData();
            formData.append('orderNumber', orderNumberFromUrl);
            orderAction(formData);
        } else {
            onOrderFound(null);
        }
    }, [orderNumberFromUrl]);
    
    useEffect(() => {
        if (orderState.success && orderState.order) {
            onOrderFound(orderState.order);
        } else if (!orderState.success) {
            onOrderFound(null);
        }
    }, [orderState, onOrderFound]);

    return (
        <Card>
            <form id="track-by-number-form" action={orderAction}>
                <CardHeader>
                    <CardTitle className="text-center text-2xl font-headline">{tHome('track_order_link')}</CardTitle>
                    <CardDescription className="text-center">
                        {tStatus('track_description')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input
                        name="orderNumber"
                        placeholder={tStatus('order_number_placeholder')}
                        defaultValue={orderNumberFromUrl || ''}
                        key={orderNumberFromUrl} // Force re-render if URL changes
                        required
                    />
                    <TrackSubmitButton />
                </CardContent>
                <CardFooter>
                    {orderState && !orderState.success && orderState.message && (
                        <Alert variant="destructive" className="w-full">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{tStatus('error_title')}</AlertTitle>
                            <AlertDescription>{orderState.message}</AlertDescription>
                        </Alert>
                    )}
                </CardFooter>
            </form>
        </Card>
    );
}


export function TrackByEmailForm() {
    const [emailState, emailAction] = useFormState(getOrdersByEmail, initialEmailState);
    const tStatus = useTranslations('OrderStatus');
    const params = useParams();
    const locale = params.locale as string;

    useEffect(() => {
        // This log helps debug by showing the result of the server action in the browser console.
        if (emailState.message) {
             console.log("[CLIENT] Server action 'getOrdersByEmail' completed. State:", emailState);
        }
    }, [emailState]);

    return (
        <Card>
            <form action={emailAction}>
                <CardHeader>
                    <CardTitle className="text-center text-2xl font-headline">{tStatus('find_orders_title')}</CardTitle>
                    <CardDescription className="text-center">
                        {tStatus('find_orders_description')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <input type="hidden" name="locale" value={locale} />
                    <Input
                        name="email"
                        type="email"
                        placeholder={tStatus('email_placeholder')}
                        required
                    />
                    <EmailSubmitButton />
                </CardContent>
                <CardFooter className="flex-col items-start">
                    {emailState && !emailState.success && emailState.message && (
                        <Alert variant="destructive" className="w-full">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{tStatus('error_title')}</AlertTitle>
                            <AlertDescription>{emailState.message}</AlertDescription>
                        </Alert>
                    )}
                    {emailState.success && (
                        <Alert variant="default" className="w-full">
                            <Mail className="h-4 w-4" />
                            <AlertTitle>{tStatus('email_sent_title')}</AlertTitle>
                            <AlertDescription>
                                {emailState.message.includes("No orders found") 
                                    ? tStatus('email_sent_description_no_orders')
                                    : tStatus('email_sent_description')
                                }
                            </AlertDescription>
                        </Alert>
                    )}
                </CardFooter>
            </form>
        </Card>
    );
}
