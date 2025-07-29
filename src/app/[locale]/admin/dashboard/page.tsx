
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { NacreluneLogo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/actions";
import { ModelsManager } from "@/components/models-manager";
import { Gem, User, Wrench, ChevronRight, ArrowLeft } from "lucide-react";
import type { JewelryType } from "@/lib/types";
import Link from "next/link";

interface AdminDashboardProps {
    initialJewelryTypes: Omit<JewelryType, 'icon'>[];
    locale: string;
}

function AdminDashboardClient({ initialJewelryTypes, locale }: AdminDashboardProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const adminSections = [
    {
      value: 'models',
      title: 'Gérer les modèles',
      description: 'Ajouter, modifier ou supprimer les types de bijoux.',
      icon: Gem,
      component: <ModelsManager initialJewelryTypes={initialJewelryTypes} locale={locale} />,
      disabled: false,
    },
    {
      value: 'charms',
      title: 'Gérer les breloques',
      description: 'Gérer la collection de breloques disponibles.',
      icon: Wrench,
      component: null,
      disabled: true,
    },
    {
      value: 'users',
      title: 'Gérer les utilisateurs',
      description: 'Consulter et gérer les comptes des utilisateurs.',
      icon: User,
      component: null,
      disabled: true,
    },
  ];

  const activeComponent = adminSections.find(s => s.value === selectedSection)?.component;

  return (
    <div className="bg-muted/40 min-h-screen">
      <div className="flex-col md:flex">
        <div className="border-b">
          <div className="flex h-16 items-center px-4">
            <NacreluneLogo className="h-8 w-auto" />
            <div className="ml-auto flex items-center space-x-4">
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
                                        <CardTitle className="text-lg font-medium">{section.title}</CardTitle>
                                        <section.icon className="h-5 w-5 text-muted-foreground" />
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


// We keep the server component to fetch data initially
import { getJewelryTypesAndModels } from "@/lib/data";

export default async function AdminDashboard({ params }: { params: { locale: string }}) {
  const JEWELRY_TYPES_INFO: Omit<JewelryType, 'models' | 'icon'>[] = [
    { id: 'necklace', name: "Colliers", description: "" },
    { id: 'bracelet', name: "Bracelets", description: "" },
    { id: 'earring', name: "Boucles d'oreilles", description: "" },
  ];
  const jewelryTypes = await getJewelryTypesAndModels(JEWELRY_TYPES_INFO);
  
  return <AdminDashboardClient initialJewelryTypes={jewelryTypes} locale={params.locale} />;
}
