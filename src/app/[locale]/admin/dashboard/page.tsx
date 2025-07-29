
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { NacreluneLogo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/actions";
import { ModelsManager } from "@/components/models-manager";
import { getJewelryTypesAndModels } from "@/lib/data";
import { Gem, User, Wrench, ChevronRight } from "lucide-react";
import type { JewelryType } from "@/lib/types";
import Link from "next/link";

export default async function AdminDashboard({ params }: { params: { locale: string }}) {
  const JEWELRY_TYPES_INFO: Omit<JewelryType, 'models' | 'icon'>[] = [
    { id: 'necklace', name: "Colliers", description: "" },
    { id: 'bracelet', name: "Bracelets", description: "" },
    { id: 'earring', name: "Boucles d'oreilles", description: "" },
  ];
  const jewelryTypes = await getJewelryTypesAndModels(JEWELRY_TYPES_INFO);
  
  const adminSections = [
    {
      value: 'models',
      title: 'Gérer les modèles',
      description: 'Ajouter, modifier ou supprimer les types de bijoux.',
      icon: Gem,
      component: <ModelsManager initialJewelryTypes={jewelryTypes} locale={params.locale} />,
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

  return (
    <div className="bg-muted/40 min-h-screen">
      <div className="flex-col md:flex">
        <div className="border-b">
          <div className="flex h-16 items-center px-4">
            <NacreluneLogo className="h-8 w-auto" />
            <div className="ml-auto flex items-center space-x-4">
              <form action={logout}>
                  <input type="hidden" name="locale" value={params.locale} />
                  <Button variant="ghost">
                      Se déconnecter
                  </Button>
              </form>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Tableau de bord</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
             {adminSections.slice(0, 1).map(section => (
                <Card key={section.value} className="md:col-span-2 lg:col-span-3">
                   <CardHeader>
                        <CardTitle>{section.title}</CardTitle>
                        <CardDescription>{section.description}</CardDescription>
                   </CardHeader>
                   <CardContent>
                        {section.component}
                   </CardContent>
                </Card>
             ))}
          </div>
          
           <div>
                <h3 className="text-xl font-bold tracking-tight mb-4">Autres outils</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {adminSections.slice(1).map(section => (
                        <Card 
                            key={section.value} 
                            className={`flex flex-col justify-between ${section.disabled ? 'bg-muted/50 cursor-not-allowed' : 'hover:border-primary/50'}`}
                        >
                            <div>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">{section.title}</CardTitle>
                                    <section.icon className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">
                                        {section.description}
                                    </p>
                                </CardContent>
                            </div>
                            <div className="p-4 pt-0">
                                <Button size="sm" className="w-full" disabled={section.disabled}>
                                    Accéder
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
