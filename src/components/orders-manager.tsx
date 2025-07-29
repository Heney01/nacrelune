
'use client';

import React, { useState, useReducer, useTransition, Fragment } from 'react';
import type { Order, OrderStatus, OrderItem, Charm } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Package, Search, ChevronDown, ChevronUp, Truck } from 'lucide-react';
import { useTranslations } from '@/hooks/use-translations';
import { Badge } from './ui/badge';
import { updateOrderStatus, updateOrderItemStatus } from '@/app/actions';
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
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface OrdersManagerProps {
    initialOrders: Order[];
    locale: string;
}

const SHIPPING_CARRIERS = ["Colissimo", "Chronopost", "DPD", "Mondial Relay", "GLS", "Colis Privé", "DHL", "UPS", "FedEx"];

type State = Order[];

type Action = {
    type: 'UPDATE_STATUS';
    payload: { orderId: string; newStatus: OrderStatus, shippingInfo?: { carrier: string, trackingNumber: string} };
} | {
    type: 'UPDATE_ITEM_STATUS';
    payload: { orderId: string; itemIndex: number; isCompleted: boolean };
};

const ordersReducer = (state: State, action: Action): State => {
    switch(action.type) {
        case 'UPDATE_STATUS':
            return state.map(order => 
                order.id === action.payload.orderId 
                    ? { 
                        ...order, 
                        status: action.payload.newStatus,
                        shippingCarrier: action.payload.shippingInfo?.carrier ?? order.shippingCarrier,
                        trackingNumber: action.payload.shippingInfo?.trackingNumber ?? order.trackingNumber,
                      }
                    : order
            );
        case 'UPDATE_ITEM_STATUS':
            return state.map(order => 
                order.id === action.payload.orderId 
                    ? { 
                        ...order,
                        items: order.items.map((item, index) => 
                            index === action.payload.itemIndex
                                ? { ...item, isCompleted: action.payload.isCompleted }
                                : item
                        )
                      }
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

const ShipOrderDialog = ({
    order,
    isOpen,
    onOpenChange,
    onConfirm,
    t
}: {
    order: Order,
    isOpen: boolean,
    onOpenChange: (isOpen: boolean) => void,
    onConfirm: (trackingNumber: string, shippingCarrier: string) => void,
    t: (key: string, values?: any) => string
}) => {
    const [trackingNumber, setTrackingNumber] = useState('');
    const [shippingCarrier, setShippingCarrier] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(trackingNumber, shippingCarrier);
        onOpenChange(false);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t('ship_order_dialog_title')} {order.orderNumber}</DialogTitle>
                        <DialogDescription>
                            {t('ship_order_dialog_description')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="shippingCarrier">{t('shipping_carrier')}</Label>
                            <Select onValueChange={setShippingCarrier} required>
                                <SelectTrigger id="shippingCarrier">
                                    <SelectValue placeholder={t('select_carrier_placeholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {SHIPPING_CARRIERS.map(carrier => (
                                        <SelectItem key={carrier} value={carrier}>{carrier}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="trackingNumber">{t('tracking_number')}</Label>
                            <Input 
                                id="trackingNumber" 
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                required 
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
                        <Button type="submit">{t('confirm_shipping_button')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

const OrderRow = ({ order, locale, onStatusChange, onItemStatusChange, t, tStatus, isPending }: {
    order: Order,
    locale: string,
    onStatusChange: (orderId: string, status: OrderStatus, shippingInfo?: { carrier: string, trackingNumber: string}) => void,
    onItemStatusChange: (orderId: string, itemIndex: number, isCompleted: boolean) => void,
    t: (key: string, values?: any) => string,
    tStatus: (key: string, values?: any) => string,
    isPending: boolean
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isShipDialogOpen, setIsShipDialogOpen] = useState(false);
    
    const handleShipConfirm = (trackingNumber: string, shippingCarrier: string) => {
        onStatusChange(order.id, 'expédiée', { carrier: shippingCarrier, trackingNumber });
    }

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
                <TableCell className="text-right">
                    <div className="flex justify-end items-center" onClick={(e) => e.stopPropagation()}>
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
                                        onClick={() => {
                                            if (status === 'expédiée') {
                                                setIsShipDialogOpen(true);
                                            } else {
                                                onStatusChange(order.id, status)
                                            }
                                        }}
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
                             {order.shippingCarrier && order.trackingNumber && (
                                <div className="mb-6">
                                    <h5 className="font-semibold mb-2 text-md flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /> Informations d'expédition</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-background p-4 rounded-lg border">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Transporteur</p>
                                            <p>{order.shippingCarrier}</p>
                                        </div>
                                         <div>
                                            <p className="text-sm font-medium text-muted-foreground">Numéro de suivi</p>
                                            <p className="font-mono">{order.trackingNumber}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                {order.items.map((item, index) => (
                                    <Card key={index} className={cn("overflow-hidden", item.isCompleted && "bg-green-50 border-green-200")}>
                                        <CardHeader>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <CardTitle className="text-base">{item.modelName}</CardTitle>
                                                    <CardDescription>Réf: {item.modelId}</CardDescription>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`completed-${order.id}-${index}`}
                                                        checked={item.isCompleted}
                                                        onCheckedChange={(checked) => {
                                                            onItemStatusChange(order.id, index, !!checked)
                                                        }}
                                                    />
                                                    <Label htmlFor={`completed-${order.id}-${index}`}>Terminé</Label>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <div className="bg-white p-2 rounded-md border mb-4 cursor-pointer">
                                                        <Image 
                                                            src={item.previewImageUrl} 
                                                            alt={`Aperçu de ${item.modelName}`}
                                                            width={400} 
                                                            height={400} 
                                                            className="w-full h-auto object-contain rounded" 
                                                        />
                                                    </div>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-2xl">
                                                    <DialogHeader>
                                                        <DialogTitle>Aperçu de {item.modelName}</DialogTitle>
                                                    </DialogHeader>
                                                     <Image 
                                                        src={item.previewImageUrl} 
                                                        alt={`Aperçu de ${item.modelName}`}
                                                        width={800} 
                                                        height={800} 
                                                        className="w-full h-auto object-contain rounded-lg" 
                                                    />
                                                </DialogContent>
                                            </Dialog>
                                            
                                            <Separator className="my-3" />
                                            
                                            <h5 className="font-semibold mb-2 text-sm">Breloques à ajouter:</h5>
                                            {item.charms && item.charms.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {item.charms.map((charm, charmIndex) => (
                                                        <li key={`${charm.id}-${charmIndex}`} className="flex items-center gap-3 text-sm">
                                                             <Image 
                                                                src={charm.imageUrl} 
                                                                alt={charm.name}
                                                                width={32} 
                                                                height={32} 
                                                                className="w-8 h-8 object-contain rounded border bg-white p-0.5" 
                                                            />
                                                            <div className="flex-grow">
                                                                <span>{charm.name}</span>
                                                                <p className="text-xs text-muted-foreground">Réf: {charm.id}</p>
                                                            </div>
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
            <ShipOrderDialog
                order={order}
                isOpen={isShipDialogOpen}
                onOpenChange={setIsShipDialogOpen}
                onConfirm={handleShipConfirm}
                t={t}
            />
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

    const handleStatusChange = (orderId: string, status: OrderStatus, shippingInfo?: { carrier: string; trackingNumber: string; }) => {
        const formData = new FormData();
        formData.append('orderId', orderId);
        formData.append('status', status);
        formData.append('locale', locale);
        if (shippingInfo) {
            formData.append('shippingCarrier', shippingInfo.carrier);
            formData.append('trackingNumber', shippingInfo.trackingNumber);
        }

        startTransition(async () => {
            const result = await updateOrderStatus(formData);
            if (result.success) {
                dispatch({ type: 'UPDATE_STATUS', payload: { orderId, newStatus: status, shippingInfo }});
                toast({ title: 'Succès', description: result.message });
            } else {
                toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
            }
        });
    }

    const handleItemStatusChange = (orderId: string, itemIndex: number, isCompleted: boolean) => {
         const formData = new FormData();
        formData.append('orderId', orderId);
        formData.append('itemIndex', itemIndex.toString());
        formData.append('isCompleted', isCompleted.toString());

        startTransition(async () => {
            const result = await updateOrderItemStatus(formData);
             if (result.success) {
                dispatch({ type: 'UPDATE_ITEM_STATUS', payload: { orderId, itemIndex, isCompleted }});
                toast({ description: result.message });
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
                                    onItemStatusChange={handleItemStatusChange}
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
