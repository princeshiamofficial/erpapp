
"use server";

import { revalidatePath } from "next/cache";
import type { TrackingLink, User, OrderItem, GlobalSettings, UserRole } from "@/types";
import { addOrder, getOrderById, deleteOrder as deleteOrderFromDb, updateOrder } from "@/lib/order-service";
import { getGlobalSettings } from "@/lib/settings-service"; 
import { v4 as uuidv4 } from 'uuid';

interface CreateOrderDialogFormData {
  companyName: string;
  address: string;
  phoneNumber: string;
  orderItems: Array<{
    id: string; 
    model: string;
    quantity: string; 
    lamination: string;
    unitPrice: number | null; 
    lineItemTotalPrice: number | null; 
  }>;
  advancePayment?: string | null; 
  paymentMethod?: string | null;
  customPaymentMethodText?: string;
  initialStatusId: string;
}

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
    if (!data.phoneNumber?.trim()) return { error: "Phone Number is required." };
    if (!data.initialStatusId) return { error: "Initial status ID is required." };
    if (!data.orderItems || data.orderItems.length === 0) {
      return { error: "At least one order item is required." };
    }

    const processedOrderItems: OrderItem[] = [];
    for (const item of data.orderItems) {
      if (!item.model?.trim()) return { error: `Model is required for all order items.` };
      
      const quantity = parseInt(item.quantity, 10);
      if (isNaN(quantity) || quantity < 1) {
        return { error: `Invalid quantity for model "${item.model}". Quantity must be a positive number.` };
      }
      
      if (!item.lamination?.trim()) {
        return { error: `Lamination is required for model "${item.model}".` };
      }

      if (item.unitPrice === undefined || item.unitPrice === null || isNaN(Number(item.unitPrice)) || Number(item.unitPrice) < 0) {
        return { error: `Unit price is missing or invalid for model "${item.model}".` };
      }
      if (item.lineItemTotalPrice === undefined || item.lineItemTotalPrice === null || isNaN(Number(item.lineItemTotalPrice)) || Number(item.lineItemTotalPrice) < 0) {
         return { error: `Line item total price is missing or invalid for model "${item.model}".` };
      }

      processedOrderItems.push({
        id: item.id || uuidv4(), 
        model: item.model.trim(),
        quantity: quantity,
        lamination: item.lamination.trim(),
        unitPrice: Number(item.unitPrice),
        lineItemTotalPrice: Number(item.lineItemTotalPrice),
      });
    }

    let parsedAdvancePayment: number | null = null;
    const advancePaymentStr = String(data.advancePayment ?? '');
    if (advancePaymentStr.trim() !== '') {
      const numAdvancePayment = Number(advancePaymentStr);
      if (isNaN(numAdvancePayment) || numAdvancePayment < 0) {
        return { error: "Advance Payment must be a non-negative number." };
      }
      parsedAdvancePayment = numAdvancePayment;
    }

    let finalPaymentMethod: string | null = null;
    if (data.paymentMethod && typeof data.paymentMethod === 'string' && data.paymentMethod.trim() !== '') {
      if (data.paymentMethod.toLowerCase() === 'other') {
        if (!data.customPaymentMethodText || !data.customPaymentMethodText.trim()) {
          return { error: "Please specify the 'Other' payment method text." };
        }
        finalPaymentMethod = data.customPaymentMethodText.trim();
      } else {
        finalPaymentMethod = data.paymentMethod.trim();
      }
    }

    const newOrderData = {
      companyName: data.companyName.trim(),
      address: data.address.trim(),
      phoneNumber: data.phoneNumber.trim(),
      orderItems: processedOrderItems,
      advancePayment: parsedAdvancePayment,
      paymentMethod: finalPaymentMethod,
      crmUserId: currentUser.id,
      crmUserName: currentUser.name,
      initialStatusId: data.initialStatusId,
    };

    const createdOrder = await addOrder(newOrderData);
    if (!createdOrder) {
      return { error: "Failed to create order due to a service error." };
    }

    revalidatePath("/(app)/orders");
    revalidatePath("/(app)/dashboard");
    revalidatePath("/(app)/active-orders");
    revalidatePath("/(app)/orders/monthly");
    return createdOrder;

  } catch (error: any) {
    console.error("Unexpected error in createOrderAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected server error occurred. Please try again later.";
    return { error: errorMessage };
  }
}

export async function updateOrderAction(
  orderId: string,
  updates: Partial<TrackingLink>,
  currentUser: User 
): Promise<{ success: boolean; error?: string; order?: TrackingLink }> {
  console.log("updateOrderAction: Received currentUser (server-side):", JSON.stringify(currentUser));
  if (!currentUser || !currentUser.role) {
    return { success: false, error: "User authentication error. Please log in again." };
  }

  try {
    if (!orderId) return { success: false, error: "Order ID is required." };
    if (Object.keys(updates).length === 0) return { success: false, error: "No updates provided." };

    if (updates.companyName !== undefined && !updates.companyName.trim()) return { success: false, error: "Company Name cannot be empty."};
    if (updates.address !== undefined && !updates.address.trim()) return { success: false, error: "Address cannot be empty."};
    if (updates.phoneNumber !== undefined && !updates.phoneNumber.trim()) return { success: false, error: "Phone Number cannot be empty."};
    
    if (updates.advancePayment !== undefined && updates.advancePayment !== null) {
        if (isNaN(Number(updates.advancePayment)) || Number(updates.advancePayment) < 0) {
            return { success: false, error: "Advance Payment must be a non-negative number."};
        }
    }
    if (updates.paymentMethod === '') { 
        updates.paymentMethod = null;
    }

    if (updates.orderItems) {
      if (!Array.isArray(updates.orderItems) || updates.orderItems.length === 0) {
        return { success: false, error: "Order must have at least one item." };
      }
      for (const item of updates.orderItems) {
        if (!item.id?.trim()) return { success: false, error: "Each order item must have an ID." };
        if (!item.model?.trim()) return { success: false, error: `Model is required for item ID ${item.id}.` };
        if (item.quantity === undefined || isNaN(Number(item.quantity)) || Number(item.quantity) < 1) {
          return { success: false, error: `Invalid quantity for item ID ${item.id}. Must be a positive number.` };
        }
        if (!item.lamination?.trim()) return { success: false, error: `Lamination is required for item ID ${item.id}.` };
        if (item.unitPrice === undefined || item.unitPrice === null || isNaN(Number(item.unitPrice)) || Number(item.unitPrice) < 0) {
          return { success: false, error: `Unit price is missing or invalid for item ID ${item.id}.` };
        }
        if (item.lineItemTotalPrice === undefined || item.lineItemTotalPrice === null || isNaN(Number(item.lineItemTotalPrice)) || Number(item.lineItemTotalPrice) < 0) {
          return { success: false, error: `Line item total price is missing or invalid for item ID ${item.id}.` };
        }
      }
    }

    const finalUpdates: Partial<TrackingLink> = {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedByUserId: currentUser.id,
      updatedByUserName: currentUser.name,
    };


    const success = await updateOrder(orderId, finalUpdates);
    if (!success) {
      return { success: false, error: "Failed to update order in database." };
    }

    const updatedOrder = await getOrderById(orderId);
    if (!updatedOrder) {
      return { success: false, error: "Failed to retrieve updated order after update." };
    }

    revalidatePath("/(app)/orders");
    revalidatePath(`/track/${orderId}`);
    revalidatePath("/(app)/dashboard");
    revalidatePath("/(app)/active-orders");
    revalidatePath("/(app)/orders/monthly");
    revalidatePath("/(app)/deliveries/monthly");
    revalidatePath("/(app)/deliveries/weekly");

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
      console.error("assignDrToOrderAction: Acting user information is missing.", { actingUser });
      return { error: "Acting user information is missing." };
    }
     if (readyForDesignStatusId !== 'ready-for-design') { 
      console.error("assignDrToOrderAction: Invalid readyForDesignStatusId received. Expected 'ready-for-design', got:", readyForDesignStatusId);
      return { error: "Invalid target status ID for DR assignment. Configuration error." };
    }

    const currentOrder = await getOrderById(orderId);
    if (!currentOrder) {
      console.error(`assignDrToOrderAction: Order ${orderId} not found.`);
      return { error: `Order ${orderId} not found.` };
    }

    const logEntry: OrderLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      status: readyForDesignStatusId, 
      changedByUserId: actingUser.id,
      changedByUserName: actingUser.name,
      notes: `Assigned to Designer: ${designerRepresentativeName} by ${actingUser.name}.`,
    };

    const updatedOrderData: Partial<TrackingLink> = {
      designerRepresentativeId,
      designerRepresentativeName,
      currentStatus: readyForDesignStatusId,
      statusHistory: Array.isArray(currentOrder.statusHistory)
        ? [...currentOrder.statusHistory, logEntry]
        : [logEntry],
      updatedAt: new Date().toISOString(),
      updatedByUserId: actingUser.id,
      updatedByUserName: actingUser.name,
    };
    
    console.log("assignDrToOrderAction: Data being sent to updateOrder service:", JSON.stringify(updatedOrderData));

    const success = await updateOrder(orderId, updatedOrderData);
    if (!success) { 
      console.error("assignDrToOrderAction: updateOrderService returned false for orderId:", orderId);
      return { error: "Failed to update order with DR assignment." };
    }

    revalidatePath("/(app)/orders");
    revalidatePath("/(app)/dashboard");
    revalidatePath("/(app)/active-orders");
    revalidatePath(`/track/${orderId}`);
    revalidatePath("/(app)/deliveries/monthly");
    revalidatePath("/(app)/deliveries/weekly");
    revalidatePath("/(app)/orders/monthly");

    const updatedOrder = await getOrderById(orderId);
    if (!updatedOrder) {
      console.error("assignDrToOrderAction: Failed to retrieve updated order after DR assignment for orderId:", orderId);
      return { error: "Failed to retrieve updated order after DR assignment." };
    }
    console.log("assignDrToOrderAction: Successfully updated and re-fetched order:", JSON.stringify(updatedOrder));
    return updatedOrder;

  } catch (error: any) {
    console.error("Unexpected error in assignDrToOrderAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected server error occurred during DR assignment.";
    return { error: errorMessage };
  }
}

export async function deleteOrderAction(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!orderId) {
        return { success: false, error: "Order ID is required for deletion." };
    }
    const success = await deleteOrderFromDb(orderId);
    if (success) {
      revalidatePath("/(app)/orders");
      revalidatePath("/(app)/dashboard");
      revalidatePath("/(app)/active-orders");
      revalidatePath("/(app)/orders/monthly");
      revalidatePath("/(app)/deliveries/monthly");
      revalidatePath("/(app)/deliveries/weekly");
      return { success: true };
    }
    return { success: false, error: "Failed to delete order from database. Service returned failure." };
  } catch (error: any) {
    console.error("Error in deleteOrderAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while deleting order.";
    return { success: false, error: errorMessage };
  }
}

