

'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BrandLogo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/actions";
import { ModelsManager } from "@/components/models-manager";
import { CharmsManager } from "@/components/charms-manager";
import { PreferencesManager } from "@/components/preferences-manager";
import { OrdersManager } from "@/components/orders-manager";
import { MailManager } from "@/components/mail-manager";
import { Gem, User, Wrench, ChevronRight, ArrowLeft, Settings, AlertTriangle, Package, PackageCheck, CookingPot, Truck, Mail } from "lucide-react";
import type { JewelryType, Charm, CharmCategory, GeneralPreferences, Order, OrderStatus, MailLog, JewelryModel } from "@/lib/types";
import Link from "next/link";
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslations } from '@/hooks/use-translations';

interface AdminDashboardProps {
    locale: string;
}

type StockableItem = Charm | JewelryModel;

const getItemsAlertState = (
  items: StockableItem[],
  preferences: GeneralPreferences
): 'critical' | 'alert' | 'none' => {
  if (
    items.some(
      (item) => (item.quantity ?? Infinity) <= preferences.criticalThreshold && !item.lastOrderedAt
    )
  ) {
    return 'critical';
  }
  if (
    items.some(
      (item) => (item.quantity ?? Infinity) <= preferences.alertThreshold && !item.lastOrderedAt
    )
  ) {
    return 'alert';
  }
  return 'none';
};

const getOrdersAlertCounts = (orders: Order[]): { [key in OrderStatus]?: number } => {
    const counts: { [key in OrderStatus]?: number } = {};
    for (const order of orders) {
        if (order.status === 'commandée' || order.status === 'en cours de préparation' || order.status === 'expédiée') {
            counts[order.status] = (counts[order.status] || 0) + 1;
        }
    }
    return counts;
};


const AlertIcon = ({ state, message }: { state: 'critical' | 'alert', message: string }) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger>
                <AlertTriangle className={cn(
                    'h-5 w-5',
                    state === 'critical' ? 'text-red-500' : 'text-yellow-500'
                )} />
            </TooltipTrigger>
            <TooltipContent>
                <p>{message}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);


function AdminDashboardClient({ locale }: AdminDashboardProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const tStatus = useTranslations('OrderStatus');
  const [initialData, setInitialData] = useState<{
    jewelryTypes: Omit<JewelryType, 'icon'>[],
    charms: (Charm & { categoryName?: string; })[],
    charmCategories: CharmCategory[],
    preferences: GeneralPreferences,
    orders: Order[],
    mailLogs: MailLog[],
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin-data`);
        if (!res.ok) throw new Error('Failed to fetch admin data');
        const data = await res.json();
        setInitialData(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !initialData) {
      return (
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
  }

  const { jewelryTypes, charms, charmCategories, preferences, orders, mailLogs } = initialData;
  
  const modelsAlertState = getItemsAlertState(jewelryTypes.flatMap(jt => jt.models), preferences);
  const charmsAlertState = getItemsAlertState(charms, preferences);
  const ordersAlertCounts = getOrdersAlertCounts(orders);
  const mailErrorCount = mailLogs.filter(log => log.delivery?.state === 'ERROR').length;


  const OrderStatusIndicator = ({status, count}: {status: OrderStatus, count: number}) => {
    const ICONS: Record<OrderStatus, React.ElementType> = {
        'commandée': PackageCheck,
        'en cours de préparation': CookingPot,
        'expédiée': Truck,
        'livrée': Gem, // Fallback
        'annulée': AlertTriangle // Fallback
    }
    const COLORS: Record<OrderStatus, string> = {
        'commandée': 'text-blue-600 bg-blue-100',
        'en cours de préparation': 'text-yellow-600 bg-yellow-100',
        'expédiée': 'text-purple-600 bg-purple-100',
        'livrée': '',
        'annulée': '',
    }
    const Icon = ICONS[status];
    
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>
                     <div className={cn("flex items-center gap-2 text-sm font-medium p-1 pr-2 rounded-full", COLORS[status])}>
                        <Icon className="h-4 w-4" />
                        <span>{count}</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{count} {count > 1 ? 'commandes' : 'commande'} {tStatus(status).toLowerCase()}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
  }


  const adminSections = [
    {
      value: 'models',
      title: 'Gérer les modèles',
      description: 'Ajouter, modifier ou supprimer les types de bijoux.',
      icon: Gem,
      component: <ModelsManager initialJewelryTypes={jewelryTypes} locale={locale} preferences={preferences} />,
      disabled: false,
      alertState: modelsAlertState,
      alertMessage: "Un ou plusieurs articles ont un stock bas ou critique.",
    },
    {
      value: 'charms',
      title: 'Gérer les breloques',
      description: 'Gérer la collection de breloques et leurs catégories.',
      icon: Wrench,
      component: <CharmsManager initialCharms={charms} initialCharmCategories={charmCategories} locale={locale} preferences={preferences} />,
      disabled: false,
      alertState: charmsAlertState,
      alertMessage: "Un ou plusieurs articles ont un stock bas ou critique.",
    },
    {
      value: 'orders',
      title: 'Gérer les commandes',
      description: 'Consulter et gérer les commandes des clients.',
      icon: Package,
      component: <OrdersManager initialOrders={orders} locale={locale} />,
      disabled: false,
      alertState: (ordersAlertCounts['commandée'] || ordersAlertCounts['en cours de préparation']) ? 'alert' : 'none',
      alertMessage: "Des commandes sont en attente de préparation.",
    },
     {
      value: 'mails',
      title: 'Gérer les e-mails',
      description: 'Consulter l\'historique des e-mails transactionnels.',
      icon: Mail,
      component: <MailManager initialMailLogs={mailLogs} />,
      disabled: false,
      alertState: mailErrorCount > 0 ? 'critical' : 'none',
      alertMessage: `Il y a ${mailErrorCount} e-mail(s) en échec de livraison.`,
    },
    {
      value: 'preferences',
      title: 'Gérer les préférences',
      description: 'Définir les seuils et autres paramètres généraux.',
      icon: Settings,
      component: <PreferencesManager initialPreferences={preferences} locale={locale} />,
      disabled: false,
      alertState: 'none',
      alertMessage: "",
    },
    {
      value: 'users',
      title: 'Gérer les utilisateurs',
      description: 'Consulter et gérer les comptes des utilisateurs.',
      icon: User,
      component: null,
      disabled: true,
      alertState: 'none',
      alertMessage: "",
    },
  ];

  const activeComponent = adminSections.find(s => s.value === selectedSection)?.component;

  return (
    <div className="bg-muted/40 min-h-screen">
      <div className="flex-col md:flex">
        <div className="border-b">
          <div className="flex h-16 items-center px-4 flex-wrap">
            <BrandLogo className="h-8 w-auto" />
            <div className="ml-auto flex items-center space-x-4 flex-wrap">
              <form action={logout}>
                  <input type="hidden" name="locale" value={locale} />
                  <Button variant="ghost">
                      Se déconnecter
                  </Button>
              </form>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
            {activeComponent ? (
                <div>
                    <Button variant="ghost" onClick={() => setSelectedSection(null)} className="mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Retour au tableau de bord
                    </Button>
                    {activeComponent}
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight">Tableau de bord</h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {adminSections.map(section => (
                            <Card 
                                key={section.value} 
                                onClick={() => !section.disabled && setSelectedSection(section.value)}
                                className={`flex flex-col justify-between ${section.disabled ? 'bg-muted/50 cursor-not-allowed' : 'hover:border-primary/50 cursor-pointer'}`}
                            >
                                <div>
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-lg font-medium flex items-center gap-2">
                                            {section.alertState !== 'none' && section.value !== 'orders' && (
                                                <AlertIcon state={section.alertState as 'alert' | 'critical'} message={section.alertMessage} />
                                            )}
                                            {section.title}
                                        </CardTitle>
                                        <div className="flex items-center gap-2">
                                            {section.value === 'orders' && ordersAlertCounts['commandée'] && (
                                                <OrderStatusIndicator status="commandée" count={ordersAlertCounts['commandée']} />
                                            )}
                                             {section.value === 'orders' && ordersAlertCounts['en cours de préparation'] && (
                                                <OrderStatusIndicator status="en cours de préparation" count={ordersAlertCounts['en cours de préparation']} />
                                            )}
                                            {section.value === 'orders' && ordersAlertCounts['expédiée'] && (
                                                <OrderStatusIndicator status="expédiée" count={ordersAlertCounts['expédiée']} />
                                            )}
                                            <section.icon className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">
                                            {section.description}
                                        </p>
                                    </CardContent>
                                </div>
                                <div className="p-4 pt-0">
                                    <Button 
                                      size="sm" 
                                      className="w-full" 
                                      disabled={section.disabled}
                                      variant={section.disabled ? 'secondary' : 'default'}
                                    >
                                        {section.disabled ? "Bientôt disponible" : "Accéder"}
                                        {!section.disabled && <ChevronRight className="ml-2 h-4 w-4" />}
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  );
}


export default function AdminDashboard({ params }: { params: { locale: string }}) {
  return <AdminDashboardClient locale={params.locale} />;
}
