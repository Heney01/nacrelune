
'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function NotFound() {
  const pathname = usePathname();

  useEffect(() => {
    console.log(`[404 TRACE] Page not found for path: ${pathname}`);
  }, [pathname]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-stone-50 text-center">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <h2 className="mt-4 text-2xl font-headline">Page introuvable</h2>
      <p className="mt-2 text-muted-foreground">
        Désolé, nous n'avons pas pu trouver la page que vous cherchez.
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        Chemin demandé : <code>{pathname}</code>
      </p>
      <Link href="/" className="mt-6 inline-block rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
        Retour à l'accueil
      </Link>
    </div>
  );
}
