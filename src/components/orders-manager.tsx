

'use client';

import React, { useState, useReducer, useTransition, Fragment, useMemo } from 'react';
import type { Order, OrderStatus, OrderItem, Charm, MailLog, DeliveryMethod } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Package, Search, ChevronDown, ChevronUp, Truck, FileX, Edit, Copy, Mail, CheckCircle, XCircle, Clock, Undo2, Home, Store, CreditCard, TicketPercent, Award } from 'lucide-react';
import { useTranslations } from '@/hooks/use-translations';
import { Badge } from './ui/badge';
import { updateOrderStatus, updateOrderItemStatus } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface OrdersManagerProps {
    initialOrders: Order[];
    locale: string;
}

const SHIPPING_CARRIERS = ["Colissimo", "Chronopost", "DPD", "Mondial Relay", "GLS", "Colis Privé", "DHL", "UPS", "FedEx"];

type State = Order[];

type Action = {
    type: 'UPDATE_STATUS';
    payload: { 
        orderId: string; 
        newStatus: OrderStatus, 
        shippingInfo?: { carrier: string, trackingNumber: string},
        cancellationReason?: string 
    };
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
                        cancellationReason: action.payload.cancellationReason ?? order.cancellationReason
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
    'annulée': 'bg-red-100 text-red-800 border-red-200',
}

const ShipOrderDialog = ({
    order,
    onConfirm,
    children,
    t,
    isOpen,
    onOpenChange
}: {
    order: Order,
    onConfirm: (trackingNumber: string, shippingCarrier: string) => void,
    children: React.ReactNode,
    t: (key: string, values?: any) => string,
    isOpen: boolean,
    onOpenChange: (open: boolean) => void
}) => {
    const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
    const [shippingCarrier, setShippingCarrier] = useState(order.shippingCarrier || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(trackingNumber, shippingCarrier);
        onOpenChange(false);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
             <DialogTrigger asChild>
                {children}
            </DialogTrigger>
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
                            <Select onValueChange={setShippingCarrier} defaultValue={shippingCarrier} required>
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

const CancelOrderDialog = ({
    onConfirm,
    children,
    t
}: {
    onConfirm: (reason: string) => void,
    children: React.ReactNode,
    t: (key: string, values?: any) => string
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [reason, setReason] = useState('');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(reason);
        setIsOpen(false);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
             <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t('cancel_order_dialog_title')}</DialogTitle>
                        <DialogDescription>{t('cancel_order_dialog_description')}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="cancellation-reason">{t('cancellation_reason')}</Label>
                        <Textarea 
                            id="cancellation-reason" 
                            className="mt-2"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={t('cancellation_reason_placeholder')}
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>{t('cancel')}</Button>
                        <Button type="submit" variant="destructive">{t('confirm_cancellation_button')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

const MailHistoryTab = ({ mailHistory }: { mailHistory: MailLog[] }) => {
    const mailStatusIcons: { [key: string]: React.ReactElement } = {
        'SUCCESS': <CheckCircle className="h-4 w-4 text-green-500" />,
        'ERROR': <XCircle className="h-4 w-4 text-red-500" />,
        'PENDING': <Clock className="h-4 w-4 text-yellow-500" />,
        'PROCESSING': <Clock className="h-4 w-4 text-blue-500" />,
    }

    if (!mailHistory || mailHistory.length === 0) {
        return <p className="text-sm text-muted-foreground text-center p-8">Aucun e-mail n'a été envoyé pour cette commande.</p>
    }

    return (
        <div className="p-2 sm:p-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date d'envoi</TableHead>
                        <TableHead>Sujet</TableHead>
                        <TableHead>Destinataire</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {mailHistory.map(mail => (
                        <TableRow key={mail.id}>
                            <TableCell>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <div className="flex items-center gap-2">
                                                {mailStatusIcons[mail.delivery?.state || 'PENDING'] || <Clock className="h-4 w-4" />}
                                                <span className="hidden sm:inline">{mail.delivery?.state || 'PENDING'}</span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {mail.delivery?.error ? <p className="text-destructive-foreground bg-destructive p-2 rounded-md">{mail.delivery.error}</p> : <p>{mail.delivery?.state}</p>}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </TableCell>
                            <TableCell>{mail.delivery?.startTime ? new Date(mail.delivery.startTime).toLocaleString() : 'En attente'}</TableCell>
                            <TableCell className="max-w-xs truncate">{mail.subject}</TableCell>
                            <TableCell>{mail.to.join(', ')}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

const OrderDetails = ({ order, onItemStatusChange, onStatusChange, t, onEditShipping }: { 
    order: Order, 
    onItemStatusChange: (orderId: string, itemIndex: number, isCompleted: boolean) => void,
    onStatusChange: (orderId: string, status: OrderStatus, options?: { shippingInfo?: { carrier: string, trackingNumber: string }, cancellationReason?: string }) => void,
    t: (key: string, values?: any) => string,
    onEditShipping: () => void
}) => {
    const hasFinancialDetails = order.paymentIntentId || order.couponCode || order.pointsUsed;

    return (
        <div className="bg-muted/50">
            <Tabs defaultValue="workshop" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="workshop">Atelier de confection</TabsTrigger>
                    <TabsTrigger value="mailHistory">Historique des e-mails</TabsTrigger>
                </TabsList>
                <TabsContent value="workshop">
                     <div className="p-4 md:p-6 space-y-6">
                        <div>
                             <h5 className="font-semibold mb-2 text-md flex items-center gap-2">
                                {order.deliveryMethod === 'home' ? <Home className="h-5 w-5 text-primary" /> : <Store className="h-5 w-5 text-primary" />} 
                                {t(`delivery_method_${order.deliveryMethod}`)}
                            </h5>
                             <div className="bg-background p-4 rounded-lg border">
                                {order.deliveryMethod === 'home' && order.shippingAddress ? (
                                    <address className="not-italic text-sm">
                                        <strong>{order.shippingAddress.name}</strong><br />
                                        {order.shippingAddress.addressLine1}<br />
                                        {order.shippingAddress.addressLine2 && <>{order.shippingAddress.addressLine2}<br /></>}
                                        {order.shippingAddress.postalCode} {order.shippingAddress.city}<br />
                                        {order.shippingAddress.country}
                                    </address>
                                ) : (
                                    <p className="text-sm text-muted-foreground">{t('pickup_contact_customer')}</p>
                                )}
                            </div>
                        </div>

                        {hasFinancialDetails && (
                            <div>
                                <h5 className="font-semibold mb-2 text-md flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-primary" /> Détails Financiers
                                </h5>
                                <div className="bg-background p-4 rounded-lg border space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <p className="text-muted-foreground">Mode de paiement</p>
                                        <p className="font-medium">{order.paymentIntentId === 'free_order' ? 'Gratuit (Points/Coupon)' : 'Carte bancaire (Stripe)'}</p>
                                    </div>
                                    {order.couponCode && (
                                        <div className="flex items-center justify-between text-sm">
                                            <p className="text-muted-foreground flex items-center gap-1.5"><TicketPercent className="h-4 w-4"/> Coupon</p>
                                            <p className="font-medium">{order.couponCode}</p>
                                        </div>
                                    )}
                                    {(order.pointsUsed ?? 0) > 0 && (
                                         <div className="flex items-center justify-between text-sm">
                                            <p className="text-muted-foreground flex items-center gap-1.5"><Award className="h-4 w-4"/> Points utilisés</p>
                                            <p className="font-medium">{order.pointsUsed} (valeur: {order.pointsValue?.toFixed(2)}€)</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {order.shippingCarrier && order.trackingNumber && (
                            <div>
                                <h5 className="font-semibold mb-2 text-md flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /> Informations d'expédition</h5>
                                <div className="flex items-start justify-between bg-background p-4 rounded-lg border">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Transporteur</p>
                                            <p>{order.shippingCarrier}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Numéro de suivi</p>
                                            <p className="font-mono">{order.trackingNumber}</p>
                                        </div>
                                    </div>
                                   <Button variant="outline" size="sm" onClick={onEditShipping}>
                                        <Edit className="mr-2 h-4 w-4" /> Modifier
                                    </Button>
                                </div>
                            </div>
                        )}
                        {order.status === 'annulée' && order.cancellationReason && (
                            <div>
                                <h5 className="font-semibold mb-2 text-md flex items-center gap-2"><FileX className="h-5 w-5 text-destructive" /> Commande Annulée</h5>
                                <div className="bg-background p-4 rounded-lg border">
                                    <p className="text-sm font-medium text-muted-foreground">Motif de l'annulation</p>
                                    <p className="italic">"{order.cancellationReason}"</p>
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
                                                    disabled={order.status === 'annulée'}
                                                />
                                                <Label htmlFor={`completed-${order.id}-${index}`}>Terminé</Label>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <div className="w-full max-w-48 mx-auto bg-white p-2 rounded-md border mb-4 cursor-pointer">
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
                </TabsContent>
                <TabsContent value="mailHistory">
                    <MailHistoryTab mailHistory={order.mailHistory || []} />
                </TabsContent>
            </Tabs>
        </div>
    )
}

const OrderRow = ({ order, isOpen, onToggle, onStatusChange, onItemStatusChange, t, tStatus, isPending, onEditShipping }: {
    order: Order,
    isOpen: boolean,
    onToggle: () => void,
    onStatusChange: (orderId: string, status: OrderStatus, options?: { shippingInfo?: { carrier: string, trackingNumber: string }, cancellationReason?: string }) => void,
    onItemStatusChange: (orderId: string, itemIndex: number, isCompleted: boolean) => void,
    t: (key: string, values?: any) => string,
    tStatus: (key: string, values?: any) => string,
    isPending: boolean,
    onEditShipping: () => void,
}) => {
    const { toast } = useToast();

    const handleCancelConfirm = (reason: string) => {
        onStatusChange(order.id, 'annulée', { cancellationReason: reason });
    }
    
    const handleCopyEmail = () => {
        navigator.clipboard.writeText(order.customerEmail);
        toast({
            description: t('email_copied'),
        });
    }

    const DeliveryIcon = order.deliveryMethod === 'home' ? Home : Store;

    return (
        <Fragment>
            <TableRow 
                className={cn(isPending && 'opacity-50', "cursor-pointer")}
                onClick={onToggle}
            >
                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        {order.customerEmail}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleCopyEmail(); }}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </TableCell>
                <TableCell>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <DeliveryIcon className="h-5 w-5" />
                            </TooltipTrigger>
                            <TooltipContent>
                               <p>{t(`delivery_method_${order.deliveryMethod}`)}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </TableCell>
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
                                        onSelect={(e) => {
                                            e.preventDefault();
                                            if (status === 'expédiée') {
                                                onEditShipping();
                                            } else {
                                                onStatusChange(order.id, status)
                                            }
                                        }}
                                        disabled={order.status === status || order.status === 'annulée'}
                                    >
                                      {t('update_status_to', { status: tStatus(status) })}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <CancelOrderDialog onConfirm={handleCancelConfirm} t={t}>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} disabled={order.status === 'annulée'} className="text-destructive focus:text-destructive">
                                        <FileX className="mr-2 h-4 w-4"/>
                                        {t('cancel_order')}
                                    </DropdownMenuItem>
                                </CancelOrderDialog>
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
                    <TableCell colSpan={7} className="p-0">
                       <OrderDetails order={order} onItemStatusChange={onItemStatusChange} onStatusChange={onStatusChange} t={t} onEditShipping={onEditShipping} />
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
    const [tab, setTab] = useState<'active' | 'archived'>('active');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [openOrders, setOpenOrders] = useState<Set<string>>(new Set());

    const [isShipDialogOpen, setIsShipDialogOpen] = useState(false);
    const [selectedOrderForShipping, setSelectedOrderForShipping] = useState<Order | null>(null);

    const toggleOrder = (orderId: string) => {
        setOpenOrders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(orderId)) {
                newSet.delete(orderId);
            } else {
                newSet.add(orderId);
            }
            return newSet;
        });
    };

    const handleOpenShipDialog = (order: Order) => {
        setSelectedOrderForShipping(order);
        setIsShipDialogOpen(true);
    };

    const handleStatusChange = (orderId: string, status: OrderStatus, options?: { shippingInfo?: { carrier: string; trackingNumber: string; }, cancellationReason?: string}) => {
        const formData = new FormData();
        formData.append('orderId', orderId);
        formData.append('status', status);
        formData.append('locale', locale);
        if (options?.shippingInfo) {
            formData.append('shippingCarrier', options.shippingInfo.carrier);
            formData.append('trackingNumber', options.shippingInfo.trackingNumber);
        }
        if (options?.cancellationReason) {
            formData.append('cancellationReason', options.cancellationReason);
        }

        startTransition(async () => {
            const result = await updateOrderStatus(formData);
            if (result.success) {
                dispatch({ type: 'UPDATE_STATUS', payload: { 
                    orderId,
                    newStatus: status, 
                    shippingInfo: options?.shippingInfo,
                    cancellationReason: options?.cancellationReason 
                }});
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
    
    const processedOrders = useMemo(() => {
        const activeStatuses: OrderStatus[] = ['commandée', 'en cours de préparation', 'expédiée'];
        const archivedStatuses: OrderStatus[] = ['livrée', 'annulée'];
        
        const statusFilter = tab === 'active' ? activeStatuses : archivedStatuses;
        
        return orders
            .filter(order => {
                if (!statusFilter.includes(order.status)) {
                    return false;
                }
                if (searchTerm && !order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) && !order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())) {
                    return false;
                }
                return true;
            })
            .sort((a, b) => {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
            });
    }, [orders, searchTerm, tab, sortOrder]);
    
    const handleCopyEmail = (email: string) => {
        navigator.clipboard.writeText(email);
        toast({
            description: t('email_copied'),
        });
    }

    const handleShipConfirm = (trackingNumber: string, shippingCarrier: string) => {
        if (!selectedOrderForShipping) return;
        handleStatusChange(selectedOrderForShipping.id, 'expédiée', { shippingInfo: { carrier: shippingCarrier, trackingNumber } });
        setIsShipDialogOpen(false);
        setSelectedOrderForShipping(null);
    }
    
    const handleMobileShipClick = (order: Order) => {
        setSelectedOrderForShipping(order);
        setIsShipDialogOpen(true);
    };

    return (
        <>
            <Card>
                <CardHeader>
                     <CardTitle className="text-xl font-headline flex items-center gap-2">
                        <Package /> {t('orders_title')}
                    </CardTitle>
                    <CardDescription>
                        {t('orders_description')}
                    </CardDescription>
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 pt-4">
                        <div className="relative w-full md:w-auto md:flex-grow md:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('search_placeholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as any)}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder={t('sort_by_date')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="desc">{t('sort_newest')}</SelectItem>
                                <SelectItem value="asc">{t('sort_oldest')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={tab} onValueChange={(value) => setTab(value as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="active">Commandes Actives</TabsTrigger>
                            <TabsTrigger value="archived">Commandes Terminées</TabsTrigger>
                        </TabsList>
                        <TabsContent value="active">
                            <OrderTableContent orders={processedOrders} />
                        </TabsContent>
                         <TabsContent value="archived">
                            <OrderTableContent orders={processedOrders} />
                        </TabsContent>
                    </Tabs>

                </CardContent>
            </Card>
            {selectedOrderForShipping && (
                <ShipOrderDialog
                    order={selectedOrderForShipping}
                    onConfirm={handleShipConfirm}
                    t={t}
                    isOpen={isShipDialogOpen}
                    onOpenChange={setIsShipDialogOpen}
                >
                    <button className="hidden"></button>
                </ShipOrderDialog>
            )}
        </>
    );

    function OrderTableContent({ orders }: { orders: Order[] }) {
        return (
            <>
                {/* Desktop Table View */}
                <div className="hidden md:block mt-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('order_number')}</TableHead>
                                <TableHead>{t('date')}</TableHead>
                                <TableHead>{t('customer')}</TableHead>
                                <TableHead>{t('delivery_method')}</TableHead>
                                <TableHead>{t('total')}</TableHead>
                                <TableHead>{t('status')}</TableHead>
                                <TableHead className="text-right">{t('actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.length > 0 ? (
                                orders.map(order => (
                                    <OrderRow 
                                        key={order.id}
                                        order={order}
                                        isOpen={openOrders.has(order.id)}
                                        onToggle={() => toggleOrder(order.id)}
                                        onStatusChange={handleStatusChange}
                                        onItemStatusChange={handleItemStatusChange}
                                        t={t}
                                        tStatus={tStatus}
                                        isPending={isPending}
                                        onEditShipping={() => handleOpenShipDialog(order)}
                                    />
                            ))
                            ) : (
                                 <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24">
                                       {t('no_orders')}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4 mt-4">
                     {orders.length > 0 ? (
                        orders.map(order => (
                            <Card key={order.id} className={cn("overflow-hidden", isPending && 'opacity-50')}>
                                <div className="p-4 cursor-pointer" onClick={() => toggleOrder(order.id)}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold">{order.orderNumber}</p>
                                            <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div onClick={e => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <EllipsisVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    {(['commandée', 'en cours de préparation', 'expédiée', 'livrée'] as OrderStatus[]).map(status => (
                                                        <DropdownMenuItem 
                                                            key={status} 
                                                            onSelect={(e) => {
                                                                e.preventDefault();
                                                                if (status === 'expédiée') {
                                                                    handleMobileShipClick(order)
                                                                } else {
                                                                    handleStatusChange(order.id, status)
                                                                }
                                                            }}
                                                            disabled={order.status === status || order.status === 'annulée'}
                                                        >
                                                          {t('update_status_to', { status: tStatus(status) })}
                                                        </DropdownMenuItem>
                                                    ))}
                                                    <DropdownMenuSeparator />
                                                    <CancelOrderDialog onConfirm={(reason) => handleStatusChange(order.id, 'annulée', {cancellationReason: reason})} t={t}>
                                                        <DropdownMenuItem 
                                                            onSelect={(e) => e.preventDefault()}
                                                            disabled={order.status === 'annulée'} 
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <FileX className="mr-2 h-4 w-4"/>
                                                            {t('cancel_order')}
                                                        </DropdownMenuItem>
                                                    </CancelOrderDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-col items-start gap-2">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm">{order.customerEmail}</p>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleCopyEmail(order.customerEmail); }}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div className="w-full flex justify-between items-center">
                                            <p className="font-bold text-lg">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(order.totalPrice)}</p>
                                            <Badge variant="outline" className={cn(statusVariants[order.status])}>
                                                {tStatus(order.status)}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                {openOrders.has(order.id) && (
                                    <OrderDetails 
                                        order={order} 
                                        onItemStatusChange={handleItemStatusChange} 
                                        onStatusChange={handleStatusChange} 
                                        t={t} 
                                        onEditShipping={() => handleOpenShipDialog(order)}
                                    />
                                )}
                            </Card>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-10">{t('no_orders')}</p>
                    )}
                </div>
            </>
        )
    }
}
