
'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getAuth, onAuthStateChanged, User as FirebaseUser, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { app, db } from '@/lib/firebase';
import type { User } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { logout as serverLogout } from '@/app/actions/auth.actions';
import { useParams, useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || 'fr';

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/firebase.User
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            setUser({ uid: fbUser.uid, ...userDoc.data() } as User);
        } else {
            // This case can happen if the user was deleted from firestore but not from auth
            // or during sign up process.
            setUser(null);
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    const auth = getAuth(app);
    try {
      await firebaseSignOut(auth);
      await serverLogout(locale);
      router.push(`/${locale}`);
      router.refresh();
    } catch (error) {
      console.error("Error signing out: ", error);
      await serverLogout(locale);
      router.push(`/${locale}`);
      router.refresh();
    }
  }, [locale, router]);


  if (loading) {
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
