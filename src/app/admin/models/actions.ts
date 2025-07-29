// @/app/admin/models/actions.ts
'use server';

import { revalidatePath } from 'next/cache';

// Mock function for testing the server action call
export async function deleteModel(
    jewelryTypeId: string,
    modelId: string
): Promise<{ success: boolean; message: string }> {
  console.log('--- TEST: deleteModel action was called successfully ---');
  console.log(`--- jewelryTypeId: ${jewelryTypeId}, modelId: ${modelId} ---`);

  // In a real scenario, you would revalidate the path after DB modification
  // revalidatePath('/admin/dashboard');

  return { success: true, message: "Action de suppression appelée avec succès (test)." };
}
