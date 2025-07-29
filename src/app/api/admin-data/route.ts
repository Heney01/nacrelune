
import { getJewelryTypesAndModels, getFullCharmData, getPreferences } from '@/lib/data';
import type { JewelryType, Charm, CharmCategory, GeneralPreferences } from '@/lib/types';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const JEWELRY_TYPES_INFO: Omit<JewelryType, 'models' | 'icon'>[] = [
            { id: 'necklace', name: "Colliers", description: "" },
            { id: 'bracelet', name: "Bracelets", description: "" },
            { id: 'earring', name: "Boucles d'oreilles", description: "" },
        ];

        const [jewelryTypes, { charms, charmCategories }, preferences] = await Promise.all([
            getJewelryTypesAndModels(JEWELRY_TYPES_INFO),
            getFullCharmData(),
            getPreferences()
        ]);
        
        return NextResponse.json({
            jewelryTypes,
            charms,
            charmCategories,
            preferences
        });

    } catch (error) {
        console.error("Error fetching admin data:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
