
"use server";

import { revalidatePath } from "next/cache";
import type { TrackingLink, User, OrderItem } from "@/types";
import { addOrder } from "@/lib/order-service";
import { v4 as uuidv4 } from 'uuid';

export async function createOrderAction(
  data: {
    companyName: string;
    address: string;
    phoneNumber: string;
    orderItems: Array<Omit<OrderItem, 'id' | 'quantity'> & { quantity: string }>; // Quantity is string from form
    initialStatusId: string;
  },
  currentUser: User
): Promise<TrackingLink | { error: string }> {
  try {
    // --- Start Validation ---
    if (!currentUser || !currentUser.id || !currentUser.name) {
      console.error("createOrderAction: User information is missing.", currentUser);
      return { error: "User information is missing. Please re-authenticate." };
    }
    if (!data.companyName?.trim()) {
      return { error: "Company Name is required." };
    }
    if (!data.address?.trim()) {
      return { error: "Address is required." };
    }
    if (!data.phoneNumber?.trim()) {
      return { error: "Phone Number is required." };
    }
    if (!data.initialStatusId) {
      return { error: "Initial status ID is required." };
    }
    if (!data.orderItems || data.orderItems.length === 0) {
      return { error: "At least one order item is required." };
    }

    const processedOrderItems: OrderItem[] = [];
    for (const item of data.orderItems) {
      if (!item.model?.trim()) {
        return { error: "Model is required for all order items." };
      }
      const quantity = parseInt(item.quantity, 10);
      if (isNaN(quantity) || quantity < 1) {
        return { error: `Invalid quantity for model "${item.model}". Quantity must be a positive number.` };
      }
      if (!item.lamination?.trim()) {
        return { error: `Lamination is required for model "${item.model}".` };
      }
      processedOrderItems.push({
        id: uuidv4(), // Generate unique ID for each order item
        model: item.model.trim(),
        quantity: quantity,
        lamination: item.lamination.trim(),
      });
    }
    // --- End Validation ---

    const newOrderData = {
      customerName: data.companyName.trim(), // Assuming customerName is same as companyName for now
      companyName: data.companyName.trim(),
      address: data.address.trim(),
      phoneNumber: data.phoneNumber.trim(),
      orderItems: processedOrderItems,
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
    revalidatePath("/(app)/dashboard"); // For active orders count etc.
    revalidatePath("/(app)/orders/monthly");
    revalidatePath("/(app)/active-orders");
    return createdOrder;

  } catch (error) {
    console.error("Unexpected error in createOrderAction:", error);
    // Log the actual error on the server for debugging
    // Return a generic error to the client
    if (error instanceof Error) {
        return { error: `An unexpected server error occurred: ${error.message}` };
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
    if (!readyForDesignStatusId) {
      console.error("assignDrToOrderAction: Ready for Design status ID is required.");
      return { error: "Ready for Design status ID is required." };
    }
    if (readyForDesignStatusId !== 'ready-for-design') {
      console.error("assignDrToOrderAction: Invalid readyForDesignStatusId received. Expected 'ready-for-design', got:", readyForDesignStatusId);
      return { error: "Invalid target status ID for DR assignment. Configuration error." };
    }

    // Fetch current order to get existing status history
    const { getOrderById, updateOrder } = await import("@/lib/order-service"); // Dynamic import for service
    const currentOrder = await getOrderById(orderId);

    if (!currentOrder) {
      console.error(`assignDrToOrderAction: Order ${orderId} not found.`);
      return { error: `Order ${orderId} not found.` };
    }
    console.log("assignDrToOrderAction: Current order fetched:", JSON.stringify(currentOrder));


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
    };
    console.log("assignDrToOrderAction: Data being sent to updateOrder service:", JSON.stringify(updatedOrderData));


    const success = await updateOrder(orderId, updatedOrderData);
    if (!success) {
      console.error("assignDrToOrderAction: updateOrder service returned false for orderId:", orderId);
      return { error: "Failed to update order with DR assignment." };
    }

    revalidatePath("/(app)/orders");
    revalidatePath(`/track/${orderId}`);
    revalidatePath("/(app)/dashboard");
    revalidatePath("/(app)/active-orders");


    const updatedOrder = await getOrderById(orderId); // Re-fetch to get the latest version with all updates
    if (!updatedOrder) {
        console.error("assignDrToOrderAction: Failed to retrieve updated order after DR assignment for orderId:", orderId);
        return { error: "Failed to retrieve updated order after DR assignment."};
    }
    console.log("assignDrToOrderAction: Successfully updated and re-fetched order:", JSON.stringify(updatedOrder));
    return updatedOrder;

  } catch (error) {
    console.error("Unexpected error in assignDrToOrderAction:", error);
    if (error instanceof Error) {
      return { error: `An unexpected server error occurred during DR assignment: ${error.message}` };
    }
    return { error: "An unexpected server error occurred during DR assignment. Please try again later." };
  }
}

export async function deleteOrderAction(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { deleteOrder } = await import("@/lib/order-service");
    const success = await deleteOrder(orderId);
    if (success) {
      revalidatePath("/(app)/orders");
      revalidatePath("/(app)/dashboard");
      revalidatePath("/(app)/active-orders");
      revalidatePath("/(app)/orders/monthly");
      return { success: true };
    }
    return { success: false, error: "Failed to delete order from database." };
  } catch (error) {
    console.error("Error in deleteOrderAction:", error);
    if (error instanceof Error) {
        return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred while deleting order." };
  }
}

    