
"use server";

import { revalidatePath } from "next/cache";
import type { TrackingLink, User, OrderLogEntry, CustomStatus } from "@/types";
import { updateOrder, getOrderById } from "@/lib/order-service"; 
import { getStatusById } from "@/lib/status-service"; // To get status name for notes
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

    const dataToUpdate: Partial<TrackingLink> = {};
    let newLogEntries: OrderLogEntry[] = [];

    if (updates.isPublic !== undefined && updates.isPublic !== currentOrder.isPublic) {
      dataToUpdate.isPublic = updates.isPublic;
      // Optional: Log visibility change if needed, or keep it silent. For now, silent.
      // newLogEntries.push({
      //   id: uuidv4(),
      //   timestamp: new Date().toISOString(),
      //   status: currentOrder.currentStatus, 
      //   changedByUserId: currentUser.id,
      //   changedByUserName: currentUser.name,
      //   notes: `Link visibility changed to ${updates.isPublic ? 'Public' : 'Private'}.`,
      // });
    }

    if (updates.currentStatus && updates.currentStatus !== currentOrder.currentStatus) {
      dataToUpdate.currentStatus = updates.currentStatus;
      
      const newStatusObject = await getStatusById(updates.currentStatus);
      const newStatusName = newStatusObject ? newStatusObject.name : updates.currentStatus; // Fallback to ID if name not found

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
      return { error: "No changes to apply." }; 
    }

    const success = await updateOrder(orderId, dataToUpdate);
    if (!success) {
      return { error: "Failed to update tracking link." };
    }

    revalidatePath("/(app)/tracking-links");
    revalidatePath(`/track/${orderId}`);
    
    const updatedOrder = await getOrderById(orderId);
     if (!updatedOrder) {
        return { error: "Failed to retrieve updated order after update."};
    }
    return updatedOrder;

  } catch (error) {
    console.error("Error in updateTrackingLinkAction:", error);
    return { error: error instanceof Error ? error.message : "Failed to update tracking link." };
  }
}
