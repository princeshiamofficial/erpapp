
"use server";

import { revalidatePath } from "next/cache";
import type { TrackingLink, User, OrderItem } from "@/types";
import { addOrder, updateOrder as updateOrderService, getOrderById, deleteOrder as deleteOrderFromDb } from "@/lib/order-service";
import { v4 as uuidv4 } from 'uuid';

export async function createOrderAction(
  data: {
    companyName: string;
    address: string;
    phoneNumber: string;
    orderItems: Array<Omit<OrderItem, 'id'>>;
    advancePayment?: number | null;
    paymentMethod?: string | null; // New field
    initialStatusId: string;
  },
  currentUser: User
): Promise<TrackingLink | { error: string }> {
  try {
    // Top-level validations
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
    if (data.advancePayment !== undefined && data.advancePayment !== null) {
      if (isNaN(Number(data.advancePayment)) || Number(data.advancePayment) < 0) {
        return { error: "Advance Payment must be a non-negative number." };
      }
    }

    const processedOrderItems: OrderItem[] = data.orderItems.map(item => {
      if (!item.model?.trim()) throw new Error("Model is required for all order items.");
      const quantity = Number(item.quantity);
      if (isNaN(quantity) || quantity < 1) throw new Error(`Invalid quantity for model "${item.model}". Quantity must be a positive number.`);
      if (!item.lamination?.trim()) throw new Error(`Lamination is required for model "${item.model}".`);
      const unitPrice = Number(item.unitPrice);
      if (isNaN(unitPrice) || unitPrice < 0) throw new Error(`Invalid unit price for model "${item.model}".`);
      const lineItemTotalPrice = Number(item.lineItemTotalPrice);
      if (isNaN(lineItemTotalPrice) || lineItemTotalPrice < 0) throw new Error(`Invalid line item total price for model "${item.model}".`);

      return {
        id: uuidv4(), // Ensure each item has a unique ID
        model: item.model.trim(),
        quantity: quantity,
        lamination: item.lamination.trim(),
        unitPrice: unitPrice,
        lineItemTotalPrice: lineItemTotalPrice,
      };
    });

    const newOrderData = {
      companyName: data.companyName.trim(),
      customerName: data.companyName.trim(),
      address: data.address.trim(),
      phoneNumber: data.phoneNumber.trim(),
      orderItems: processedOrderItems,
      advancePayment: data.advancePayment === undefined ? null : data.advancePayment,
      paymentMethod: data.paymentMethod === undefined ? null : (data.paymentMethod.trim() || null),
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
    if (errorMessage.includes("Model is required") || errorMessage.includes("Invalid quantity") || errorMessage.includes("Lamination is required") || errorMessage.includes("Invalid unit price") || errorMessage.includes("Invalid line item total price")) {
      return { error: errorMessage };
    }
    return { error: "An unexpected server error occurred. Please try again later." };
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

    const success = await updateOrderService(orderId, updatedOrderData);
    if (!success) {
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
    return { error: error.message || "An unexpected server error occurred during DR assignment. Please try again later." };
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
    return { success: false, error: "Failed to delete order from database." };
  } catch (error: any) {
    console.error("Error in deleteOrderAction:", error);
    return { success: false, error: error.message || "An unexpected error occurred while deleting order." };
  }
}
