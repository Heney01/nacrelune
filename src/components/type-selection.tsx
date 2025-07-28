
"use client";

import Link from 'next/link';
import type { JewelryType } from "@/lib/types";
import { useTranslations } from "@/hooks/use-translations";
import { Card, CardContent } from "@/components/ui/card";

interface TypeSelectionProps {
    jewelryTypes: JewelryType[];
    onTypeSelect?: (type: Omit<JewelryType, 'models'>) => void;
}

export function TypeSelection({ jewelryTypes }: TypeSelectionProps) {
    const t = useTranslations('HomePage');

    return (
        <section className="text-center">
            <h2 className="text-3xl font-headline tracking-tight mb-4">{t('title')}</h2>
            <p className="text-muted-foreground mb-12 max-w-2xl mx-auto">{t('subtitle')}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {jewelryTypes.map((type) => (
                    <Link key={type.id} href={`?type=${type.id}`} legacyBehavior>
                        <a className="contents">
                            <Card className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-transform duration-300">
                                <CardContent className="p-6 flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                                        <type.icon className="w-8 h-8 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-headline">{t(`jewelry_types.${type.id}`)}</h3>
                                    <p className="text-sm text-muted-foreground">{t(`jewelry_types.${type.id}_description`)}</p>
                                </CardContent>
                            </Card>
                        </a>
                    </Link>
                ))}
            </div>
        </section>
    );
}

