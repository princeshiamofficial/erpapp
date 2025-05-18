
"use server";

import { revalidatePath } from "next/cache";
import { updateUserBanStatus, updateUserInfo as updateUserInfoInDb } from "@/lib/user-service"; // Added updateUserInfoInDb

export async function toggleUserBanStatusAction(
  userId: string,
  currentBanStatus: boolean
): Promise<{ success: boolean; error?: string; newBanStatus?: boolean }> {
  try {
    const newBanStatus = !currentBanStatus;
    const success = await updateUserBanStatus(userId, newBanStatus);
    if (success) {
      revalidatePath("/(app)/users");
      return { success: true, newBanStatus };
    }
    return { success: false, error: "Failed to update user ban status in database." };
  } catch (error) {
    console.error("Error in toggleUserBanStatusAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred while toggling ban status." };
  }
}

export async function updateUserInfoAction(
  userId: string,
  updates: { name?: string; email?: string; companyName?: string | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await updateUserInfoInDb(userId, updates);
    if (success) {
      revalidatePath("/(app)/users");
      return { success: true };
    }
    return { success: false, error: "Failed to update user information in database." };
  } catch (error) {
    console.error("Error in updateUserInfoAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred while updating user information." };
  }
}
