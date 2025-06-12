

"use server";

import { revalidatePath } from "next/cache";
import type { Project, ProjectStatusType, User, OrderLogEntry } from "@/types"; // Added User, OrderLogEntry
import { updateProjectStatus as updateProjectStatusInDb } from '@/lib/project-service';
import { getOrderById, updateOrder } from '@/lib/order-service'; // Added
import { CANCELLED_STATUS_ID, ON_HOLD_STATUS_ID, LOGISTICS_STATUS_ID, SHIPPED_STATUS_ID } from '@/lib/status-service'; // Added SHIPPED_STATUS_ID
import { v4 as uuidv4 } from 'uuid'; // Added

export async function updateProjectStatusAction(
  project: Project,
  newStatus: ProjectStatusType,
  actingUser: User // Added actingUser parameter
): Promise<{ success: boolean; error?: string }> {
  try {
    const projectUpdateSuccess = await updateProjectStatusInDb(project.id, newStatus, project);
    if (!projectUpdateSuccess) {
      return { success: false, error: "Failed to update project status in database." };
    }

    // If project status changed, update the corresponding order
    const order = await getOrderById(project.id); // project.id is the order ID for dynamic projects
    if (order) {
      let targetOrderStatusId: string | null = null;
      let statusUpdateNote: string | null = null;

      if (newStatus === 'CR Cancel' && order.currentStatus !== CANCELLED_STATUS_ID) {
        targetOrderStatusId = CANCELLED_STATUS_ID;
        statusUpdateNote = `Order cancelled from project board by ${actingUser.name}. Project status: CR Cancel.`;
      } else if (newStatus === 'On Hold' && order.currentStatus !== ON_HOLD_STATUS_ID) {
        targetOrderStatusId = ON_HOLD_STATUS_ID;
        statusUpdateNote = `Order put on hold from project board by ${actingUser.name}. Project status: On Hold.`;
      } else if (newStatus === 'Logistics' && order.currentStatus !== LOGISTICS_STATUS_ID) {
        targetOrderStatusId = LOGISTICS_STATUS_ID;
        statusUpdateNote = `Order moved to Logistics via project board by ${actingUser.name}. Project status: Logistics.`;
      } else if (newStatus === 'Courier' && order.currentStatus !== SHIPPED_STATUS_ID) {
        targetOrderStatusId = SHIPPED_STATUS_ID;
        statusUpdateNote = `Order shipped (project in Courier stage) by ${actingUser.name}. Project status: Courier.`;
      }

      if (targetOrderStatusId && statusUpdateNote) {
        const newLogEntry: OrderLogEntry = {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          status: targetOrderStatusId,
          changedByUserId: actingUser.id,
          changedByUserName: actingUser.name,
          notes: statusUpdateNote,
        };
        const orderUpdateSuccess = await updateOrder(order.id, {
          currentStatus: targetOrderStatusId,
          statusHistory: [...order.statusHistory, newLogEntry],
          updatedAt: new Date().toISOString(),
          updatedByUserId: actingUser.id,
          updatedByUserName: actingUser.name,
        });

        if (!orderUpdateSuccess) {
          console.warn(`Project ${project.id} status updated to ${newStatus}, but failed to update corresponding order ${order.id} to target status ${targetOrderStatusId}.`);
        } else {
          console.log(`Order ${order.id} status updated to ${targetOrderStatusId} due to project ${project.id} being ${newStatus}.`);
          revalidatePath(`/track/${order.id}`);
          revalidatePath("/(app)/orders");
          revalidatePath("/(app)/active-orders");
          revalidatePath("/(app)/deliveries/monthly");
          revalidatePath("/(app)/deliveries/weekly");
        }
      }
    }

    revalidatePath("/(app)/projects");
    return { success: true };
  } catch (error) {
    console.error("Error in updateProjectStatusAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
