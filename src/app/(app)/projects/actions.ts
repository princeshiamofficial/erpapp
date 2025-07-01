

"use server";

import { revalidatePath } from "next/cache";
import type { Project, ProjectStatusType, User, OrderLogEntry } from "@/types"; // Added User, OrderLogEntry
import { updateProjectStatus as updateProjectStatusInDb } from '@/lib/project-service';
import { getOrderById, updateOrder } from '@/lib/order-service'; // Added
import { CANCELLED_STATUS_ID, ON_HOLD_STATUS_ID, LOGISTICS_STATUS_ID, SHIPPED_STATUS_ID, DELIVERED_STATUS_ID } from '@/lib/status-service'; // Added SHIPPED_STATUS_ID
import { v4 as uuidv4 } from 'uuid'; // Added
import { getGlobalSettings } from '@/lib/settings-service';

export async function updateProjectStatusAction(
  project: Project,
  newStatus: ProjectStatusType,
  actingUser: User // Added actingUser parameter
): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await getGlobalSettings();
    if (actingUser.role !== 'SYSTEM_ADMIN') {
      const permissions = settings.projectStageAccess;
      if (permissions && permissions[newStatus] && !permissions[newStatus].includes(actingUser.role)) {
        return { success: false, error: `You do not have permission to move projects to the '${newStatus}' stage.` };
      }
    }
    
    const projectUpdateSuccess = await updateProjectStatusInDb(project.id, newStatus, project);
    if (!projectUpdateSuccess) {
      return { success: false, error: "Failed to update project status in database." };
    }

    // If project status changed, update the corresponding order
    const order = await getOrderById(project.id); // project.id is the order ID for dynamic projects
    if (order) {
      let targetOrderStatusId: string | null = null;
      let statusUpdateNote: string | null = null;

      if (newStatus === 'Cancel' && order.currentStatus !== CANCELLED_STATUS_ID) {
        targetOrderStatusId = CANCELLED_STATUS_ID;
        statusUpdateNote = `Order cancelled from project board by ${actingUser.name}. Project status: Cancelled.`;
      } else if (newStatus === 'On Hold' && order.currentStatus !== ON_HOLD_STATUS_ID) {
        targetOrderStatusId = ON_HOLD_STATUS_ID;
        statusUpdateNote = `Order put on hold from project board by ${actingUser.name}. Project status: On Hold.`;
      } else if (newStatus === 'Logistics' && order.currentStatus !== LOGISTICS_STATUS_ID) {
        targetOrderStatusId = LOGISTICS_STATUS_ID;
        statusUpdateNote = `Order moved to Logistics via project board by ${actingUser.name}. Project status: Logistics.`;
      } else if (newStatus === 'Courier' && order.currentStatus !== SHIPPED_STATUS_ID) {
        targetOrderStatusId = SHIPPED_STATUS_ID;
        statusUpdateNote = `Order shipped (project in Courier stage) by ${actingUser.name}. Project status: Courier.`;
      } else if (newStatus === 'Delivered' && order.currentStatus !== DELIVERED_STATUS_ID) {
        targetOrderStatusId = DELIVERED_STATUS_ID;
        statusUpdateNote = `Order delivered via project board by ${actingUser.name}. Project status: Delivered.`;
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


export async function transferToCourierAction(
  project: Project,
  actingUser: User,
  shippingArea: string,
  shippingCharge: number
): Promise<{ success: boolean; error?: string; consignment?: any }> {
  if (!project || !project.id) {
    return { success: false, error: 'Invalid project data provided.' };
  }
  
  try {
    const order = await getOrderById(project.id);
    if (!order) {
      return { success: false, error: `Order with ID ${project.id} not found.` };
    }

    // Calculate Due Amount
    const orderSubtotal = (order.orderItems || []).reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0);
    const effectiveDiscount = order.specialClientDiscount || 0;
    const netPayable = orderSubtotal - effectiveDiscount;
    const totalAdvancePaid = (order.advancePayments || []).reduce((sum, record) => sum + record.amount, 0);
    const dueAmount = Math.max(0, netPayable - totalAdvancePaid);

    const totalCodAmount = dueAmount + shippingCharge;

    // Prepare Steadfast API request
    const steadfastPayload = {
      invoice: order.id,
      recipient_name: order.companyName.split('•').pop()?.trim() || order.companyName, // Get name part
      recipient_phone: order.phoneNumber,
      recipient_address: order.address,
      cod_amount: totalCodAmount, // COD amount includes shipping charge
      note: `Area: ${shippingArea}. Shipping: ${shippingCharge}.`, // Adding info to note
    };

    const response = await fetch("https://portal.packzy.com/api/v1/create_order", {
      method: 'POST',
      headers: {
        'Api-Key': 'vfei2q49dhy1rxqxjs6xntkkvc2odeax',
        'Secret-Key': 'n4wr4fhdohq0x3gmm8xg3pp1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(steadfastPayload),
    });

    const responseData = await response.json();

    if (response.status !== 200 || responseData.status !== 200) {
      console.error('Steadfast API Error:', responseData);
      return { success: false, error: `Steadfast API Error: ${responseData.message || 'Failed to create consignment.'}` };
    }

    const { consignment } = responseData;
    
    // Update Project Status
    const projectUpdateSuccess = await updateProjectStatusInDb(project.id, 'Courier');
    if (!projectUpdateSuccess) {
      console.error(`CRITICAL: Project ${project.id} consignment created in Steadfast (ID: ${consignment.consignment_id}) but failed to update project status to 'Courier'.`);
      return { success: false, error: "Consignment created, but failed to update project status. Please check manually." };
    }
    
    // Update Order Status and add Steadfast info
    const logEntry: OrderLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      status: SHIPPED_STATUS_ID,
      changedByUserId: actingUser.id,
      changedByUserName: actingUser.name,
      notes: `Order transferred to Steadfast Courier. Tracking: ${consignment.tracking_code}, Consignment ID: ${consignment.consignment_id}. COD: ${totalCodAmount}, Shipping: ${shippingCharge}. Area: ${shippingArea}.`,
    };

    const orderUpdateSuccess = await updateOrder(order.id, {
      currentStatus: SHIPPED_STATUS_ID,
      statusHistory: [...order.statusHistory, logEntry],
      packzyConsignmentId: consignment.consignment_id.toString(),
      packzyTrackingCode: consignment.tracking_code,
      shippingArea: shippingArea,
      shippingCharge: shippingCharge,
      updatedAt: new Date().toISOString(),
      updatedByUserId: actingUser.id,
      updatedByUserName: actingUser.name,
    });
    
    if (!orderUpdateSuccess) {
       console.error(`CRITICAL: Project ${project.id} status updated, but failed to update corresponding order ${order.id} with Steadfast details.`);
       return { success: false, error: "Project status updated, but failed to update order details. Please check manually." };
    }

    revalidatePath("/(app)/projects");
    revalidatePath(`/track/${order.id}`);
    revalidatePath("/(app)/orders");
    revalidatePath("/(app)/active-orders");
    
    return { success: true, consignment };

  } catch (error) {
    console.error("Error in transferToCourierAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

    