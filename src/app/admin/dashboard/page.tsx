
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { logout } from "@/app/login/actions";
import { NacreluneLogo } from "@/components/icons";

export default function AdminDashboard() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <div className="mx-auto mb-4">
                <NacreluneLogo className="h-10 w-auto" />
            </div>
            <CardTitle>Bienvenue !</CardTitle>
            <CardDescription>Vous êtes connecté à l'espace administrateur.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-center text-sm text-muted-foreground">
                Cet espace est en cours de construction. Revenez bientôt pour découvrir de nouvelles fonctionnalités de gestion.
            </p>
        </CardContent>
        <CardContent>
            <form action={logout}>
                <Button variant="outline" className="w-full">
                Se déconnecter
                </Button>
            </form>
        </CardContent>
      </Card>
    </div>
  );
}
