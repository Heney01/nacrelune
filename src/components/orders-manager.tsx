
'use client';

import React, { useState, useReducer, useTransition, Fragment } from 'react';
import type { Order, OrderStatus, OrderItem, Charm } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Package, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from '@/hooks/use-translations';
import { Badge } from './ui/badge';
import { updateOrderStatus } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from './ui/button';
import { EllipsisVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import Image from 'next/image';

interface OrdersManagerProps {
    initialOrders: Order[];
    locale: string;
}

type State = Order[];

type Action = {
    type: 'UPDATE_STATUS';
    payload: { orderId: string; newStatus: OrderStatus };
};

const ordersReducer = (state: State, action: Action): State => {
    switch(action.type) {
        case 'UPDATE_STATUS':
            return state.map(order => 
                order.id === action.payload.orderId 
                    ? { ...order, status: action.payload.newStatus }
                    : order
            );
        default:
            return state;
    }
}

const statusVariants: { [key in OrderStatus]: string } = {
    'commandée': 'bg-blue-100 text-blue-800 border-blue-200',
    'en cours de préparation': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'expédiée': 'bg-purple-100 text-purple-800 border-purple-200',
    'livrée': 'bg-green-100 text-green-800 border-green-200',
}

const OrderRow = ({ order, locale, onStatusChange, t, tStatus, isPending }: {
    order: Order,
    locale: string,
    onStatusChange: (orderId: string, status: OrderStatus) => void,
    t: (key: string, values?: any) => string,
    tStatus: (key: string, values?: any) => string,
    isPending: boolean
}) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Fragment>
            <TableRow 
                key={order.id} 
                className={cn(isPending && 'opacity-50', "cursor-pointer")}
                onClick={() => setIsOpen(!isOpen)}
            >
                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>{order.customerEmail}</TableCell>
                <TableCell>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(order.totalPrice)}</TableCell>
                <TableCell>
                    <Badge variant="outline" className={cn(statusVariants[order.status])}>
                        {tStatus(order.status)}
                    </Badge>
                </TableCell>
                <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end items-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <EllipsisVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {(['commandée', 'en cours de préparation', 'expédiée', 'livrée'] as OrderStatus[]).map(status => (
                                     <DropdownMenuItem 
                                        key={status} 
                                        onClick={() => onStatusChange(order.id, status)}
                                        disabled={order.status === status}
                                    >
                                        {t('update_status_to', { status: tStatus(status) })}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="icon" className="ml-2">
                             {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                    </div>
                </TableCell>
            </TableRow>
            {isOpen && (
                <TableRow>
                    <TableCell colSpan={6} className="p-0">
                       <div className="bg-muted/50 p-6">
                            <h4 className="text-lg font-semibold mb-4">Atelier de confection - Commande {order.orderNumber}</h4>
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {order.items.map((item, index) => (
                                    <Card key={index} className="overflow-hidden">
                                        <CardHeader>
                                            <CardTitle className="text-base">{item.modelName}</CardTitle>
                                            <CardDescription>{item.jewelryTypeName}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="bg-white p-2 rounded-md border mb-4">
                                                <Image 
                                                    src={item.previewImageUrl} 
                                                    alt={`Aperçu de ${item.modelName}`}
                                                    width={400} 
                                                    height={400} 
                                                    className="w-full h-auto object-contain rounded" 
                                                />
                                            </div>
                                            
                                            <Separator className="my-3" />
                                            
                                            <h5 className="font-semibold mb-2 text-sm">Breloques à ajouter:</h5>
                                            {item.charms && item.charms.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {item.charms.map(charm => (
                                                        <li key={charm.id} className="flex items-center gap-3 text-sm">
                                                             <Image 
                                                                src={charm.imageUrl} 
                                                                alt={charm.name}
                                                                width={32} 
                                                                height={32} 
                                                                className="w-8 h-8 object-contain rounded border bg-white p-0.5" 
                                                            />
                                                            <span>{charm.name}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ): (
                                                <p className="text-sm text-muted-foreground">Aucune breloque pour cet article.</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                       </div>
                    </TableCell>
                </TableRow>
            )}
        </Fragment>
    );
};


export function OrdersManager({ initialOrders, locale }: OrdersManagerProps) {
    const t = useTranslations('Admin');
    const tStatus = useTranslations('OrderStatus');
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [state, dispatch] = useReducer(ordersReducer, initialOrders);
    const { orders } = { orders: state };

    const [searchTerm, setSearchTerm] = useState('');

    const handleStatusChange = (orderId: string, status: OrderStatus) => {
        const formData = new FormData();
        formData.append('orderId', orderId);
        formData.append('status', status);
        formData.append('locale', locale);

        startTransition(async () => {
            const result = await updateOrderStatus(formData);
            if (result.success) {
                dispatch({ type: 'UPDATE_STATUS', payload: { orderId, newStatus: status }});
                toast({ title: 'Succès', description: result.message });
            } else {
                toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
            }
        });
    }
    
    const filteredOrders = orders.filter(order => 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Card>
            <CardHeader>
                 <CardTitle className="text-xl font-headline flex items-center gap-2">
                    <Package /> {t('orders_title')}
                </CardTitle>
                <div className="flex justify-between items-center">
                    <CardDescription>
                        {t('orders_description')}
                    </CardDescription>
                     <div className="relative w-full sm:w-auto sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher par N° ou email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('order_number')}</TableHead>
                            <TableHead>{t('date')}</TableHead>
                            <TableHead>{t('customer')}</TableHead>
                            <TableHead>{t('total')}</TableHead>
                            <TableHead>{t('status')}</TableHead>
                            <TableHead className="text-right">{t('actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrders.length > 0 ? (
                            filteredOrders.map(order => (
                                <OrderRow 
                                    key={order.id}
                                    order={order}
                                    locale={locale}
                                    onStatusChange={handleStatusChange}
                                    t={t}
                                    tStatus={tStatus}
                                    isPending={isPending}
                                />
                        ))
                        ) : (
                             <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                   {t('no_orders')}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
