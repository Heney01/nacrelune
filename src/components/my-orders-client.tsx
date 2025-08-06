
'use client';

import { useState, useEffect } from 'react';
import type { Order } from '@/lib/types';
import { getOrdersForUser } from '@/app/actions/order.actions';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import Link from 'next/link';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';

const statusVariants: { [key in OrderStatus]: string } = {
    'commandée': 'bg-blue-100 text-blue-800 border-blue-200',
    'en cours de préparation': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'expédiée': 'bg-purple-100 text-purple-800 border-purple-200',
    'livrée': 'bg-green-100 text-green-800 border-green-200',
    'annulée': 'bg-red-100 text-red-800 border-red-200',
}

export function MyOrdersClient() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const { firebaseUser } = useAuth();
    const tStatus = useTranslations('OrderStatus');
    const tAuth = useTranslations('Auth');
    const params = useParams();
    const locale = params.locale as string;

    useEffect(() => {
        const fetchOrders = async () => {
            if (firebaseUser?.email) {
                try {
                    const userOrders = await getOrdersForUser(firebaseUser.email);
                    setOrders(userOrders);
                } catch (error) {
                    console.error("Failed to fetch orders:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                 setLoading(false);
            }
        };

        fetchOrders();
    }, [firebaseUser]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (orders.length === 0) {
        return (
            <div className="text-center py-16 border border-dashed rounded-lg">
                <h3 className="text-xl font-semibold">Vous n'avez pas encore de commandes.</h3>
                <p className="text-muted-foreground mt-2">Commencez par créer un bijou !</p>
                 <Button asChild className="mt-6">
                    <Link href={`/${locale}`}>Créer un bijou</Link>
                </Button>
            </div>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{tAuth('my_orders')}</CardTitle>
                <CardDescription>Consultez l'historique de vos commandes.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Numéro</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                             <TableHead className="text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                                <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={cn(statusVariants[order.status])}>
                                        {tStatus(order.status)}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(order.totalPrice)}</TableCell>
                                <TableCell className="text-right">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/${locale}/orders/track?orderNumber=${order.orderNumber}`}>
                                            Suivre cette commande
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
