
'use server';

import type { PickupPoint } from './types';
import fetch from 'node-fetch';

export type FindPickupPointsResult = {
  success: boolean;
  points?: PickupPoint[];
  error?: string;
};

/**
 * Finds pickup points for a given postcode using the Sendcloud API.
 * @param postcode The postcode to search for.
 * @returns A promise that resolves to a FindPickupPointsResult object.
 */
export async function findPickupPoints(postcode: string): Promise<FindPickupPointsResult> {
  const publicKey = process.env.SENDCLOUD_PUBLIC_KEY;
  const secretKey = process.env.SENDCLOUD_SECRET_KEY;

  if (!publicKey || !secretKey) {
    console.error("Sendcloud API keys are not configured in .env file.");
    return { success: false, error: "Le service de points relais est temporairement indisponible." };
  }

  // We primarily target France, but this could be extended.
  const country = "FR";
  // We can add more carriers as needed, e.g., 'mondial_relay', 'chronopost', 'colis_prive'
  const carriers = 'colissimo'; 

  const url = `https://api.sendcloud.dev/v2/service-points?country=${country}&postcode=${postcode}&carrier=${carriers}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${publicKey}:${secretKey}`).toString('base64'),
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Sendcloud API error:", errorData);
      const errorMessage = errorData.error?.message || `Erreur API: ${response.statusText}`;
      return { success: false, error: errorMessage };
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return { success: true, points: [] };
    }
    
    const points: PickupPoint[] = data.map((point: any) => ({
      id: point.id.toString(),
      name: point.name,
      address: `${point.street} ${point.house_number || ''}`.trim(),
      postcode: point.postal_code,
      city: point.city,
      country: point.country,
    }));

    return { success: true, points: points };

  } catch (error: any) {
    console.error("Failed to fetch from Sendcloud API:", error);
    return { success: false, error: "Une erreur de communication est survenue avec le service de points relais." };
  }
}
