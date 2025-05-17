
"use server";

import { revalidatePath } from "next/cache";
import type { TrackingLink, User, OrderLogEntry } from "@/types";
import { updateOrder, getOrderById } from "@/lib/order-service"; // Use new Firestore service
import { v4 as uuidv4 } from 'uuid';

export async function updateTrackingLinkAction(
  orderId: string,
  updates: {
    isPublic?: boolean;
    currentStatus?: string; // Status ID
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
      newLogEntries.push({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        status: currentOrder.currentStatus, // Keep current status for this log
        changedByUserId: currentUser.id,
        changedByUserName: currentUser.name,
        notes: `Link visibility changed to ${updates.isPublic ? 'Public' : 'Private'}.`,
      });
    }

    if (updates.currentStatus && updates.currentStatus !== currentOrder.currentStatus) {
      dataToUpdate.currentStatus = updates.currentStatus;
      // In a real app, you'd fetch the status name using getStatusById for the notes.
      // For now, we'll just use the ID in the note if the full status object isn't readily available here.
      newLogEntries.push({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        status: updates.currentStatus,
        changedByUserId: currentUser.id,
        changedByUserName: currentUser.name,
        notes: `Status changed to ID: ${updates.currentStatus}.`, // Ideally, fetch status name
      });
    }
    
    if (newLogEntries.length > 0) {
        dataToUpdate.statusHistory = [...currentOrder.statusHistory, ...newLogEntries];
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return { error: "No changes to apply." }; // Or return the current order
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
