
"use server";

import { revalidatePath } from "next/cache";
import type { TrackingLink, User } from "@/types";
import { addOrder, updateOrder, getOrderById } from "@/lib/order-service"; 
import { v4 as uuidv4 } from 'uuid';

export async function createOrderAction(
  data: {
    customerName: string;
    companyName: string;
    address: string;
    phoneNumber?: string;
    service?: string;
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

  try {
    const newOrderData = {
      customerName: data.customerName,
      companyName: data.companyName,
      address: data.address,
      phoneNumber: data.phoneNumber,
      service: data.service,
      crmUserId: currentUser.id,
      crmUserName: currentUser.name,
      initialStatusId: data.initialStatusId,
    };
    
    const createdOrder = await addOrder(newOrderData);
    revalidatePath("/(app)/orders");
    revalidatePath("/(app)/dashboard"); // Revalidate dashboard for recent activity
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
  actingUser: User, // Changed from crmUser for clarity
  readyForDesignStatusId: string
): Promise<TrackingLink | { error: string }> {
  if (!actingUser || !actingUser.id || !actingUser.name) {
    return { error: "Acting user information is missing." };
  }
  if (!readyForDesignStatusId) {
    return { error: "Ready for Design status ID is required." };
  }

  try {
    const currentOrder = await getOrderById(orderId);
    if (!currentOrder) {
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
                      : [logEntry], // Safeguard for statusHistory
    };

    const success = await updateOrder(orderId, updatedOrderData);
    if (!success) {
      return { error: "Failed to update order with DR assignment." };
    }
    
    revalidatePath("/(app)/orders");
    revalidatePath(`/track/${orderId}`);
    revalidatePath("/(app)/dashboard"); // Revalidate dashboard for recent activity
    
    const updatedOrder = await getOrderById(orderId);
    if (!updatedOrder) {
        return { error: "Failed to retrieve updated order after DR assignment."};
    }
    return updatedOrder;

  } catch (error) {
    console.error("Error in assignDrToOrderAction:", error);
    return { error: error instanceof Error ? error.message : "Failed to assign Designer Representative." };
  }
}
