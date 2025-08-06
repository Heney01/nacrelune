import { ReactNode } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function LegalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;

  return (
    <div className="flex flex-col min-h-screen bg-stone-50">
      <header className="p-4 border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <BrandLogo className="h-8 w-auto text-foreground" />
          </Link>
        </div>
      </header>
      <main className="flex-grow py-8 md:py-12">
        <div className="container mx-auto max-w-4xl px-4">
            <div className="mb-8">
                <Button variant="ghost" asChild>
                    <Link href={`/${locale}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Retour à l'accueil
                    </Link>
                </Button>
            </div>
            <div className="bg-white p-6 sm:p-8 md:p-10 rounded-lg shadow-sm border">
                 {children}
            </div>
        </div>
      </main>
      <footer className="p-4 border-t bg-white">
          <div className="container mx-auto text-center text-muted-foreground text-sm">
            <p>© {new Date().getFullYear()} Atelier à bijoux. Tous droits réservés.</p>
          </div>
        </footer>
    </div>
  );
}
