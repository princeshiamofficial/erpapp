
"use server";

import { revalidatePath } from "next/cache";
import { setCrmCompletionStatusIds, setCommentsVisibility } from "@/lib/settings-service";

export async function updateCompletionStatusIdsAction(ids: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await setCrmCompletionStatusIds(ids);
    if (success) {
      revalidatePath("/(app)/admin/crm-target-settings");
      revalidatePath("/(app)/dashboard"); // For CRM target calculations
      revalidatePath("/(app)/leaderboard"); // For CRM target calculations
      return { success: true };
    }
    // Explicitly return error object if success is false
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
      revalidatePath("/(app)/admin/crm-target-settings"); // Revalidate the settings page
      revalidatePath("/track/[trackingId]", "layout"); // Revalidate all public tracking pages
      return { success: true };
    }
    // Explicitly return error object if success is false
    return { success: false, error: "Failed to update comments visibility setting in database." };
  } catch (error) {
    console.error("Error in updateCommentsVisibilityAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
