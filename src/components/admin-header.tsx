
'use client';

import Link from 'next/link';
import { BrandLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Home, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function UserNav({ locale }: { locale: string }) {
    const { user, firebaseUser, signOut } = useAuth();

    if (!firebaseUser) {
        return (
            <Button asChild variant="ghost" size="icon">
                <Link href={`/${locale}/connexion`}>
                    <UserCircle className="h-6 w-6" />
                    <span className="sr-only">Connexion</span>
                </Link>
            </Button>
        )
    }
    
    const fallbackDisplayName = user?.displayName?.charAt(0) || firebaseUser?.email?.charAt(0) || '?';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.photoURL || firebaseUser.photoURL || undefined} alt={user?.displayName || 'Avatar'} />
                        <AvatarFallback>{fallbackDisplayName.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="sr-only">Menu du profil</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.displayName || firebaseUser.email}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user?.email || firebaseUser.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Déconnexion</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}


export function AdminHeader({ locale }: { locale: string}) {
    return (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
             <div className="container mx-auto flex justify-between items-center">
                <Link href={`/${locale}`} className="flex items-center gap-2">
                    <BrandLogo className="h-8 w-auto text-foreground" />
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
