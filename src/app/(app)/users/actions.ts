

"use server";

import { revalidatePath } from "next/cache";
import {
  addUser as addUserInDb,
  updateUserBanStatus,
  updateUserInfo as updateUserInfoInDb,
  deleteUser as deleteUserFromDbService,
  updateUserFCMToken,
  unlockUserPinAccount,
  updateUserPinCode,
  updateUserAssignedDivisions
} from "@/lib/user-service";
import { User } from "@/types";

export async function addUserAction(
  userData: Omit<User, 'id'> & { id?: string }
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const user = await addUserInDb(userData);
    if (user) {
      revalidatePath("/(app)/users");
      revalidatePath("/(app)/vendors");
      return { success: true, user };
    }
    return { success: false, error: "Failed to add user." };
  } catch (error) {
    console.error("Error in addUserAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred while adding user."
    };
  }
}

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
  updates: Partial<Pick<User, 'name' | 'email' | 'companyName' | 'phone' | 'address' | 'category'>>
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
    return { success: false, error: "Failed to delete user. System Admin accounts cannot be deleted or user was not found." };
  } catch (error) {
    console.error("Error in deleteUserAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function unlockUserPinAccountAction(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await unlockUserPinAccount(userId);
    if (success) {
      revalidatePath("/(app)/users");
      return { success: true };
    }
    return { success: false, error: "Failed to unlock user PIN account." };
  } catch (error) {
    console.error("Error in unlockUserPinAccountAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function adminSetUserPinAction(userId: string, pinCode: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await updateUserPinCode(userId, pinCode);
    if (success) {
      revalidatePath("/(app)/users");
      return { success: true };
    }
    return { success: false, error: "Failed to set user PIN code." };
  } catch (error) {
    console.error("Error in adminSetUserPinAction:", error);
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
    const success = await updateUserFCMToken(userId, fcmToken);
    if (success) {
      revalidatePath("/(app)/admin/settings");
      return { success: true };
    }
    return { success: false, error: "Failed to store FCM token in database." };
  } catch (error) {
    console.error("Error in storeUserFCMTokenAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred while storing FCM token." };
  }
}

export async function updateUserAssignedDivisionsAction(
  userId: string,
  divisions: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await updateUserAssignedDivisions(userId, divisions);
    if (success) {
      revalidatePath("/(app)/users");
      revalidatePath("/(app)/crm/all-districts-data");
      return { success: true };
    }
    return { success: false, error: "Failed to update assigned divisions in database." };
  } catch (error) {
    console.error("Error in updateUserAssignedDivisionsAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred while updating assigned divisions." };
  }
}
