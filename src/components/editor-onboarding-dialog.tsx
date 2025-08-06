
'use client';

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Gem, Move, WandSparkles, CheckCircle } from 'lucide-react';
import { useTranslations } from '@/hooks/use-translations';

interface EditorOnboardingDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function EditorOnboardingDialog({ isOpen, onOpenChange }: EditorOnboardingDialogProps) {
    const t = useTranslations('Editor');

    const steps = [
        {
            icon: Gem,
            title: "1. Choisissez vos breloques",
            description: "Parcourez les catégories dans le panneau de gauche et cliquez sur une breloque pour la sélectionner."
        },
        {
            icon: Move,
            title: "2. Positionnez votre création",
            description: "Glissez-déposez les breloques sur le bijou. Cliquez sur une breloque déjà placée pour la faire pivoter ou la supprimer."
        },
        {
            icon: WandSparkles,
            title: "3. Demandez l'avis de l'IA",
            description: "Utilisez le panneau de droite pour obtenir des suggestions de design intelligentes ou une analyse de votre création."
        },
        {
            icon: CheckCircle,
            title: "4. Finalisez et commandez",
            description: "Une fois satisfait, cliquez sur 'Terminer' pour ajouter votre bijou unique au panier et le publier si vous le souhaitez."
        }
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl text-center">Bienvenue dans l'atelier de création !</DialogTitle>
                    <DialogDescription className="text-center">
                        Suivez ces quelques étapes pour donner vie à votre bijou.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    {steps.map((step, index) => (
                        <div key={index} className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <step.icon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h4 className="font-semibold">{step.title}</h4>
                                <p className="text-sm text-muted-foreground">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)} className="w-full">J'ai compris, à moi de jouer !</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
