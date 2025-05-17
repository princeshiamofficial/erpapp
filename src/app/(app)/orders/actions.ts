
"use server";

import { revalidatePath } from "next/cache";
import type { TrackingLink, User } from "@/types";
import { addOrder, updateOrder, getOrderById } from "@/lib/order-service"; // Use new Firestore service
import { v4 as uuidv4 } from 'uuid';

export async function createOrderAction(
  data: {
    customerName: string;
    companyName: string;
    address: string;
    phoneNumber?: string;
    service?: string;
    initialStatusId: string; // Ensure this is the ID of a CustomStatus
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
  crmUser: User,
  readyForDesignStatusId: string
): Promise<TrackingLink | { error: string }> {
  if (!crmUser || !crmUser.id || !crmUser.name) {
    return { error: "CRM user information is missing." };
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
      status: readyForDesignStatusId, // Use the ID of 'Ready for Design'
      changedByUserId: crmUser.id,
      changedByUserName: crmUser.name,
      notes: `Assigned to Designer: ${designerRepresentativeName} by ${crmUser.name}.`,
    };

    const updatedOrderData: Partial<TrackingLink> = {
      designerRepresentativeId,
      designerRepresentativeName,
      currentStatus: readyForDesignStatusId,
      statusHistory: [...currentOrder.statusHistory, logEntry],
    };

    const success = await updateOrder(orderId, updatedOrderData);
    if (!success) {
      return { error: "Failed to update order with DR assignment." };
    }
    
    revalidatePath("/(app)/orders");
    revalidatePath(`/track/${orderId}`); 
    
    // Fetch the updated order to return it
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
