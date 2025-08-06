
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { getOrdersForUser } from '@/app/actions/order.actions';
import type { Order } from '@/lib/types';
import { useTranslations } from '@/hooks/use-translations';
import { Loader2, ArrowLeft, Package, ChevronDown } from 'lucide-react';
import { BrandLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const statusVariants: { [key in Order['status']]: string } = {
  'commandée': 'bg-blue-100 text-blue-800 border-blue-200',
  'en cours de préparation': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'expédiée': 'bg-purple-100 text-purple-800 border-purple-200',
  'livrée': 'bg-green-100 text-green-800 border-green-200',
  'annulée': 'bg-red-100 text-red-800 border-red-200',
};

export function MyOrdersClient({ locale }: { locale: string }) {
  const { firebaseUser, loading: authLoading } = useAuth();
  const t = useTranslations('Auth');
  const tStatus = useTranslations('OrderStatus');
  const tCart = useTranslations('Cart');

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (firebaseUser?.email) {
      getOrdersForUser(firebaseUser.email)
        .then(setOrders)
        .finally(() => setLoading(false));
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [firebaseUser, authLoading]);

  const formatPrice = (price: number) => {
    return tCart('price', { price });
  };

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="container mx-auto text-center py-20">
        <p>Veuillez vous connecter pour voir vos commandes.</p>
        <Button asChild className="mt-4">
          <Link href={`/${locale}/login`}>Se connecter</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-stone-50">
      <header className="p-4 border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <BrandLogo className="h-8 w-auto text-foreground" />
          </Link>
        </div>
      </header>
      <main className="flex-grow p-4 md:p-8">
        <div className="container mx-auto max-w-4xl">
          <div className="flex justify-start mb-8">
            <Button variant="ghost" asChild>
              <Link href={`/${locale}/creators/${firebaseUser.uid}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour au profil
              </Link>
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-headline flex items-center gap-2">
                <Package /> Mes Commandes
              </CardTitle>
              <CardDescription>
                Retrouvez ici l'historique de toutes vos commandes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-16 border border-dashed rounded-lg">
                  <h3 className="text-xl font-semibold">Vous n'avez pas encore passé de commande.</h3>
                  <p className="text-muted-foreground mt-2">Commencez par créer votre premier bijou !</p>
                  <Button asChild className="mt-6">
                    <Link href={`/${locale}`}>Commencer à créer</Link>
                  </Button>
                </div>
              ) : (
                <Accordion type="single" collapsible className="w-full space-y-4">
                  {orders.map((order) => (
                    <AccordionItem value={order.id} key={order.id} className="border rounded-lg bg-background">
                       <AccordionTrigger className="p-4 hover:no-underline text-left">
                           <div className="flex flex-col sm:flex-row justify-between w-full items-start sm:items-center gap-2">
                            <div className="space-y-1">
                                <p className="font-bold text-base">Commande #{order.orderNumber}</p>
                                <p className="text-sm text-muted-foreground">
                                    du {new Date(order.createdAt).toLocaleDateString('fr-FR')} - {formatPrice(order.totalPrice)}
                                </p>
                            </div>
                            <Badge variant="outline" className={cn("ml-auto sm:ml-0", statusVariants[order.status])}>
                                {tStatus(order.status)}
                            </Badge>
                           </div>
                       </AccordionTrigger>
                       <AccordionContent className="p-4 pt-0">
                           <Separator className="my-4" />
                           <ul className="space-y-3">
                            {order.items.map((item, index) => (
                                <li key={index} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-md border bg-white p-1 flex-shrink-0">
                                            {/* We don't have the preview image here, so we show a placeholder */}
                                            <Package className="w-full h-full text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{item.modelName}</p>
                                            <p className="text-xs text-muted-foreground">{item.jewelryTypeName}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-medium">{formatPrice(item.price)}</p>
                                </li>
                            ))}
                           </ul>
                            <Button asChild variant="outline" size="sm" className="mt-6 w-full">
                                <Link href={`/${locale}/orders/track?orderNumber=${order.orderNumber}`}>
                                    Suivre cette commande
                                </Link>
                            </Button>
                       </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
