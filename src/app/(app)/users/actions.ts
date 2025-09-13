

"use server";

import { revalidatePath } from "next/cache";
import { 
  updateUserBanStatus, 
  updateUserInfo as updateUserInfoInDb,
  deleteUserFromFirestore as deleteUserFromDbService, 
  updateUserFCMTokenInFirestore // Added import
} from "@/lib/user-service"; 
import { User } from "@/types";

export async function toggleUserBanStatusAction(
  userId: string,
  currentBanStatus: boolean
): Promise<{ success: boolean; error?: string; newBanStatus?: boolean }> {
  try {
    const newBanStatus = !currentBanStatus;
    const success = await updateUserBanStatus(userId, newBanStatus);
    if (success) {
      revalidatePath("/(app)/users");
      revalidatePath("/(app)/vendors");
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
  updates: Partial<Pick<User, 'name' | 'email' | 'companyName' | 'phone' | 'category'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await updateUserInfoInDb(userId, updates);
    if (success) {
      revalidatePath("/(app)/users");
      revalidatePath("/(app)/vendors");
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
    const success = await deleteUserFromDbService(userId);
    if (success) {
      revalidatePath("/(app)/users");
      revalidatePath("/(app)/vendors");
      return { success: true };
    }
    return { success: false, error: "Failed to delete user from database." };
  } catch (error) {
    console.error("Error in deleteUserAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function storeUserFCMTokenAction(
  userId: string, 
  fcmToken: string | null
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: "User ID is required to store FCM token." };
  }
  try {
    const success = await updateUserFCMTokenInFirestore(userId, fcmToken);
    if (success) {
      // Optionally revalidate users path if you display tokens on the users page or admin page
      // revalidatePath("/(app)/users");
      revalidatePath("/(app)/admin/crm-target-settings"); // Revalidate settings page where tokens might be displayed
      return { success: true };
    }
    return { success: false, error: "Failed to store FCM token in database." };
  } catch (error) {
    console.error("Error in storeUserFCMTokenAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred while storing FCM token." };
  }
}
