
"use server";

import { revalidatePath } from "next/cache";
import type { Project, ProjectStatusType, User, OrderLogEntry } from "@/types";
import { updateProjectStatus as updateProjectStatusInDb } from '@/lib/project-service';
import { getOrderById, updateOrder, autoSettleOrderIfDelivered, unsettleOrderPayment, addShippedOrderEntry, deleteShippedOrderEntry } from '@/lib/order-service';

import {
  CANCELLED_STATUS_ID,
  ON_HOLD_STATUS_ID,
  LOGISTICS_STATUS_ID,
  SHIPPED_STATUS_ID,
  DELIVERED_STATUS_ID,
  ORDER_SUBMITTED_ID,
  READY_FOR_DESIGN_STATUS_ID,
  PROJECT_PENDING_STATUS_ID
} from '@/lib/status-constants';
import { v4 as uuidv4 } from 'uuid';
import { getGlobalSettings } from '@/lib/settings-service';
import { sendTelegramMessage } from "@/lib/notification-utils";
import { getIO } from "@/lib/socket-io";
import { getAppUrl } from "@/lib/server-utils";

const sanitizeForPackzy = (input: string | null | undefined, maxLength?: number, maxBytes?: number): string => {
  if (!input) return '';
  let sanitized = input
    .replace(/[^\p{L}\p{M}\p{N}.,\s#/()&:;।‌‍-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  if (maxBytes) {
    while (Buffer.byteLength(sanitized, 'utf-8') > maxBytes && sanitized.length > 0) {
      sanitized = sanitized.slice(0, -1);
    }
  }
  return sanitized;
};


export async function updateProjectStatusAction(
  project: Project,
  newStatus: ProjectStatusType,
  actingUser: User,
  notes?: string, // Added optional notes parameter
): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await getGlobalSettings();
    if (actingUser.role !== 'SYSTEM_ADMIN') {
      const permissions = settings.projectStageAccess;
      if (permissions && permissions[newStatus] && !permissions[newStatus].includes(actingUser.role)) {
        return { success: false, error: `You do not have permission to move projects to the '${newStatus}' stage.` };
      }
    }

    // New validation logic for "Logistics" stage based on global setting
    if (newStatus === 'Logistics' && settings.isPaymentValidationEnabled && actingUser.role !== 'ADMIN' && actingUser.role !== 'SYSTEM_ADMIN') {
      const orderForValidation = await getOrderById(project.id);
      if (orderForValidation) {
        const orderSubtotal = (orderForValidation.orderItems || []).reduce((acc, item) => acc + (item.isGift ? 0 : (Number(item.lineItemTotalPrice) || 0)), 0);
        const effectiveDiscount = Number(orderForValidation.specialClientDiscount) || 0;
        const netPayable = orderSubtotal - effectiveDiscount;
        const totalAdvancePaid = (orderForValidation.advancePayments || []).reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
        const paymentPercentage = netPayable > 0 ? (totalAdvancePaid / netPayable) * 100 : 100;
        if (paymentPercentage < 45) {
          // The toast part of this has been removed as it can't be triggered from a server action directly.
          // The error will be shown to the user via the component that calls this action.
          return { success: false, error: `Payment is only ${paymentPercentage.toFixed(1)}%. At least 45% is required.` };
        }
      }
    }


    const originalStatus = project.status; // Capture original status before update
    const projectUpdateSuccess = await updateProjectStatusInDb(project.id, newStatus, project);
    if (!projectUpdateSuccess) {
      return { success: false, error: "Failed to update project status in database." };
    }

    if (newStatus !== 'Courier') {
      await deleteShippedOrderEntry(project.id);
    }

    const order = await getOrderById(project.id);
    if (order) {
      let targetOrderStatusId: string | null = null;
      let statusUpdateNote: string | null = null;

      if (originalStatus === 'Delivered' && newStatus !== 'Delivered') {
        const unsettleReason = `Payment unsettled: Project moved from 'Delivered' to '${newStatus}' by ${actingUser.name}.`;
        await unsettleOrderPayment(project.id, unsettleReason, actingUser);
      }

      switch (newStatus) {
        case 'Cancel': targetOrderStatusId = CANCELLED_STATUS_ID; statusUpdateNote = `Order cancelled from project board by ${actingUser.name}.`; break;
        case 'On Hold': targetOrderStatusId = ON_HOLD_STATUS_ID; statusUpdateNote = `Order put on hold from project board by ${actingUser.name}. Reason: ${notes || 'Not specified.'}`; break;
        case 'Logistics': targetOrderStatusId = LOGISTICS_STATUS_ID; statusUpdateNote = `File upload confirmed by ${actingUser.name}. Confirmation details: ${notes || 'N/A'}.`; break;
        case 'Courier': targetOrderStatusId = SHIPPED_STATUS_ID; statusUpdateNote = `Order shipped (project in Courier stage) by ${actingUser.name}.`; break;
        case 'On Design': targetOrderStatusId = READY_FOR_DESIGN_STATUS_ID; statusUpdateNote = `Order moved to 'On Design' via project board by ${actingUser.name}.`; break;
        case 'Project Pending': targetOrderStatusId = PROJECT_PENDING_STATUS_ID; statusUpdateNote = `Order moved to Project Pending from project board by ${actingUser.name}.`; break;
        case 'CR Clearance': targetOrderStatusId = ORDER_SUBMITTED_ID; statusUpdateNote = `Order moved back to CR Clearance from project board by ${actingUser.name}.`; break;
        case 'CO Clearance': targetOrderStatusId = 'co-clearance'; statusUpdateNote = `Order moved to CO Clearance by ${actingUser.name}.`; break;
        case 'Delivered': targetOrderStatusId = DELIVERED_STATUS_ID; statusUpdateNote = `Order marked as delivered via project board by ${actingUser.name}.`; break;
        case 'Docs Pending': targetOrderStatusId = 'docs-pending'; statusUpdateNote = `Order moved to Docs Pending by ${actingUser.name}.`; break;
        case 'Business Closed': targetOrderStatusId = 'business-closed'; statusUpdateNote = `Order moved to Business Closed by ${actingUser.name}.`; break;
      }


      if (targetOrderStatusId && statusUpdateNote && order.currentStatus !== targetOrderStatusId) {
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
          if (newStatus === 'Delivered') {
            await autoSettleOrderIfDelivered(project.id, `System auto-settled: Project moved to '${newStatus}'.`, actingUser);
          }
        }
      }
    }

    revalidatePath("/(app)/projects");
    revalidatePath("/(app)/orders");
    revalidatePath("/(app)/active-orders");
    revalidatePath("/(app)/deliveries");
    revalidatePath(`/track/${project.id}`);
    revalidatePath("/(app)/invoice/[orderId]", "page");

    // Emit socket events for real-time updates
    const io = getIO();
    if (io) {
      io.emit("project-updated", { id: project.id, status: newStatus });
      io.emit("order-updated", { id: project.id });
    }

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
  shippingCharge: number,
  customRecipientName?: string,
  customRecipientAddress?: string,
  courierNote?: string
): Promise<{ success: boolean; error?: string; consignment?: any }> {
  if (!project || !project.id) {
    return { success: false, error: 'Invalid project data provided.' };
  }

  try {
    const order = await getOrderById(project.id);
    if (!order) {
      return { success: false, error: `Order with ID ${project.id} not found.` };
    }

    const orderSubtotal = (order.orderItems || []).reduce((acc, item) => acc + (item.isGift ? 0 : (Number(item.lineItemTotalPrice) || 0)), 0);
    const effectiveDiscount = Number(order.specialClientDiscount) || 0;
    const netPayable = orderSubtotal - effectiveDiscount;
    const totalAdvancePaid = (order.advancePayments || []).reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
    const dueAmount = Math.max(0, netPayable - totalAdvancePaid);

    const numericShippingCharge = Number(shippingCharge) || 0;
    const totalCodAmount = dueAmount + numericShippingCharge;

    const recipientNameRaw = customRecipientName || order.companyName.split('•').pop()?.trim() || order.companyName;
    const recipientAddressRaw = customRecipientAddress || order.address;

    const packzyPayload: Record<string, any> = {
      invoice: sanitizeForPackzy(order.id, 100),
      recipient_name: sanitizeForPackzy(recipientNameRaw, 100),
      recipient_phone: sanitizeForPackzy(order.phoneNumber),
      recipient_address: sanitizeForPackzy(recipientAddressRaw, 250),
      cod_amount: totalCodAmount,
    };

    if (courierNote && courierNote.trim()) {
      packzyPayload.note = sanitizeForPackzy(courierNote.trim(), 160, 450);
    }

    const response = await fetch("https://portal.packzy.com/api/v1/create_order", {
      method: 'POST',
      headers: {
        'Api-Key': 'vfei2q49dhy1rxqxjs6xntkkvc2odeax',
        'Secret-Key': 'n4wr4fhdohq0x3gmm8xg3pp1',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(packzyPayload),
    });

    const responseText = await response.text();
    let responseData;

    if (!response.ok) {
      console.error(`Packzy API Error: Status ${response.status}`, responseText);
      try {
        responseData = JSON.parse(responseText);
        return { success: false, error: `SteadFast API Error: ${responseData.message || 'Failed to create consignment.'}` };
      } catch (e) {
        return { success: false, error: `SteadFast API returned an error page. Please check that recipient details (max 100 chars), address (max 250 chars), and courier note (max 480 chars) do not exceed character limits. Status: ${response.status}.` };
      }
    }

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('Packzy API Error: Response is not valid JSON.', responseText);
      return { success: false, error: `SteadFast API returned an unexpected response that is not valid JSON. Please check their server status. Raw response: ${responseText.substring(0, 150)}...` };
    }

    if (responseData.status !== 200) {
      console.error('Packzy API Error (Status in JSON is not 200):', responseData);
      return { success: false, error: `SteadFast API Error: ${responseData.message || 'Failed to create consignment.'}` };
    }

    const { consignment } = responseData;

    const projectUpdateSuccess = await updateProjectStatusInDb(project.id, 'Courier', project);
    if (!projectUpdateSuccess) {
      console.error(`CRITICAL: Project ${project.id} consignment created in SteadFast (ID: ${consignment.consignment_id}) but failed to update project status to 'Courier'.`);
      return { success: false, error: "Consignment created, but failed to update project status. Please check manually." };
    }

    const logEntry: OrderLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      status: SHIPPED_STATUS_ID,
      changedByUserId: actingUser.id,
      changedByUserName: actingUser.name,
      notes: `Order transferred to SteadFast Courier. Tracking: ${consignment.tracking_code}, Consignment ID: ${consignment.consignment_id}. COD: ${totalCodAmount}, Shipping: ${shippingCharge}. Area: ${shippingArea}.${courierNote ? ` Note: ${courierNote}.` : ''}`,
    };

    const orderUpdateSuccess = await updateOrder(order.id, {
      currentStatus: SHIPPED_STATUS_ID,
      statusHistory: [...order.statusHistory, logEntry],
      packzyConsignmentId: consignment.consignment_id.toString(),
      packzyTrackingCode: consignment.tracking_code,
      shippingArea: shippingArea,
      shippingCharge: shippingCharge,
      courierNote: courierNote || null,
      updatedAt: new Date().toISOString(),
      updatedByUserId: actingUser.id,
      updatedByUserName: actingUser.name,
    });

    if (!orderUpdateSuccess) {
      console.error(`CRITICAL: Project ${project.id} status updated, but failed to update corresponding order ${order.id} with SteadFast details.`);
      return { success: false, error: "Project status updated, but failed to update order details. Please check manually." };
    }

    // Add to the shippedOrders collection for quick sync checks
    await addShippedOrderEntry(order.id, consignment.tracking_code);

    let telegramMessage = `
<b>🚚 Order Shipped via SteadFast!</b>

<b>Order ID:</b> <code>${order.id}</code>
<b>Company:</b> ${order.companyName}
<b>Recipient:</b> ${recipientNameRaw}
<b>COD Amount:</b> ${totalCodAmount.toLocaleString('en-IN')} BDT
`;

    if (courierNote && courierNote.trim()) {
      telegramMessage += `<b>Note:</b> <i>${courierNote.trim()}</i>\n`;
    }

    const appUrl = await getAppUrl();
    const courierReplyMarkup = {
      inline_keyboard: [
        [
          {
            text: "📦 Track Order",
            url: `https://steadfast.com.bd/tl/${consignment.tracking_code}`
          },
          {
            text: "📄 View Order",
            url: `${appUrl}/track/${order.id}`
          }
        ]
      ]
    };

    sendTelegramMessage(telegramMessage, courierReplyMarkup);

    revalidatePath("/(app)/projects");
    revalidatePath(`/track/${order.id}`);
    revalidatePath("/(app)/orders");
    revalidatePath("/(app)/active-orders");

    // Emit socket events for real-time updates
    const io = getIO();
    if (io) {
      io.emit("project-updated", { id: project.id, status: 'Courier' });
      io.emit("order-updated", { id: project.id });
    }

    return { success: true, consignment };

  } catch (error) {
    console.error("Error in transferToCourierAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
