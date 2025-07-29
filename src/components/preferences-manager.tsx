
'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Settings } from 'lucide-react';
import type { GeneralPreferences } from '@/lib/types';
import { savePreferences } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from './ui/card';
import { useToast } from '@/hooks/use-toast';

interface PreferencesManagerProps {
    initialPreferences: GeneralPreferences;
    locale: string;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin mr-2" />}
            Enregistrer les préférences
        </Button>
    )
}

const initialState = { success: false, message: '' };

export function PreferencesManager({ initialPreferences, locale }: PreferencesManagerProps) {
    const { toast } = useToast();
    const [state, formAction] = useFormState(savePreferences, initialState);

    useEffect(() => {
        if (state.success) {
            toast({ title: 'Succès', description: state.message });
        } else if (state.message) {
            toast({ variant: 'destructive', title: 'Erreur', description: state.message });
        }
    }, [state, toast]);
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl font-headline flex items-center gap-2">
                    <Settings/> Préférences Générales
                </CardTitle>
                <CardDescription>
                    Gérer les réglages globaux de l'application, comme les seuils de stock.
                </CardDescription>
            </CardHeader>
            <form action={formAction}>
                <CardContent className="grid gap-6">
                     {state && !state.success && state.message && (
                        <Alert variant="destructive" className="my-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Erreur</AlertTitle>
                            <AlertDescription>{state.message}</AlertDescription>
                        </Alert>
                    )}
                    <input type="hidden" name="locale" value={locale} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="alertThreshold">Seuil d'alerte de stock</Label>
                            <Input 
                                id="alertThreshold" 
                                name="alertThreshold" 
                                type="number" 
                                defaultValue={initialPreferences.alertThreshold} 
                                required 
                            />
                            <p className="text-sm text-muted-foreground">
                                Quand le stock d'un article atteint ce niveau, une alerte est visible.
                            </p>
                        </div>

                         <div className="space-y-2">
                            <Label htmlFor="criticalThreshold">Seuil critique de stock</Label>
                            <Input 
                                id="criticalThreshold" 
                                name="criticalThreshold" 
                                type="number" 
                                defaultValue={initialPreferences.criticalThreshold} 
                                required 
                            />
                            <p className="text-sm text-muted-foreground">
                                Quand le stock d'un article atteint ce niveau, l'alerte devient critique.
                            </p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <SubmitButton />
                </CardFooter>
            </form>
        </Card>
    );
}
