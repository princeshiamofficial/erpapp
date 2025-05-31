
"use server";

import { revalidatePath } from "next/cache";
import { 
  updateUserBanStatus, 
  updateUserInfo as updateUserInfoInDb,
  deleteUserFromFirestore as deleteUserFromDbService // Renamed import for clarity
} from "@/lib/user-service"; 

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

export async function deleteUserAction(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Potentially add permission checks here based on currentUser role if needed
    // For example, ensure the user calling this action has rights to delete users,
    // and perhaps prevent self-deletion or deletion of higher-privileged users.
    const success = await deleteUserFromDbService(userId);
    if (success) {
      revalidatePath("/(app)/users");
      return { success: true };
    }
    return { success: false, error: "Failed to delete user from database." };
  } catch (error) {
    console.error("Error in deleteUserAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

