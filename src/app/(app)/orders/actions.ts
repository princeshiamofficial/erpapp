
"use server";

import { revalidatePath } from "next/cache";
import type { TrackingLink, User, OrderItem, AdvancePaymentRecord, ServiceModelItem, OrderLogEntry, Project } from "@/types";
import { 
  addOrder as addOrderService, 
  getOrderById, 
  deleteOrder as deleteOrderFromDb, 
  updateOrder as updateOrderService,
  getDeletedOrders,
  restoreOrder as restoreOrderFromDb,
  permanentlyDeleteOrder as permanentlyDeleteOrderFromDb,
  getClientById
} from "@/lib/order-service";
import { getGlobalSettings } from "@/lib/settings-service";
import { v4 as uuidv4 } from 'uuid';
import { parseISO } from 'date-fns';
import { getUserById as getUserFromDb } from "@/lib/user-service";
import { getModels, updateModelStock } from '@/lib/service-options-service';
import { getProjectById, updateProject } from '@/lib/project-service';

import { addPaymentToHistory } from '@/lib/payment-history-service';
import { sendTelegramMessage } from "@/lib/notification-utils"; // Import the telegram helper
import { getIO } from "@/lib/socket-io";
import { getAppUrl } from "@/lib/server-utils";

interface CreateOrderDialogFormData {
  jobId: string;
  companyName: string;
  address: string;
  phoneNumber: string;
  createdAt: string;
  orderItems: Array<{
    id: string;
    model: string;
    quantity: number;
    lamination: string;
    unitPrice: number | null;
    lineItemTotalPrice: number | null;
  }>;
  advancePaymentAmount?: number | null;
  advancePaymentMethod?: string | null;
  advancePaymentDocumentUrl?: string | null;
  newAdvancePaymentNotes?: string | null;
  specialClientDiscount?: number | null;
  customPaymentMethodText?: string;
  orderNotes?: string | null;
  initialStatusId: string;
  acceptedDeliveryDate?: string | null;
  isStarred?: number;
}

const formatAmountForNotification = (amount: number): string => {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(amount);
};


export async function createOrderAction(
  data: CreateOrderDialogFormData,
  currentUser: User
): Promise<TrackingLink | { error: string }> {
  try {
    if (!currentUser || !currentUser.id || !currentUser.name) {
      return { error: "User information is missing. Please re-authenticate." };
    }
    if (!data.companyName?.trim()) return { error: "Company Name is required." };
    if (!data.address?.trim()) return { error: "Address is required." };

    const phoneNumber = data.phoneNumber?.trim();
    if (!phoneNumber) return { error: "Phone Number is required." };
    const phoneRegex = /^0\d{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return { error: "Invalid phone number. It must be an 11-digit number starting with 0." };
    }

    if (!data.initialStatusId) return { error: "Initial status ID is required." };
    if (!data.createdAt) return { error: "Order creation date is required." };
    try {
      parseISO(data.createdAt);
    } catch (e) {
      return { error: "Invalid order creation date format." };
    }
    if (!data.orderItems || data.orderItems.length === 0) {
      return { error: "At least one order item is required." };
    }

    const allModels = await getModels();
    let orderItemsTotal = 0;
    const processedOrderItems: OrderItem[] = [];
    for (const item of data.orderItems) {
      if (!item.model?.trim()) return { error: `Model is required for all order items.` };
      const quantity = item.quantity;
      if (isNaN(quantity) || quantity < 0) return { error: `Invalid quantity for model "${item.model}". Quantity must be a non-negative number.` };

      const lamination = item.lamination?.trim() || 'N/A';

      const unitPrice = item.unitPrice === undefined || item.unitPrice === null || isNaN(Number(item.unitPrice)) ? 0 : Number(item.unitPrice);
      const lineItemTotalPrice = item.lineItemTotalPrice === undefined || item.lineItemTotalPrice === null || isNaN(Number(item.lineItemTotalPrice)) ? 0 : Number(item.lineItemTotalPrice);


      processedOrderItems.push({
        id: item.id || uuidv4(),
        model: item.model.trim(),
        quantity: quantity,
        lamination: lamination,
        unitPrice: unitPrice,
        lineItemTotalPrice: lineItemTotalPrice,
      });
      orderItemsTotal += lineItemTotalPrice;
    }

    if (data.specialClientDiscount !== null && data.specialClientDiscount !== undefined && data.specialClientDiscount < 0) {
      return { error: "Special Client Discount must be a non-negative number." };
    }
    if (data.specialClientDiscount !== null && data.specialClientDiscount !== undefined && data.specialClientDiscount > orderItemsTotal && orderItemsTotal > 0) {
      return { error: "Special Client Discount cannot exceed the total order price." };
    }

    let parsedAdvancePaymentAmount: number | null = null;
    if (data.advancePaymentAmount !== undefined && data.advancePaymentAmount !== null) {
      if (data.advancePaymentAmount < 0) return { error: "Advance Payment Amount must be a non-negative number." };
      parsedAdvancePaymentAmount = data.advancePaymentAmount;
    }

    const netPayable = orderItemsTotal - (data.specialClientDiscount || 0);
    const grandTotal = netPayable;
    if (parsedAdvancePaymentAmount !== null && parsedAdvancePaymentAmount > grandTotal && grandTotal > 0) {
      return { error: `Advance payment (${parsedAdvancePaymentAmount}) cannot exceed grand total amount (${grandTotal}).` };
    }

    let finalAdvancePaymentMethod: string | null = null;
    if (parsedAdvancePaymentAmount !== null && parsedAdvancePaymentAmount > 0) {
      if (data.advancePaymentMethod && typeof data.advancePaymentMethod === 'string' && data.advancePaymentMethod.trim() !== '') {
        if (data.advancePaymentMethod.toLowerCase() === 'other') {
          if (!data.customPaymentMethodText || !data.customPaymentMethodText.trim()) return { error: "Please specify the 'Other' payment method for the advance." };
          finalAdvancePaymentMethod = data.customPaymentMethodText.trim();
        } else {
          finalAdvancePaymentMethod = data.advancePaymentMethod.trim();
        }
      } else {
        return { error: "Payment Method is required when Advance Payment is entered." };
      }
    }

    const newOrderDataForService = {
      clientId: data.jobId?.trim() || null,
      companyName: data.companyName.trim(),
      address: data.address.trim(),
      phoneNumber: phoneNumber,
      createdAt: data.createdAt,
      orderItems: processedOrderItems,
      advancePaymentAmount: parsedAdvancePaymentAmount,
      advancePaymentMethod: finalAdvancePaymentMethod,
      advancePaymentDocumentUrl: data.advancePaymentDocumentUrl || null,
      specialClientDiscount: data.specialClientDiscount,
      shippingCharge: null,
      orderNotes: data.orderNotes?.trim() || null,
      initialStatusId: data.initialStatusId,
      crmUserId: currentUser.id,
      crmUserName: currentUser.name,
      newAdvancePaymentNotes: data.newAdvancePaymentNotes || null,
      acceptedDeliveryDate: data.acceptedDeliveryDate || null,
      isStarred: data.isStarred ?? 0,
    };

    const createdOrder = await addOrderService(newOrderDataForService);
    if (!createdOrder) return { error: "Failed to create order due to a service error." };

    // Log initial payment to history backup
    if (createdOrder.advancePayments && createdOrder.advancePayments.length > 0) {
      const payment = createdOrder.advancePayments[0];
      await addPaymentToHistory({
        id: payment.id,
        vendorId: createdOrder.crmUserId,
        vendorName: createdOrder.id,
        date: payment.date,
        invoiceId: createdOrder.companyName,
        amount: 0,
        payment: payment.amount,
        method: payment.paymentMethod || 'N/A',
        notes: payment.notes || null,
        status: payment.status || 'Pending'
      });
    }

    for (const item of processedOrderItems) {
      const modelInfo = allModels.find(m => m.name === item.model);
      if (modelInfo && modelInfo.isReadyMade) {
        // Decrease stock by the quantity of the item
        await updateModelStock(modelInfo.id, -item.quantity);
      }
    }


    revalidatePath("/(app)/orders");
    revalidatePath("/(app)/dashboard");
    revalidatePath("/(app)/active-orders");
    revalidatePath("/(app)/orders/monthly");
    revalidatePath("/(app)/admin/model-management");
    revalidatePath("/(app)/crm/sow");
    revalidatePath("/(app)/admin/payment-history");

    // Emit socket events for real-time updates
    const io = getIO();
    if (io) {
      io.emit("order-updated", { id: createdOrder.id, action: 'created' });
      io.emit("project-updated", { id: createdOrder.id });
    }

    return createdOrder;

  } catch (error: any) {
    console.error("Unexpected error in createOrderAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected server error occurred. Please try again later.";
    return { error: errorMessage };
  }
}

export async function updateOrderAction(
  orderId: string,
  updates: Partial<TrackingLink> & {
    specialClientDiscountString?: string | null;
    newAdvancePaymentAmount?: number | null;
    newAdvancePaymentMethod?: string | null;
    newAdvancePaymentNotes?: string | null;
    newAdvancePaymentDocumentUrl?: string | null;
  },
  currentUser: User
): Promise<{ success: boolean; error?: string; order?: TrackingLink }> {
  if (!currentUser || !currentUser.role) {
    return { success: false, error: "User authentication error. Please log in again." };
  }

  try {
    if (!orderId) return { success: false, error: "Order ID is required." };

    const existingOrder = await getOrderById(orderId);
    if (!existingOrder) return { success: false, error: `Order with ID ${orderId} not found.` };

    const allModels = await getModels();

    const finalUpdates: any = { ...updates };
    delete finalUpdates.newAdvancePaymentAmount;
    delete finalUpdates.newAdvancePaymentMethod;
    delete finalUpdates.newAdvancePaymentNotes;
    delete finalUpdates.newAdvancePaymentDocumentUrl;
    delete finalUpdates.specialClientDiscountString;

    let currentOrderItemsTotal = (updates.orderItems || existingOrder.orderItems).reduce((sum, item) => sum + (Number(item.lineItemTotalPrice) || 0), 0);

    if (updates.createdAt) {
      try {
        finalUpdates.createdAt = parseISO(updates.createdAt).toISOString();
      } catch (e) {
        return { success: false, error: "Invalid Date Created format." };
      }
    }

    if (updates.shippingCharge !== undefined) {
      const charge = Number(updates.shippingCharge);
      if (isNaN(charge) || charge < 0) {
        return { success: false, error: "Shipping charge must be a non-negative number." };
      }
      finalUpdates.shippingCharge = charge;
    }

    if (updates.specialClientDiscountString !== undefined) {
      if (updates.specialClientDiscountString && updates.specialClientDiscountString.trim() !== '') {
        const discountStr = updates.specialClientDiscountString.trim();
        let numericDiscount = 0;
        if (discountStr.endsWith('%')) {
          const percentage = parseFloat(discountStr.substring(0, discountStr.length - 1));
          if (isNaN(percentage) || percentage < 0) return { success: false, error: "Invalid percentage for Special Client Discount." };
          numericDiscount = (percentage / 100) * currentOrderItemsTotal;
        } else {
          const fixedAmount = parseFloat(discountStr);
          if (isNaN(fixedAmount) || fixedAmount < 0) return { success: false, error: "Special Client Discount must be a non-negative number." };
          numericDiscount = fixedAmount;
        }
        if (numericDiscount > currentOrderItemsTotal && currentOrderItemsTotal > 0) return { success: false, error: "Special Client Discount cannot exceed the total order price." };
        finalUpdates.specialClientDiscount = numericDiscount;
      } else {
        finalUpdates.specialClientDiscount = 0;
      }
    }

    if (updates.companyName !== undefined && !updates.companyName.trim()) return { success: false, error: "Company Name (Job ID • Name) cannot be empty." };
    if (updates.address !== undefined && !updates.address.trim()) return { success: false, error: "Address cannot be empty." };

    if (updates.phoneNumber !== undefined) {
      const phoneNumber = updates.phoneNumber.trim();
      if (!phoneNumber) return { success: false, error: "Phone Number cannot be empty." };
      const phoneRegex = /^0\d{10}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return { success: false, error: "Invalid phone number. It must be an 11-digit number starting with 0." };
      }
      finalUpdates.phoneNumber = phoneNumber;
    }

     if (updates.orderNotes !== undefined) finalUpdates.orderNotes = updates.orderNotes?.trim() || null;
    if (updates.acceptedDeliveryDate !== undefined) finalUpdates.acceptedDeliveryDate = updates.acceptedDeliveryDate || null;

    if (updates.orderItems) {
      if (!Array.isArray(updates.orderItems) || updates.orderItems.length === 0) return { success: false, error: "Order must have at least one item." };

      const stockChanges = new Map<string, number>();
      const oldItemsMap = new Map(existingOrder.orderItems.map(item => [item.id, item]));

      for (const newItem of updates.orderItems) {
        const oldItem = oldItemsMap.get(newItem.id);
        const oldModel = oldItem ? allModels.find(m => m.name === oldItem.model) : undefined;
        const newModel = allModels.find(m => m.name === newItem.model);

        if (oldItem && oldItem.model !== newItem.model) {
          if (oldModel && oldModel.isReadyMade) {
            stockChanges.set(oldModel.id, (stockChanges.get(oldModel.id) || 0) + oldItem.quantity);
          }
          if (newModel && newModel.isReadyMade) {
            stockChanges.set(newModel.id, (stockChanges.get(newModel.id) || 0) - newItem.quantity);
          }
        } else if (newModel && newModel.isReadyMade) {
          const quantityChange = newItem.quantity - (oldItem ? oldItem.quantity : 0);
          if (quantityChange !== 0) {
            stockChanges.set(newModel.id, (stockChanges.get(newModel.id) || 0) - quantityChange);
          }
        }
        if (oldItem) {
          oldItemsMap.delete(newItem.id);
        } else {
          if (newModel && newModel.isReadyMade) {
            stockChanges.set(newModel.id, (stockChanges.get(newModel.id) || 0) - newItem.quantity);
          }
        }
      }

      for (const removedItem of oldItemsMap.values()) {
        const modelInfo = allModels.find(m => m.name === removedItem.model);
        if (modelInfo && modelInfo.isReadyMade) {
          stockChanges.set(modelInfo.id, (stockChanges.get(modelInfo.id) || 0) + removedItem.quantity);
        }
      }

      for (const [modelId, quantityChange] of stockChanges.entries()) {
        if (quantityChange !== 0) {
          await updateModelStock(modelId, quantityChange);
        }
      }
      finalUpdates.orderItems = updates.orderItems;
    }

    let newAdvanceRecord: AdvancePaymentRecord | null = null;
    if (updates.newAdvancePaymentAmount && updates.newAdvancePaymentAmount > 0) {
      if (!updates.newAdvancePaymentMethod || !updates.newAdvancePaymentMethod.trim()) {
        return { success: false, error: "Payment method is required for new advance payment." };
      }

      newAdvanceRecord = {
        id: uuidv4(),
        amount: updates.newAdvancePaymentAmount,
        date: new Date().toISOString(),
        paymentMethod: updates.newAdvancePaymentMethod,
        notes: updates.newAdvancePaymentNotes?.trim() || null,
        recordedByUserId: currentUser.id,
        recordedByUserName: currentUser.name,
        documentUrl: updates.newAdvancePaymentDocumentUrl,
        status: 'Pending',
      };
      finalUpdates.advancePayments = [...(existingOrder.advancePayments || []), newAdvanceRecord];

      const totalAdvanceAfterNew = (finalUpdates.advancePayments || []).reduce((sum: number, record: AdvancePaymentRecord) => sum + record.amount, 0);
      const totalDiscount = finalUpdates.specialClientDiscount !== undefined ? finalUpdates.specialClientDiscount : (existingOrder.specialClientDiscount ?? 0);
      const currentNetPayable = currentOrderItemsTotal - totalDiscount;
      const currentShippingCharge = finalUpdates.shippingCharge !== undefined ? finalUpdates.shippingCharge : (existingOrder.shippingCharge ?? 0);
      const currentGrandTotal = currentNetPayable + currentShippingCharge;

      if (totalAdvanceAfterNew > currentGrandTotal && currentGrandTotal > 0) {
        return { success: false, error: `Total advance payment (${totalAdvanceAfterNew}) cannot exceed grand total amount (${currentGrandTotal}).` };
      }

      const isAdjustment = existingOrder.advancePayments && existingOrder.advancePayments.length > 0;
      const notificationTitle = isAdjustment ? "Adjustment Payment Received!" : "Advance Payment Received!";

      const message = `
<b>🎉 ${notificationTitle}</b>

<b>Order ID:</b> <code>${orderId}</code>
<b>Company:</b> ${finalUpdates.companyName || existingOrder.companyName}
<b>Amount:</b> ${formatAmountForNotification(newAdvanceRecord.amount)}
<b>Method:</b> ${newAdvanceRecord.paymentMethod}
<b>Recorded By:</b> ${currentUser.name}
      `;

      const appUrl = await getAppUrl();
      const paymentReplyMarkup = {
        inline_keyboard: [
          [
            {
              text: "📄 View Order",
              url: `${appUrl}/track/${orderId}`
            },
            {
              text: "💰 Payment History",
              url: `${appUrl}/admin/payment-history`
            }
          ]
        ]
      };

      await sendTelegramMessage(message, paymentReplyMarkup);

    } else if (updates.advancePayments) {
      finalUpdates.advancePayments = updates.advancePayments;
    }

    if (Object.keys(finalUpdates).length === 0 && updates.specialClientDiscountString === undefined) {
      return { success: true, order: existingOrder, error: "No changes detected to save." };
    }

    finalUpdates.updatedAt = new Date().toISOString();
    finalUpdates.updatedByUserId = currentUser.id;
    finalUpdates.updatedByUserName = currentUser.name;

    const success = await updateOrderService(orderId, finalUpdates);
    if (!success) return { success: false, error: "Failed to update order in database." };

    const updatedOrder = await getOrderById(orderId);
    if (!updatedOrder) return { success: false, error: "Failed to retrieve updated order after update." };

    // Log new payment to history backup if it exists
    if (newAdvanceRecord) {
      await addPaymentToHistory({
        id: newAdvanceRecord.id,
        vendorId: updatedOrder.crmUserId,
        vendorName: updatedOrder.id,
        date: newAdvanceRecord.date,
        invoiceId: updatedOrder.companyName,
        amount: 0,
        payment: newAdvanceRecord.amount,
        method: newAdvanceRecord.paymentMethod || 'N/A',
        notes: newAdvanceRecord.notes || null,
        status: newAdvanceRecord.status || 'Pending'
      });
    }

    try {
      const project = await getProjectById(orderId);
      if (project) {
        console.log(`[updateOrderAction] Found persistent project for order ${orderId}. Syncing info.`);
        const projectUpdates: Partial<Project> = {};
        if (finalUpdates.companyName) projectUpdates.name = finalUpdates.companyName;
        if (finalUpdates.crmUserName) projectUpdates.assigneeName = finalUpdates.crmUserName;
        if (finalUpdates.createdAt) projectUpdates.createdAt = finalUpdates.createdAt;
        if (finalUpdates.designerRepresentativeName !== undefined) {
          projectUpdates.designerRepresentativeName = finalUpdates.designerRepresentativeName;
          projectUpdates.designerRepresentativeAvatarUrl = null;
        }

        if (Object.keys(projectUpdates).length > 0) {
          await updateProject(orderId, projectUpdates);
          console.log(`[updateOrderAction] Synced project ${orderId} with updates:`, projectUpdates);
        }
      }
    } catch (projectError) {
      console.warn(`[updateOrderAction] Failed to sync order update to project board for order ${orderId}. Error:`, projectError);
    }

    revalidatePath("/(app)/orders");
    revalidatePath(`/track/${orderId}`);
    revalidatePath("/(app)/dashboard");
    revalidatePath("/(app)/active-orders");
    revalidatePath("/(app)/orders/monthly");
    revalidatePath("/(app)/deliveries/monthly");
    revalidatePath("/(app)/deliveries/weekly");
    revalidatePath("/(app)/projects");
    revalidatePath("/(app)/admin/model-management");
    revalidatePath("/(app)/crm/sow");
    revalidatePath("/(app)/admin/payment-history");

    // Emit socket events for real-time updates
    const io = getIO();
    if (io) {
      io.emit("order-updated", { id: orderId, action: 'updated' });
      io.emit("project-updated", { id: orderId });
    }

    return { success: true, order: updatedOrder };
  } catch (error: any) {
    console.error("Unexpected error in updateOrderAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected server error occurred while updating order.";
    return { success: false, error: errorMessage };
  }
}

export async function assignDrToOrderAction(
  orderId: string,
  designerRepresentativeId: string,
  designerRepresentativeName: string,
  actingUser: User,
  readyForDesignStatusId: string
): Promise<TrackingLink | { error: string }> {
  try {
    if (!actingUser || !actingUser.id || !actingUser.name) {
      return { error: "Acting user information is missing." };
    }
    if (readyForDesignStatusId !== 'ready-for-design') {
      return { error: "Invalid target status ID for DR assignment. Configuration error." };
    }

    const currentOrder = await getOrderById(orderId);
    if (!currentOrder) {
      return { error: `Order ${orderId} not found.` };
    }

    const designerRepUser = await getUserFromDb(designerRepresentativeId);
    if (!designerRepUser) {
      return { error: `Designer Representative with ID ${designerRepresentativeId} not found.` };
    }
    const freshDrName = designerRepUser.name;

    const logEntry: OrderLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      status: readyForDesignStatusId,
      changedByUserId: actingUser.id,
      changedByUserName: actingUser.name,
      notes: `Assigned to Designer: ${freshDrName} by ${actingUser.name}.`,
    };

    const updatedOrderData: Partial<TrackingLink> = {
      designerRepresentativeId,
      designerRepresentativeName: freshDrName,
      currentStatus: readyForDesignStatusId,
      statusHistory: Array.isArray(currentOrder.statusHistory)
        ? [...currentOrder.statusHistory, logEntry]
        : [logEntry],
      updatedAt: new Date().toISOString(),
      updatedByUserId: actingUser.id,
      updatedByUserName: actingUser.name,
    };

    const success = await updateOrderService(orderId, updatedOrderData);
    if (!success) {
      return { error: "Failed to update order with DR assignment." };
    }

    try {
      const project = await getProjectById(orderId);
      if (project) {
        const projectUpdates: Partial<Project> = {
          designerRepresentativeId: designerRepresentativeId,
          designerRepresentativeName: freshDrName,
          designerRepresentativeAvatarUrl: null,
          status: 'On Design',
          onDesignAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await updateProject(orderId, projectUpdates);
      }
    } catch (projectError) {
      console.warn(`[assignDrToOrderAction] Failed to sync DR assignment to project board for order ${orderId}. Error:`, projectError);
    }




    revalidatePath("/(app)/orders");
    revalidatePath("/(app)/dashboard");
    revalidatePath("/(app)/active-orders");
    revalidatePath(`/track/${orderId}`);
    revalidatePath("/(app)/deliveries/monthly");
    revalidatePath("/(app)/deliveries/weekly");
    revalidatePath("/(app)/orders/monthly");
    revalidatePath("/(app)/projects");

    const updatedOrder = await getOrderById(orderId);
    if (!updatedOrder) {
      return { error: "Failed to retrieve updated order after DR assignment." };
    }

    // Emit socket events for real-time updates
    const io = getIO();
    if (io) {
      io.emit("order-updated", { id: orderId, action: 'dr-assigned' });
      io.emit("project-updated", { id: orderId });
    }

    return updatedOrder;

  } catch (error: any) {
    console.error("Unexpected error in assignDrToOrderAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected server error occurred during DR assignment.";
    return { error: errorMessage };
  }
}

export async function deleteOrderAction(
  orderId: string,
  currentUser: User
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!orderId) {
      return { success: false, error: "Order ID is required for deletion." };
    }

    const settings = await getGlobalSettings();
    const canDelete = currentUser.role === 'SYSTEM_ADMIN' || (settings.rolesAllowedToDeleteOrders?.includes(currentUser.role) ?? false);

    if (!canDelete) {
      return { success: false, error: "You do not have permission to delete this order." };
    }

    const orderToDelete = await getOrderById(orderId);
    if (!orderToDelete) {
      return { success: false, error: "Order not found." };
    }

    const allModels = await getModels();
    for (const item of orderToDelete.orderItems) {
      const modelInfo = allModels.find(m => m.name === item.model);
      if (modelInfo && modelInfo.isReadyMade) {
        await updateModelStock(modelInfo.id, item.quantity);
      }
    }

    const success = await deleteOrderFromDb(orderId, currentUser.id);
    if (success) {
      revalidatePath("/(app)/orders");
      revalidatePath("/(app)/dashboard");
      revalidatePath("/(app)/active-orders");
      revalidatePath("/(app)/orders/monthly");
      revalidatePath("/(app)/deliveries/monthly");
      revalidatePath("/(app)/deliveries/weekly");
      revalidatePath("/(app)/projects");

      revalidatePath("/(app)/admin/model-management");
      revalidatePath("/(app)/crm/sow");
      revalidatePath("/(app)/admin/payment-history");

      // Emit socket events for real-time updates
      const io = getIO();
      if (io) {
        io.emit("order-updated", { id: orderId, action: 'deleted' });
        io.emit("project-updated", { id: orderId });
      }

      return { success: true };
    }
    return { success: false, error: "Failed to delete order from database. Service returned failure." };
  } catch (error: any) {
    console.error("Error in deleteOrderAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while deleting order.";
    return { success: false, error: errorMessage };
  }
}

export async function getDeletedOrdersAction(): Promise<TrackingLink[]> {
  return await getDeletedOrders();
}

export async function restoreOrderAction(orderId: string): Promise<{ success: boolean; error?: string }> {
  const success = await restoreOrderFromDb(orderId);
  if (success) {
    revalidatePath("/(app)/orders");
    return { success: true };
  }
  return { success: false, error: "Failed to restore order." };
}

export async function permanentlyDeleteOrderAction(orderId: string): Promise<{ success: boolean; error?: string }> {
  const success = await permanentlyDeleteOrderFromDb(orderId);
  if (success) {
    revalidatePath("/(app)/orders");
    return { success: true };
  }
  return { success: false, error: "Failed to permanently delete order." };
}

export async function getClientDetailsAction(clientId: string) {
  try {
    const client = await getClientById(clientId);
    if (client) {
      return { success: true, client };
    }
    return { success: false };
  } catch (error) {
    console.error("Error in getClientDetailsAction server action:", error);
    return { success: false };
  }
}
