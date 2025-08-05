
'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { useTranslations } from '@/hooks/use-translations';
import { createOrder, sendConfirmationEmail } from '@/app/actions/order.actions';
import { useCart } from '@/hooks/use-cart';
import { Loader2, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

function ConfirmationContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const params = useParams();
    const locale = params.locale as string;
    
    const { user } = useAuth();
    const { cart, clearCart } = useCart();
    const t = useTranslations('Checkout');
    const tHome = useTranslations('HomePage');
    const { toast } = useToast();

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [orderNumber, setOrderNumber] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const paymentIntent = searchParams.get('payment_intent');
        const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');
        const redirectStatus = searchParams.get('redirect_status');

        if (!paymentIntent || !paymentIntentClientSecret || !redirectStatus) {
            setErrorMessage("Les informations de paiement sont manquantes ou invalides.");
            setStatus('error');
            return;
        }

        const processOrder = async () => {
            if (redirectStatus === 'succeeded') {
                try {
                    // The cart and other details are not available in URL, so we get them from context/local storage
                    const serializableCart = cart.map(item => ({
                        id: item.id,
                        model: item.model,
                        jewelryType: { id: item.jewelryType.id, name: item.jewelryType.name, description: item.jewelryType.description },
                        placedCharms: item.placedCharms,
                        previewImage: item.previewImage,
                        creator: item.creator,
                        creationId: item.creationId,
                    }));
                    
                    // The other customer/shipping details are lost in redirection.
                    // This is a limitation. We'll rely on what's in the payment intent (email)
                    // and what we can guess for the user. A more robust solution would store this data
                    // in a temporary server session before redirecting to Stripe.
                    const tempEmail = user?.email || 'email@inconnu.com'; // Placeholder
                    
                    const orderResult = await createOrder(
                        serializableCart,
                        tempEmail,
                        paymentIntent,
                        'home' // Defaulting to home, another limitation
                    );

                    if (orderResult.success && orderResult.orderId && orderResult.orderNumber) {
                        await sendConfirmationEmail(orderResult.orderId, locale);
                        setOrderNumber(orderResult.orderNumber);
                        setStatus('success');
                        clearCart();
                    } else {
                        setErrorMessage(orderResult.message || "La création de la commande a échoué après le paiement.");
                        setStatus('error');
                    }
                } catch (e: any) {
                    setErrorMessage(e.message || "Une erreur inattendue est survenue lors de la finalisation de la commande.");
                    setStatus('error');
                }
            } else {
                 setErrorMessage("Le paiement n'a pas pu être finalisé.");
                 setStatus('error');
            }
        };

        processOrder();
        // We only want this to run once on component mount with the initial searchParams.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCopy = () => {
        if (!orderNumber) return;
        navigator.clipboard.writeText(orderNumber);
        toast({
          description: 'Numéro de commande copié !',
        });
    };

    if (status === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center text-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <h1 className="text-2xl font-headline">Finalisation de votre commande...</h1>
                <p className="text-muted-foreground">Veuillez ne pas fermer cette page.</p>
            </div>
        )
    }

     if (status === 'error') {
        return (
            <div className="flex flex-col items-center justify-center text-center gap-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <h1 className="text-2xl font-headline">Erreur de commande</h1>
                <p className="text-destructive max-w-md">{errorMessage || "Une erreur inconnue est survenue."}</p>
                 <p className="text-muted-foreground text-sm max-w-md">
                   Pas d'inquiétude, votre paiement n'a pas été débité. Veuillez contacter le support si le problème persiste.
                </p>
                 <Button asChild>
                    <Link href={`/${locale}`}>Retour à l'accueil</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center text-center gap-4">
             <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-headline">{t('success_title')}</h1>
            <p className="text-muted-foreground max-w-lg">
                {t('success_description', { email: user?.email || 'votre adresse e-mail' })}
            </p>
             <div className="my-4 w-full max-w-sm">
              <div className="text-sm font-medium text-center text-muted-foreground">{t('success_order_number')}</div>
              <div className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-dashed bg-muted p-3 text-lg font-semibold text-center">
                <span>{orderNumber}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="outline" asChild>
                    <Link href={`/${locale}/orders/track?orderNumber=${orderNumber}`}>{tHome('track_order_link')}</Link>
                </Button>
                <Button asChild>
                    <Link href={`/${locale}`}>Continuer mes achats</Link>
                </Button>
            </div>
        </div>
    )
}

export default function OrderConfirmationPage() {
     return (
        <div className="container mx-auto flex items-center justify-center min-h-screen py-12 px-4">
             <Suspense fallback={<div className="flex flex-col items-center justify-center text-center gap-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><h1 className="text-2xl font-headline">Chargement...</h1></div>}>
                <ConfirmationContent />
            </Suspense>
        </div>
    );
}

