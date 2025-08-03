

import { redirect } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { app, db } from '@/lib/firebase';
import { Creation } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';

// This is a server component to fetch user's creations
async function getUserCreations(userId: string): Promise<Creation[]> {
    const creationsRef = collection(db, 'creations');
    const q = query(creationsRef, where('creatorId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data
        } as Creation;
    });
}


export default async function ProfilePage({ params }: { params: { locale: string }}) {
  // This is a simplified way to get the user on the server.
  // In a real app, you'd use a more robust session management system.
  // For now, this is a placeholder and will not work without a user session.
  // We will need to implement a way to get the current user's ID on the server.
  const userId = null; // Placeholder for user ID

  if (!userId) {
     // For now, redirect to login if no user is found.
     // This logic will be improved.
     // redirect(`/${params.locale}/connexion`);
  }

  // const creations = await getUserCreations(userId);

  return (
    <div className="container mx-auto py-12">
        <h1 className="text-3xl font-headline mb-8">Mon Profil</h1>

        <Card>
            <CardHeader>
                <CardTitle>Mes Créations Publiées</CardTitle>
            </CardHeader>
            <CardContent>
                {/* 
                {creations.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {creations.map(creation => (
                            <Link href={`/${params.locale}/creations/${creation.id}`} key={creation.id}>
                                <Card className="overflow-hidden">
                                    <Image src={creation.previewImageUrl} alt={creation.name} width={300} height={300} className="w-full h-auto object-cover"/>
                                    <div className="p-4">
                                        <h3 className="font-semibold">{creation.name}</h3>
                                        <p className="text-sm text-muted-foreground">{creation.salesCount} ventes</p>
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-8">Vous n'avez pas encore publié de création.</p>
                )}
                */}
                 <p className="text-muted-foreground text-center py-8">La fonctionnalité de publication de créations est en cours de développement. Bientôt, vous pourrez voir vos créations ici !</p>
            </CardContent>
        </Card>
    </div>
  );
}
