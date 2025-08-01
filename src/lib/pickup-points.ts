
'use server';

import type { PickupPoint } from './types';

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
  console.log(`[Sendcloud] Démarrage de la recherche de points relais pour le code postal : ${postcode}`);

  const publicKey = process.env.NEXT_PUBLIC_SENDCLOUD_PUBLIC_KEY;
  const secretKey = process.env.SENDCLOUD_SECRET_KEY;

  if (!publicKey || !secretKey) {
    console.error("[Sendcloud] ERREUR : Clés d'API Sendcloud manquantes dans les variables d'environnement.");
    console.log(`[Sendcloud] Clé publique chargée : ${!!publicKey}, Clé secrète chargée : ${!!secretKey}`);
    return { success: false, error: "Configuration du service de points relais incomplète côté serveur." };
  }
  
  console.log("[Sendcloud] Clés d'API chargées avec succès.");

  const country = "FR";
  const carriers = 'colissimo,mondial_relay,chronopost'; 

  const url = `https://api.sendcloud.dev/v2/service-points?country=${country}&postcode=${postcode}&carrier=${carriers}`;
  console.log(`[Sendcloud] Appel de l'URL : ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(`${publicKey}:${secretKey}`),
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[Sendcloud] Réponse de l'API reçue avec le statut : ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[Sendcloud] Erreur de l'API Sendcloud :", JSON.stringify(errorData, null, 2));
      const errorMessage = errorData.error?.message || `Erreur API: ${response.statusText}`;
      if (response.status === 401) {
        return { success: false, error: "L'authentification avec le service de points relais a échoué. Veuillez vérifier vos clés API." };
      }
      return { success: false, error: errorMessage };
    }

    const data = await response.json() as any[];
    console.log(`[Sendcloud] Données reçues de l'API. Nombre de points trouvés : ${data.length}`);
    
    if (!Array.isArray(data)) {
        console.warn("[Sendcloud] L'API a retourné une réponse qui n'est pas un tableau:", data);
        return { success: true, points: [] };
    }

    if (data.length === 0) {
      console.log("[Sendcloud] Aucun point relais trouvé pour ce code postal.");
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
    
    console.log(`[Sendcloud] ${points.length} points relais traités et prêts à être affichés.`);
    return { success: true, points: points };

  } catch (error: any) {
    console.error("[Sendcloud] ERREUR FATALE lors de la communication avec l'API :", error);
    return { success: false, error: "Une erreur de communication est survenue avec le service de points relais." };
  }
}
