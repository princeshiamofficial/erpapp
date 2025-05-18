
"use server";

import { revalidatePath } from "next/cache";
import type { TrackingLink, User } from "@/types";
import { addOrder, updateOrder, getOrderById, deleteOrder } from "@/lib/order-service";
import { v4 as uuidv4 } from 'uuid';

export async function createOrderAction(
  data: {
    companyName: string;
    address: string;
    phoneNumber: string; 
    model: string; 
    quantity: number; 
    lamination: string; 
    initialStatusId: string;
  },
  currentUser: User
): Promise<TrackingLink | { error: string }> {
  if (!currentUser || !currentUser.id || !currentUser.name) {
    return { error: "User information is missing." };
  }
  if (!data.initialStatusId) {
    return { error: "Initial status ID is required." };
  }
  if (!data.model || !data.quantity || !data.lamination || !data.phoneNumber) {
    return { error: "Model, quantity, lamination, and phone number are required."}
  }

  try {
    const newOrderData = {
      customerName: data.companyName, 
      companyName: data.companyName,
      address: data.address,
      phoneNumber: data.phoneNumber,
      model: data.model,
      quantity: data.quantity,
      lamination: data.lamination,
      crmUserId: currentUser.id,
      crmUserName: currentUser.name,
      initialStatusId: data.initialStatusId,
    };

    const createdOrder = await addOrder(newOrderData);
    if (!createdOrder) {
      console.error("createOrderAction: addOrder service returned null or undefined.");
      return { error: "Failed to create order due to a service error." };
    }
    revalidatePath("/(app)/orders");
    revalidatePath("/(app)/dashboard");
    return createdOrder;
  } catch (error) {
    console.error("Error in createOrderAction:", error);
    return { error: error instanceof Error ? error.message : "Failed to create order." };
  }
}

export async function assignDrToOrderAction(
  orderId: string,
  designerRepresentativeId: string,
  designerRepresentativeName: string,
  actingUser: User,
  readyForDesignStatusId: string
): Promise<TrackingLink | { error: string }> {
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

  try {
    const currentOrder = await getOrderById(orderId);
    if (!currentOrder) {
      console.error(`assignDrToOrderAction: Order ${orderId} not found.`);
      return { error: `Order ${orderId} not found.` };
    }
    console.log("assignDrToOrderAction: Current order fetched:", JSON.stringify(currentOrder));


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


    const success = await updateOrder(orderId, updatedOrderData);
    if (!success) {
      console.error("assignDrToOrderAction: updateOrder service returned false for orderId:", orderId);
      return { error: "Failed to update order with DR assignment." };
    }

    revalidatePath("/(app)/orders");
    revalidatePath(`/track/${orderId}`);
    revalidatePath("/(app)/dashboard");

    const updatedOrder = await getOrderById(orderId);
    if (!updatedOrder) {
        console.error("assignDrToOrderAction: Failed to retrieve updated order after DR assignment for orderId:", orderId);
        return { error: "Failed to retrieve updated order after DR assignment."};
    }
    console.log("assignDrToOrderAction: Successfully updated and re-fetched order:", JSON.stringify(updatedOrder));
    return updatedOrder;

  } catch (error) {
    console.error("Error in assignDrToOrderAction:", error);
    return { error: error instanceof Error ? error.message : "Failed to assign Designer Representative." };
  }
}

export async function deleteOrderAction(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await deleteOrder(orderId);
    if (success) {
      revalidatePath("/(app)/orders");
      revalidatePath("/(app)/dashboard"); // Revalidate dashboard as order count might change
      return { success: true };
    }
    return { success: false, error: "Failed to delete order from database." };
  } catch (error) {
    console.error("Error in deleteOrderAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred while deleting order." };
  }
}

    