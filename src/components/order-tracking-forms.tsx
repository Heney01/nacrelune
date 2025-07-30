
'use client';

import React, { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getOrderDetailsByNumber, getOrdersByEmail } from '@/app/actions';
import { useTranslations } from '@/hooks/use-translations';
import { Loader2, Mail, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Order } from '@/lib/types';
import { useParams } from 'next/navigation';

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
    
    useEffect(() => {
        if (orderState.success && orderState.order) {
            onOrderFound(orderState.order);
        } else {
            onOrderFound(null);
        }
    }, [orderState, onOrderFound]);

    return (
        <Card>
            <form action={orderAction}>
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
        if (emailState.message) {
            console.log("[CLIENT DEBUG] Server action 'getOrdersByEmail' completed. State:", emailState);
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
                    {emailState && !emailState.success && emailState.message && emailState.message !== 'email_sent_notice' && (
                        <Alert variant="destructive" className="w-full">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>{tStatus('error_title')}</AlertTitle>
                            <AlertDescription>{emailState.message}</AlertDescription>
                        </Alert>
                    )}
                    {emailState.success && emailState.message === 'email_sent_notice' && (
                        <Alert variant="default" className="w-full">
                            <Mail className="h-4 w-4" />
                            <AlertTitle>{tStatus('email_sent_title')}</AlertTitle>
                            <AlertDescription>
                                {tStatus('email_sent_description')}
                            </AlertDescription>
                        </Alert>
                    )}
                </CardFooter>
            </form>
        </Card>
    );
}
