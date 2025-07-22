
"use server";

import { revalidatePath } from "next/cache";
import type { PurchaseRequest, User } from '@/types';
import {
  getPurchaseRequests,
  addPurchaseRequest,
  updatePurchaseRequest,
  deletePurchaseRequest,
  getPurchaseRequestById, // Import the new function
} from '@/lib/purchase-request-service';

export async function getPurchaseRequestsAction(): Promise<PurchaseRequest[]> {
  try {
    return await getPurchaseRequests();
  } catch (error) {
    console.error("Error in getPurchaseRequestsAction:", error);
    return [];
  }
}

export async function addPurchaseRequestAction(
  requestData: Omit<PurchaseRequest, 'id' | 'requestedByUserId' | 'requestedByUserName' | 'requestId' | 'price'>,
  currentUser: User
): Promise<{ success: boolean; request?: PurchaseRequest; error?: string }> {
  try {
    const requestDataWithUser = {
      ...requestData,
      requestedByUserId: currentUser.id,
      requestedByUserName: currentUser.name,
      price: null, // Always initialize price as null
    };
    const newRequest = await addPurchaseRequest(requestDataWithUser);
    if (newRequest) {
      revalidatePath("/(app)/purchase-request");
      return { success: true, request: newRequest };
    }
    return { success: false, error: "Failed to add purchase request to database." };
  } catch (error) {
    console.error("Error in addPurchaseRequestAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updatePurchaseRequestAction(
  requestId: string,
  updates: Partial<Omit<PurchaseRequest, 'id' | 'requestedByUserId' | 'requestedByUserName'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const existingRequest = await getPurchaseRequestById(requestId);
    if (!existingRequest) {
        return { success: false, error: "Purchase request not found." };
    }

    // Ensure the original requester's info is preserved
    const finalUpdates = {
        ...updates,
        requestedByUserId: existingRequest.requestedByUserId,
        requestedByUserName: existingRequest.requestedByUserName,
    };

    const success = await updatePurchaseRequest(requestId, finalUpdates);
    if (success) {
      revalidatePath("/(app)/purchase-request");
      return { success: true };
    }
    return { success: false, error: "Failed to update purchase request in database." };
  } catch (error) {
    console.error("Error in updatePurchaseRequestAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function deletePurchaseRequestAction(requestId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await deletePurchaseRequest(requestId);
    if (success) {
      revalidatePath("/(app)/purchase-request");
      return { success: true };
    }
    return { success: false, error: "Failed to delete purchase request from database." };
  } catch (error) {
    console.error("Error in deletePurchaseRequestAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
