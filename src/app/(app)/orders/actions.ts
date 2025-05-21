
"use server";

import { revalidatePath } from "next/cache";
import type { TrackingLink, User, OrderItem } from "@/types";
import { addOrder, getOrderById, deleteOrder as deleteOrderFromDb } from "@/lib/order-service";
import { v4 as uuidv4 } from 'uuid';

interface CreateOrderDialogFormData {
  companyName: string;
  address: string;
  phoneNumber: string; // Now mandatory
  orderItems: Array<{
    id: string; // ID from dialog state
    model: string;
    quantity: string; // Still string from input
    lamination: string;
    unitPrice: number | null; // Can be null if model not selected
    lineItemTotalPrice: number | null; // Can be null
  }>;
  advancePayment?: string; // Input is string
  paymentMethod?: string;
  customPaymentMethodText?: string;
  initialStatusId: string;
}

export async function createOrderAction(
  data: CreateOrderDialogFormData,
  currentUser: User
): Promise<TrackingLink | { error: string }> {
  try {
    // Top-level validations
    if (!currentUser || !currentUser.id || !currentUser.name) {
      return { error: "User information is missing. Please re-authenticate." };
    }
    if (!data.companyName?.trim()) return { error: "Company Name is required." };
    if (!data.address?.trim()) return { error: "Address is required." };
    if (!data.phoneNumber?.trim()) return { error: "Phone Number is required." }; // Mandatory check
    if (!data.initialStatusId) return { error: "Initial status ID is required." };
    if (!data.orderItems || data.orderItems.length === 0) {
      return { error: "At least one order item is required." };
    }

    // Validate advancePayment if provided
    let parsedAdvancePayment: number | null = null;
    if (data.advancePayment !== undefined && data.advancePayment !== null && data.advancePayment.trim() !== '') {
      const numAdvancePayment = Number(data.advancePayment);
      if (isNaN(numAdvancePayment) || numAdvancePayment < 0) {
        return { error: "Advance Payment must be a non-negative number." };
      }
      parsedAdvancePayment = numAdvancePayment;
    }

    // Validate and process paymentMethod
    let finalPaymentMethod: string | null = null;
    if (data.paymentMethod && data.paymentMethod.trim() !== '') {
      if (data.paymentMethod.toLowerCase() === 'other') {
        if (!data.customPaymentMethodText || !data.customPaymentMethodText.trim()) {
          return { error: "Please specify the 'Other' payment method text." };
        }
        finalPaymentMethod = data.customPaymentMethodText.trim();
      } else {
        finalPaymentMethod = data.paymentMethod.trim();
      }
    }

    const processedOrderItems: OrderItem[] = data.orderItems.map(item => {
      if (!item.model?.trim()) throw new Error("Model is required for all order items.");
      
      const quantity = parseInt(item.quantity, 10);
      if (isNaN(quantity) || quantity < 1) throw new Error(`Invalid quantity for model "${item.model}". Quantity must be a positive number.`);
      
      if (!item.lamination?.trim()) throw new Error(`Lamination is required for model "${item.model}".`);

      if (item.unitPrice === undefined || item.unitPrice === null || isNaN(Number(item.unitPrice)) || Number(item.unitPrice) < 0) {
        throw new Error(`Unit price is missing or invalid for model "${item.model}". Please ensure a model with a price is selected.`);
      }
      if (item.lineItemTotalPrice === undefined || item.lineItemTotalPrice === null || isNaN(Number(item.lineItemTotalPrice)) || Number(item.lineItemTotalPrice) < 0) {
        throw new Error(`Line item total price is missing or invalid for model "${item.model}". This should be calculated automatically.`);
      }

      return {
        id: item.id, // Use the ID from the dialog state (already a UUID)
        model: item.model.trim(),
        quantity: quantity,
        lamination: item.lamination.trim(),
        unitPrice: Number(item.unitPrice),
        lineItemTotalPrice: Number(item.lineItemTotalPrice),
      };
    });

    const newOrderData = {
      companyName: data.companyName.trim(),
      address: data.address.trim(),
      phoneNumber: data.phoneNumber.trim(), // Already validated as present
      orderItems: processedOrderItems,
      advancePayment: parsedAdvancePayment,
      paymentMethod: finalPaymentMethod,
      crmUserId: currentUser.id,
      crmUserName: currentUser.name,
      initialStatusId: data.initialStatusId,
    };

    const createdOrder = await addOrder(newOrderData);
    if (!createdOrder) {
      console.error("createOrderAction: addOrder service returned null or undefined.");
      return { error: "Failed to create order due to a service error. Please check server logs." };
    }

    revalidatePath("/(app)/orders");
    revalidatePath("/(app)/dashboard");
    revalidatePath("/(app)/orders/monthly");
    revalidatePath("/(app)/active-orders");
    return createdOrder;

  } catch (error: any) {
    console.error("Unexpected error in createOrderAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected server error occurred. Please try again later.";
    return { error: errorMessage };
  }
}

export async function assignDrToOrderAction(
  orderId: string,
  designerRepresentativeId: string,
  designerRepresentativeName: string,
  actingUser: User, // Renamed from currentUser for clarity
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

    const logEntry = {
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
    };
    
    console.log("assignDrToOrderAction: Data being sent to updateOrder service:", JSON.stringify(updatedOrderData));


    const success = await addOrder(orderId, updatedOrderData); // Naming inconsistency: should call updateOrder
    if (!success) { // updateOrder typically returns boolean
      console.error("assignDrToOrderAction: updateOrderService returned false for orderId:", orderId);
      return { error: "Failed to update order with DR assignment." };
    }

    revalidatePath("/(app)/orders");
    revalidatePath(`/track/${orderId}`);
    revalidatePath("/(app)/dashboard");
    revalidatePath("/(app)/active-orders");
    revalidatePath("/(app)/deliveries/monthly");
    revalidatePath("/(app)/deliveries/weekly");

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
    const success = await deleteOrderFromDb(orderId);
    if (success) {
      revalidatePath("/(app)/orders");
      revalidatePath("/(app)/dashboard");
      revalidatePath("/(app)/active-orders");
      revalidatePath("/(app)/orders/monthly");
      return { success: true };
    }
    // Ensure a structured error is returned if deleteOrderFromDb returns false
    return { success: false, error: "Failed to delete order from database. Service returned failure." };
  } catch (error: any) {
    console.error("Error in deleteOrderAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while deleting order.";
    return { success: false, error: errorMessage };
  }
}
