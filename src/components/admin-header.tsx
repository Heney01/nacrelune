
'use client';

import Link from 'next/link';
import { BrandLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { UserNav } from '@/components/ui/user-nav';


export function AdminHeader({ locale }: { locale: string}) {
    return (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
             <div className="container mx-auto flex justify-between items-center">
                <Link href={`/${locale}`} className="flex items-center gap-2">
                    <BrandLogo className="h-8 w-auto" />
                </Link>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/">
                            <Home className="h-5 w-5"/>
                            <span className="sr-only">Retour au site</span>
                        </Link>
                    </Button>
                    <UserNav locale={locale} />
                </div>
            </div>
        </header>
    )
}
