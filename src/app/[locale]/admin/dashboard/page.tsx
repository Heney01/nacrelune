
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Box, Tag, Package, Settings, BarChart2, Mail, LayoutDashboard, ArrowLeft } from "lucide-react";
import { ModelsManager } from '@/components/models-manager';
import type { JewelryType, Charm, CharmCategory, GeneralPreferences, Order, MailLog } from '@/lib/types';
import { CharmsManager } from '@/components/charms-manager';
import { PreferencesManager } from '@/components/preferences-manager';
import { OrdersManager } from '@/components/orders-manager';
import { MailManager } from '@/components/mail-manager';


type AdminData = {
    jewelryTypes: Omit<JewelryType, 'icon'>[];
    charms: (Charm & { categoryName?: string; })[];
    charmCategories: CharmCategory[];
    preferences: GeneralPreferences;
    orders: Order[];
    mailLogs: MailLog[];
}

export default function AdminDashboardPage({ params }: { params: { locale: string }}) {
    const [data, setData] = useState<AdminData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch('/api/admin-data');
                if (!response.ok) {
                    throw new Error('Failed to fetch admin data');
                }
                const adminData = await response.json();
                setData(adminData);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'orders', label: 'Commandes', icon: Package },
        { id: 'models', label: 'Modèles', icon: Box },
        { id: 'charms', label: 'Breloques', icon: Tag },
        { id: 'statistics', label: 'Statistiques', icon: BarChart2 },
        { id: 'mail', label: 'E-mails', icon: Mail },
        { id: 'preferences', label: 'Préférences', icon: Settings },
    ];
    
    const renderContent = () => {
        if (loading || !data) {
            return (
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                </div>
            )
        }
        
        const currentTab = tabs.find(t => t.id === activeTab);
        
        return (
            <div>
                 {activeTab !== 'dashboard' && (
                    <div className="sm:hidden mb-4">
                        <Button variant="outline" onClick={() => setActiveTab('dashboard')}>
                            <ArrowLeft className="mr-2 h-4 w-4"/>
                            Retour au Dashboard
                        </Button>
                    </div>
                )}
                {(() => {
                    switch(activeTab) {
                        case 'dashboard':
                            return (
                                <div className="space-y-6">
                                    <CardTitle className="text-2xl font-headline">Bienvenue sur votre tableau de bord</CardTitle>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {tabs.filter(t => t.id !== 'dashboard').map(tab => (
                                            <Card key={tab.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab(tab.id)}>
                                                <CardHeader>
                                                    <CardTitle className="flex items-center gap-2 text-xl">
                                                        <tab.icon className="w-6 h-6 text-primary" />
                                                        {tab.label}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="text-muted-foreground text-sm">
                                                        Accédez au module de gestion des {tab.label.toLowerCase()}.
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            );
                        case 'models':
                            return <ModelsManager initialJewelryTypes={data.jewelryTypes} locale={params.locale} preferences={data.preferences} />;
                        case 'charms':
                             return <CharmsManager initialCharms={data.charms} initialCharmCategories={data.charmCategories} locale={params.locale} preferences={data.preferences} />;
                        case 'preferences':
                            return <PreferencesManager initialPreferences={data.preferences} locale={params.locale} />;
                        case 'orders':
                            return <OrdersManager initialOrders={data.orders} locale={params.locale} />;
                         case 'mail':
                            return <MailManager initialMailLogs={data.mailLogs} />;
                        case 'statistics':
                             return (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Statistiques</CardTitle>
                                        <CardDescription>Cette section est en cours de construction.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                         <div className="flex justify-center items-center h-48 border-2 border-dashed rounded-lg">
                                            <p className="text-muted-foreground">Bientôt disponible</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        default:
                            return null;
                    }
                })()}
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-muted/40">
            <aside className="hidden w-64 flex-col border-r bg-background sm:flex">
                <div className="border-b p-4">
                    <h1 className="text-xl font-bold font-headline">Tableau de bord</h1>
                </div>
                <nav className="flex-1 space-y-2 p-4">
                    {tabs.map((tab) => (
                         <Button 
                            key={tab.id}
                            variant={activeTab === tab.id ? 'secondary' : 'ghost'} 
                            className="w-full justify-start"
                            onClick={() => setActiveTab(tab.id)}
                         >
                           <tab.icon className="mr-2 h-4 w-4" />
                           {tab.label}
                         </Button>
                    ))}
                </nav>
            </aside>
            <main className="flex-1 p-4 sm:p-8">
               {renderContent()}
            </main>
        </div>
    );
}
