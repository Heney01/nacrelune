
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserCircle, LogOut, User } from 'lucide-react';
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
import { logout } from '@/app/actions/auth.actions';
import { useTranslations } from '@/hooks/use-translations';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export function UserNav({ locale }: { locale: string }) {
    const { user, firebaseUser } = useAuth();
    const t = useTranslations('HomePage');
    const tAuth = useTranslations('Auth');

    if (!firebaseUser) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button asChild variant="outline" size="icon">
                            <Link href={`/${locale}/connexion`}>
                                <UserCircle className="h-6 w-6" />
                                <span className="sr-only">{tAuth('login_button')}</span>
                            </Link>
                        </Button>
                    </TooltipTrigger>
                     <TooltipContent>
                        <p>{tAuth('login_button')}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
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
                    <span className="sr-only">{t('profile_menu_button')}</span>
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
                <DropdownMenuItem asChild>
                     <Link href={`/${locale}/profil`}>
                        <User className="mr-2 h-4 w-4" />
                        <span>{tAuth('my_creations')}</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={logout}>
                    <input type="hidden" name="locale" value={locale} />
                    <DropdownMenuItem asChild>
                        <button type="submit" className="w-full">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>{tAuth('logout_button')}</span>
                        </button>
                    </DropdownMenuItem>
                </form>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
