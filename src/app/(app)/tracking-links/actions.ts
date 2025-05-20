
"use server";

import { revalidatePath } from "next/cache";
import type { TrackingLink, User, OrderLogEntry, CustomStatus, UserRole } from "@/types";
import { updateOrder, getOrderById } from "@/lib/order-service"; 
import { getStatusById } from "@/lib/status-service"; 
import { v4 as uuidv4 } from 'uuid';

export async function updateTrackingLinkAction(
  orderId: string,
  updates: {
    isPublic?: boolean;
    currentStatus?: string; // Status ID
    statusNotes?: string; // Optional notes for status change
  },
  currentUser: User
): Promise<TrackingLink | { error: string }> {
  if (!currentUser || !currentUser.id || !currentUser.name) {
    return { error: "Current user information is missing." };
  }

  try {
    const currentOrder = await getOrderById(orderId);
    if (!currentOrder) {
      return { error: `Order ${orderId} not found.` };
    }

    // CRM Permission Check: Can only modify their own orders
    if (currentUser.role === 'CRM' && currentOrder.crmUserId !== currentUser.id) {
      return { error: "Permission Denied: CRMs can only modify orders assigned to them." };
    }

    const dataToUpdate: Partial<TrackingLink> = {};
    let newLogEntries: OrderLogEntry[] = [];

    if (updates.isPublic !== undefined && updates.isPublic !== currentOrder.isPublic) {
      dataToUpdate.isPublic = updates.isPublic;
    }

    if (updates.currentStatus && updates.currentStatus !== currentOrder.currentStatus) {
      // Server-side permission check for status change based on allowedRoles
      if (currentUser.role !== 'SYSTEM_ADMIN') {
        const targetStatus = await getStatusById(updates.currentStatus);
        if (!targetStatus) {
          return { error: `Status with ID ${updates.currentStatus} not found.` };
        }
        // If allowedRoles is defined and not empty, check if user's role is in it
        if (targetStatus.allowedRoles && targetStatus.allowedRoles.length > 0 && !targetStatus.allowedRoles.includes(currentUser.role)) {
          return { error: `You do not have permission to set the order to "${targetStatus.name}".` };
        }
        // If allowedRoles is undefined or empty, any user with basic perms can set it (already handled by dialog access)
      }

      dataToUpdate.currentStatus = updates.currentStatus;
      
      const newStatusObject = await getStatusById(updates.currentStatus);
      const newStatusName = newStatusObject ? newStatusObject.name : updates.currentStatus; 

      let logNotes = `Status changed to ${newStatusName}.`;
      if (updates.statusNotes && updates.statusNotes.trim() !== "") {
        logNotes = updates.statusNotes.trim(); 
      }
      
      newLogEntries.push({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        status: updates.currentStatus,
        changedByUserId: currentUser.id,
        changedByUserName: currentUser.name,
        notes: logNotes,
      });
    }
    
    if (newLogEntries.length > 0) {
        dataToUpdate.statusHistory = [...currentOrder.statusHistory, ...newLogEntries];
    }

    if (Object.keys(dataToUpdate).length === 0) {
      // No actual changes to apply, but if notes were provided for a non-status change, this might be an issue
      // For now, assume if no core fields changed, no update.
      // If only statusNotes were provided without a status change, this log won't be created.
      // This could be refined if notes should be logged even without a status change (e.g., as a general order note).
      return currentOrder; // Return current order if no changes
    }

    const success = await updateOrder(orderId, dataToUpdate);
    if (!success) {
      return { error: "Failed to update tracking link in the database." };
    }

    revalidatePath("/(app)/tracking-links");
    revalidatePath(`/track/${orderId}`);
    revalidatePath("/(app)/dashboard"); 
    revalidatePath("/(app)/active-orders");
    revalidatePath("/(app)/deliveries/monthly");
    revalidatePath("/(app)/deliveries/weekly");
    
    const updatedOrder = await getOrderById(orderId);
     if (!updatedOrder) {
        return { error: "Failed to retrieve updated order after update."};
    }
    return updatedOrder;

  } catch (error) {
    console.error("Error in updateTrackingLinkAction:", error);
    return { error: error instanceof Error ? error.message : "An unexpected error occurred while updating the tracking link." };
  }
}
