
'use client';

import { MyOrdersClient } from '@/components/my-orders-client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function MyOrdersPage({ params }: { params: { locale: string } }) {
    return (
        <div className="flex flex-col min-h-screen bg-stone-50">
            <main className="flex-grow p-4 md:p-8">
                <div className="container mx-auto max-w-4xl">
                     <div className="flex justify-start mb-8">
                        <Button variant="ghost" asChild>
                            <Link href={`/${params.locale}/profil`}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Retour au profil
                            </Link>
                        </Button>
                    </div>
                    
                    <MyOrdersClient />
                    
                </div>
            </main>
        </div>
    );
}
