import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NacreluneLogo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/[locale]/login/actions";
import { ModelsManager } from "@/components/models-manager";
import { getJewelryTypesAndModels } from "@/lib/data";
import { Gem, HandMetal, Ear, User, Wrench } from "lucide-react";
import type { JewelryType } from "@/lib/types";
import { TestDeleteButton } from "@/components/test-delete-button";

export default async function AdminDashboard({ params }: { params: { locale: string }}) {
  const JEWELRY_TYPES_INFO: Omit<JewelryType, 'models' | 'icon'>[] = [
    { id: 'necklace', name: "Colliers", description: "" },
    { id: 'bracelet', name: "Bracelets", description: "" },
    { id: 'earring', name: "Boucles d'oreilles", description: "" },
  ];
  const jewelryTypes = await getJewelryTypesAndModels(JEWELRY_TYPES_INFO);
  
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
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Tableau de bord</h2>
          </div>
          <Tabs defaultValue="models" className="space-y-4">
            <TabsList>
              <TabsTrigger value="models">
                <Gem className="mr-2 h-4 w-4" />
                Gérer les modèles
              </TabsTrigger>
              <TabsTrigger value="charms" disabled>
                <Wrench className="mr-2 h-4 w-4" />
                Gérer les breloques
              </TabsTrigger>
              <TabsTrigger value="users" disabled>
                  <User className="mr-2 h-4 w-4" />
                  Gérer les utilisateurs
              </TabsTrigger>
            </TabsList>
            <TabsContent value="models" className="space-y-4">
              <ModelsManager initialJewelryTypes={jewelryTypes} locale={params.locale} />
            </TabsContent>
          </Tabs>
          <TestDeleteButton />
        </div>
      </div>
    </div>
  );
}
