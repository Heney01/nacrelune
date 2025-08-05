

import { BrandLogo } from '@/components/icons';
import { LoginForm } from '@/components/login-form';
import { Button } from '@/components/ui/button';
import { Truck } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage({ params }: { params: { locale: string }}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
       <header className="p-4 border-b bg-white/50 backdrop-blur-lg sticky top-0 z-10">
          <div className="container mx-auto flex justify-between items-center">
            <Link href={`/${params.locale}`} className="flex items-center gap-2">
              <BrandLogo className="h-8 w-auto" />
            </Link>
             <Button asChild variant="ghost" size="icon">
                <Link href={`/${params.locale}/orders/track`}>
                    <Truck className="h-6 w-6" />
                    <span className="sr-only">Suivre ma commande</span>
                </Link>
            </Button>
          </div>
        </header>
        <main className="flex-grow flex items-center justify-center">
            <div className="w-full max-w-sm p-4">
                <LoginForm isUserAuth={true}/>
            </div>
        </main>
    </div>
  );
}
