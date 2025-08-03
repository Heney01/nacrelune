

'use client';

import React, { useEffect, useState } from 'react';
import Editor from '@/components/editor';
import { BrandLogo } from '@/components/icons';
import { useTranslations } from '@/hooks/use-translations';
import { Gem, HandMetal, Ear, Truck, UserCircle, LogOut, User } from 'lucide-react';
import { TypeSelection } from '@/components/type-selection';
import { ModelSelection } from '@/components/model-selection';
import type { JewelryType, Charm, CharmCategory } from '@/lib/types';
import Link from 'next/link';
import { CartWidget } from './cart-widget';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { SupportDialog } from './support-dialog';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logout } from '@/app/actions';

function UserNav({ locale }: { locale: string }) {
    const { user, firebaseUser } = useAuth();
    const t = useTranslations('HomePage');
    const tAuth = useTranslations('Auth');

    if (!firebaseUser) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button asChild variant="ghost" size="icon">
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
    
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <User className="h-6 w-6" />
                    <span className="sr-only">{t('profile_menu_button')}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user?.displayName || tAuth('my_account')}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user?.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                     <Link href={`/${locale}/profil`}>{tAuth('my_creations')}</Link>
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


export function HomePageClient({ searchParams, jewelryTypes: initialJewelryTypes, allCharms, charmCategories, locale }: {
    searchParams: { [key:string]: string | string[] | undefined };
    jewelryTypes: Omit<JewelryType, 'icon'>[];
    allCharms: Charm[];
    charmCategories: CharmCategory[];
    locale: string;
}) {
    const t = useTranslations('HomePage');
    const { user } = useAuth();
    const [hasMounted, setHasMounted] = useState(false);
    
    useEffect(() => {
        setHasMounted(true);
    }, []);
    
    const jewelryTypes = initialJewelryTypes.map(jt => {
        if (jt.id === 'necklace') return { ...jt, name: t('jewelry_types.necklace'), description: t('jewelry_types.necklace_description'), icon: Gem };
        if (jt.id === 'bracelet') return { ...jt, name: t('jewelry_types.bracelet'), description: t('jewelry_types.bracelet_description'), icon: HandMetal };
        if (jt.id === 'earring') return { ...jt, name: t('jewelry_types.earring'), description: t('jewelry_types.earring_description'), icon: Ear };
        return { ...jt, icon: Gem }; // fallback
    });
    
    const selectedTypeId = searchParams?.type as JewelryType['id'] | undefined;
    const selectedModelId = searchParams?.model as string | undefined;

    const selectedType = selectedTypeId ? jewelryTypes.find(t => t.id === selectedTypeId) : null;
    const selectedModel = selectedType && selectedModelId ? selectedType.models.find(m => m.id === selectedModelId) : null;
    
    if (selectedModel && selectedType) {
      return <Editor model={selectedModel} jewelryType={selectedType} allCharms={allCharms} charmCategories={charmCategories} />;
    }
  
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
         <header className="p-4 border-b bg-white">
          <div className="container mx-auto flex justify-between items-center flex-wrap">
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <BrandLogo className="h-8 w-auto text-foreground" />
            </Link>
            <div className="flex items-center gap-2 flex-wrap">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button asChild variant="ghost" size="icon">
                                <Link href={`/${locale}/orders/track`}>
                                    <Truck className="h-6 w-6" />
                                    <span className="sr-only">{t('track_order_link')}</span>
                                </Link>
                            </Button>
                        </TooltipTrigger>
                         <TooltipContent>
                            <p>{t('track_order_link')}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
              <UserNav locale={locale} />
              <CartWidget />
            </div>
          </div>
        </header>

        <main className="flex-grow p-4 md:p-8">
          <div className="container mx-auto">
            {hasMounted && user && (
              <div className="text-center mb-8">
                <p className="text-lg text-muted-foreground">{t('welcome_message', { name: user.displayName })}</p>
              </div>
            )}
            {selectedType ? (
                <ModelSelection 
                    selectedType={selectedType}
                    locale={locale}
                />
            ) : (
                <TypeSelection jewelryTypes={jewelryTypes} locale={locale} />
            )}
          </div>
        </main>
        
        <footer className="p-4 border-t mt-auto bg-white">
          <div className="container mx-auto text-center text-muted-foreground text-sm space-y-2">
            <p>{t('footer_text', { year: new Date().getFullYear() })}</p>
             <div className="flex justify-center items-center gap-4 text-xs text-muted-foreground/80">
                <SupportDialog />
                 <Link href={`/${locale}/admin/login`} className="hover:underline">
                    {t('admin_area_link')}
                </Link>
            </div>
          </div>
        </footer>
      </div>
    );
}
