
"use server";

import { updateGlobalSalesTarget as updateTargetInDb } from '@/lib/settings-service';
import { revalidatePath } from 'next/cache';

export async function setGlobalTargetAction(targetType: 'monthly' | 'weekly', newTarget: number): Promise<{ success: boolean; error?: string }> {
  if (newTarget < 0 || isNaN(newTarget)) {
    return { success: false, error: "Target must be a non-negative number." };
  }

  try {
    const success = await updateTargetInDb(targetType, newTarget);
    if (success) {
      revalidatePath('/(app)/dashboard'); // Revalidate to reflect changes if data is fetched server-side later
      return { success: true };
    }
    return { success: false, error: "Failed to update target in database." };
  } catch (error) {
    console.error("Error in setGlobalTargetAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
