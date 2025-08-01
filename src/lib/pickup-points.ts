
'use server';

import type { PickupPoint } from './types';

export type FindPickupPointsResult = {
  success: boolean;
  points?: PickupPoint[];
  error?: string;
};

/**
 * Finds pickup points for a given postcode.
 * This is a placeholder and should be replaced with a real API call to a carrier service.
 * @param postcode The postcode to search for.
 * @returns A promise that resolves to a FindPickupPointsResult object.
 */
export async function findPickupPoints(postcode: string): Promise<FindPickupPointsResult> {
  console.log(`[SERVER ACTION] Searching for pickup points for postcode: ${postcode}`);

  // --- THIS IS MOCK DATA ---
  // In a real application, you would make an API call here to a service like
  // Mondial Relay, Colissimo, etc., using a secret API key.
  // The API key should be stored as an environment variable and not exposed to the client.

  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

  if (postcode.startsWith('75')) {
    const mockPoints: PickupPoint[] = [
      { id: 'MR-01', name: 'Tabac Le Diplomate', address: '123 Rue de Rivoli', postcode, city: 'Paris', country: 'FR' },
      { id: 'MR-02', name: 'Boulangerie Patachou', address: '45 Avenue des Champs-Élysées', postcode, city: 'Paris', country: 'FR' },
      { id: 'MR-03', name: 'Librairie Le Quartier Latin', address: '88 Boulevard Saint-Germain', postcode, city: 'Paris', country: 'FR' },
      { id: 'MR-04', name: 'Superette de la Motte-Picquet', address: '22 Avenue de la Motte-Picquet-Grenelle', postcode, city: 'Paris', country: 'FR' },
    ];
    return { success: true, points: mockPoints };
  }
  
  if (postcode === "00000") {
     return { success: false, error: "Le service de points relais est actuellement indisponible. Veuillez réessayer plus tard." };
  }

  // --- END OF MOCK DATA ---

  return { success: true, points: [] };
}
