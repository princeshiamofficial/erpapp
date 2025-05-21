
"use server";

import { revalidatePath } from "next/cache";
import { 
  setCrmCompletionStatusIds, 
  setCommentsVisibility,
  setOrderEditingEnabled // Use this instead of setRolesAllowedToEditOrders
} from "@/lib/settings-service";
// import type { UserRole } from "@/types"; // No longer needed here

export async function updateCompletionStatusIdsAction(ids: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await setCrmCompletionStatusIds(ids);
    if (success) {
      revalidatePath("/(app)/admin/crm-target-settings");
      revalidatePath("/(app)/dashboard"); 
      revalidatePath("/(app)/leaderboard"); 
      return { success: true };
    }
    return { success: false, error: "Failed to update CRM completion status settings in database." };
  } catch (error) {
    console.error("Error in updateCompletionStatusIdsAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateCommentsVisibilityAction(isVisible: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await setCommentsVisibility(isVisible);
    if (success) {
      revalidatePath("/(app)/admin/crm-target-settings"); 
      revalidatePath("/track/[trackingId]", "layout"); 
      return { success: true };
    }
    return { success: false, error: "Failed to update comments visibility setting in database." };
  } catch (error) {
    console.error("Error in updateCommentsVisibilityAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateOrderEditingEnabledAction(isEnabled: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await setOrderEditingEnabled(isEnabled);
    if (success) {
      revalidatePath("/(app)/admin/crm-target-settings");
      revalidatePath("/(app)/orders"); // Revalidate orders page as editing permission might change
      return { success: true };
    }
    return { success: false, error: "Failed to update order editing permission in database." };
  } catch (error) {
    console.error("Error in updateOrderEditingEnabledAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
