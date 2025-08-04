
import { getCreatorShowcaseData } from '@/lib/data';
import { CreationCard } from '@/components/creation-card';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User } from 'lucide-react';
import { BrandLogo } from '@/components/icons';
import { CartWidget } from '@/components/cart-widget';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export const revalidate = 60; // Revalidate the page every 60 seconds

export default async function CreatorShowcasePage({ params }: { params: { creatorId: string; locale: string } }) {
  const { creatorId, locale } = params;
  const { creator, creations } = await getCreatorShowcaseData(creatorId);

  if (!creator) {
    notFound();
  }
  
  const fallbackDisplayName = creator.displayName?.charAt(0) || creator.email?.charAt(0) || '?';

  return (
    <div className="flex flex-col min-h-screen bg-stone-50">
        <header className="p-4 border-b bg-white sticky top-0 z-20">
            <div className="container mx-auto flex justify-between items-center">
                <Link href={`/${locale}`} className="flex items-center gap-2">
                    <BrandLogo className="h-8 w-auto text-foreground" />
                </Link>
                <div className="flex items-center gap-2">
                    <CartWidget />
                </div>
            </div>
        </header>

        <main className="flex-grow p-4 md:p-8">
            <div className="container mx-auto">
                <div className="flex justify-start mb-8">
                    <Button variant="ghost" asChild>
                        <Link href={`/${locale}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Retour à l'accueil
                        </Link>
                    </Button>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={creator.photoURL || undefined} alt={creator.displayName || 'Avatar'} />
                        <AvatarFallback className="text-2xl">{fallbackDisplayName.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-sm text-muted-foreground">Vitrine de</p>
                        <h1 className="text-3xl font-headline">{creator.displayName}</h1>
                    </div>
                </div>

                <Separator className="my-8" />

                {creations.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {creations.map(creation => (
                            <CreationCard key={creation.id} creation={creation} locale={locale} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 border border-dashed rounded-lg">
                        <h3 className="text-xl font-semibold">{creator.displayName} n'a pas encore publié de création.</h3>
                        <p className="text-muted-foreground mt-2">Revenez bientôt !</p>
                    </div>
                )}
            </div>
        </main>
    </div>
  );
}
