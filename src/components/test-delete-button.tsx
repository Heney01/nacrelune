
'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"
import { deleteModel } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function TestDeleteButton() {
    const { toast } = useToast();

    const handleConfirmDelete = async () => {
        console.log("--- [TEST BUTTON] OK CLICKED (Client) ---");
        // We pass an empty FormData object to simulate the call structure
        const result = await deleteModel(new FormData());
        console.log("--- [TEST BUTTON] ACTION RESULT (Client):", result);

        if (result?.success) {
            toast({
                title: 'Test Réussi',
                description: result.message,
            });
        } else {
             toast({
                variant: 'destructive',
                title: 'Test Échoué',
                description: result?.message || 'Une erreur inconnue est survenue.',
            });
        }
    };

    return (
        <div className="my-4 p-4 border-2 border-dashed border-destructive rounded-lg">
            <h3 className="font-bold text-lg mb-2">Zone de Test de Suppression</h3>
            <p className="text-sm text-muted-foreground mb-4">Ce bouton appelle la même action `deleteModel` que celle du tableau de bord administrateur.</p>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                        Tester l'action Delete
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Cette action va appeler la fonction `deleteModel` côté serveur avec des données vides à des fins de test.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">OK</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
