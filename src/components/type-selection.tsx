
"use client";

import Link from 'next/link';
import type { JewelryType } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

interface TypeSelectionProps {
    jewelryTypes: JewelryType[];
    locale: string;
}

export function TypeSelection({ jewelryTypes, locale }: TypeSelectionProps) {
    const [loadingTypeId, setLoadingTypeId] = useState<string | null>(null);
    const t = useTranslations('HomePage');

    const renderCardContent = (type: JewelryType) => (
        <>
            {type.models.length === 0 && (
                <Badge variant="secondary" className="absolute top-2 right-2">{t('coming_soon')}</Badge>
            )}
            <CardContent className="p-6 flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <type.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-headline">{type.name}</h3>
                <p className="text-sm text-muted-foreground">{type.description}</p>
            </CardContent>
        </>
    );

    return (
        <section className="text-center">
            <h2 className="text-3xl font-headline tracking-tight mb-4">{t('title')}</h2>
            <p className="text-muted-foreground mb-12 max-w-2xl mx-auto">{t('subtitle')}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {jewelryTypes.map((type) => {
                    const isDisabled = type.models.length === 0;

                    if (isDisabled) {
                        return (
                             <Card key={type.id} className="relative opacity-50 cursor-not-allowed">
                                {renderCardContent(type)}
                            </Card>
                        )
                    }

                    return (
                        <Link 
                            key={type.id} 
                            href={`/${locale}/?type=${type.id}`} 
                            className="contents"
                            onClick={() => setLoadingTypeId(type.id)}
                        >
                            <Card className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-transform duration-300 relative">
                                {loadingTypeId === type.id && (
                                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded-lg">
                                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                    </div>
                                )}
                                {renderCardContent(type)}
                            </Card>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
