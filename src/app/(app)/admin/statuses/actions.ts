
"use server";

import { revalidatePath } from "next/cache";
import type { CustomStatus, UserRole } from "@/types";
import { addStatus, updateStatus, deleteStatus } from '@/lib/status-service';

export async function addStatusAction(
  name: string, 
  color: string, 
  isVisible: boolean,
  allowedRoles: UserRole[] // New parameter
): Promise<{ success: boolean; status?: CustomStatus; error?: string }> {
  try {
    const newStatus = await addStatus(name, color, isVisible, allowedRoles); // Pass allowedRoles
    if (newStatus) {
      revalidatePath("/(app)/admin/statuses");
      revalidatePath("/(app)/orders"); 
      revalidatePath("/(app)/all-orders"); 
      return { success: true, status: newStatus };
    }
    return { success: false, error: "Failed to add status to database." };
  } catch (error) {
    console.error("Error in addStatusAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred while adding status." };
  }
}

export async function updateStatusAction(
  id: string, 
  name: string, 
  color: string, 
  isVisible: boolean,
  allowedRoles: UserRole[], // New parameter
  actingUserRole: UserRole 
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await updateStatus(id, name, color, isVisible, allowedRoles, actingUserRole); // Pass allowedRoles & actingUserRole
    if (success) {
      revalidatePath("/(app)/admin/statuses");
      revalidatePath("/(app)/orders");
      revalidatePath("/(app)/all-orders");
      revalidatePath("/track/[trackingId]", "layout"); 
      return { success: true };
    }
    return { success: false, error: "Failed to update status in database." };
  } catch (error) {
    console.error("Error in updateStatusAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred while updating status." };
  }
}

export async function deleteStatusAction(id: string, actingUserRole: UserRole): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await deleteStatus(id, actingUserRole);
    if (success) {
      revalidatePath("/(app)/admin/statuses");
      revalidatePath("/(app)/orders");
      revalidatePath("/(app)/all-orders");
      return { success: true };
    }
    return { success: false, error: "Failed to delete status from database." };
  } catch (error) {
    console.error("Error in deleteStatusAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred while deleting status." };
  }
}
