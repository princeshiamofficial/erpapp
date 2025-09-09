
"use server";

import { revalidatePath } from "next/cache";
import {
  addModel,
  updateModel,
  deleteModel,
  addLamination,
  updateLamination,
  deleteLamination,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  addGift,
  updateGift,
  deleteGift,
} from "@/lib/service-options-service";
import type { ServiceModelItem, ServiceLaminationItem, ServicePaymentMethodItem, ServiceGiftItem } from "@/types";

const SERVICE_MANAGEMENT_PATH = "/(app)/admin/service-management";
const MODEL_MANAGEMENT_PATH = "/(app)/admin/model-management";
const CREATE_ORDER_DIALOG_REVALIDATION_TARGET = "/(app)/orders"; // To refresh CreateOrderDialog options

// Model Actions
export async function addModelAction(name: string, buyingPrice?: number, sellingPrice?: number, imageUrl?: string | null, isReadyMade?: boolean, stockCount?: number): Promise<{ success: boolean; model?: ServiceModelItem; error?: string }> {
  try {
    const newModel = await addModel(name, buyingPrice, sellingPrice, imageUrl, isReadyMade, stockCount);
    if (newModel) {
      revalidatePath(SERVICE_MANAGEMENT_PATH);
      revalidatePath(MODEL_MANAGEMENT_PATH);
      revalidatePath(CREATE_ORDER_DIALOG_REVALIDATION_TARGET);
      return { success: true, model: newModel };
    }
    return { success: false, error: "Failed to add model to database." };
  } catch (error) {
    console.error("Error in addModelAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateModelAction(id: string, name: string, buyingPrice?: number, sellingPrice?: number, imageUrl?: string | null, isReadyMade?: boolean, stockCountChange?: number): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await updateModel(id, name, buyingPrice, sellingPrice, imageUrl, isReadyMade, stockCountChange);
    if (success) {
      revalidatePath(SERVICE_MANAGEMENT_PATH);
      revalidatePath(MODEL_MANAGEMENT_PATH);
      revalidatePath(CREATE_ORDER_DIALOG_REVALIDATION_TARGET);
      return { success: true };
    }
    return { success: false, error: "Failed to update model in database." };
  } catch (error) {
    console.error("Error in updateModelAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function deleteModelAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await deleteModel(id);
    if (success) {
      revalidatePath(SERVICE_MANAGEMENT_PATH);
      revalidatePath(MODEL_MANAGEMENT_PATH);
      revalidatePath(CREATE_ORDER_DIALOG_REVALIDATION_TARGET);
      return { success: true };
    }
    return { success: false, error: "Failed to delete model from database. It might be in use by existing orders." };
  } catch (error) {
    console.error("Error in deleteModelAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

// Lamination Actions
export async function addLaminationAction(name: string): Promise<{ success: boolean; lamination?: ServiceLaminationItem; error?: string }> {
  try {
    const newLamination = await addLamination(name);
    if (newLamination) {
      revalidatePath(SERVICE_MANAGEMENT_PATH);
      revalidatePath(CREATE_ORDER_DIALOG_REVALIDATION_TARGET);
      return { success: true, lamination: newLamination };
    }
    return { success: false, error: "Failed to add lamination to database." };
  } catch (error) {
    console.error("Error in addLaminationAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateLaminationAction(id: string, name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await updateLamination(id, name);
    if (success) {
      revalidatePath(SERVICE_MANAGEMENT_PATH);
      revalidatePath(CREATE_ORDER_DIALOG_REVALIDATION_TARGET);
      return { success: true };
    }
    return { success: false, error: "Failed to update lamination in database." };
  } catch (error) {
    console.error("Error in updateLaminationAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function deleteLaminationAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await deleteLamination(id);
    if (success) {
      revalidatePath(SERVICE_MANAGEMENT_PATH);
      revalidatePath(CREATE_ORDER_DIALOG_REVALIDATION_TARGET);
      return { success: true };
    }
    return { success: false, error: "Failed to delete lamination from database. It might be in use by existing orders." };
  } catch (error) {
    console.error("Error in deleteLaminationAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

// Payment Method Actions
export async function addPaymentMethodAction(name: string): Promise<{ success: boolean; paymentMethod?: ServicePaymentMethodItem; error?: string }> {
  try {
    const newPaymentMethod = await addPaymentMethod(name);
    if (newPaymentMethod) {
      revalidatePath(SERVICE_MANAGEMENT_PATH);
      revalidatePath(CREATE_ORDER_DIALOG_REVALIDATION_TARGET);
      return { success: true, paymentMethod: newPaymentMethod };
    }
    return { success: false, error: "Failed to add payment method to database." };
  } catch (error) {
    console.error("Error in addPaymentMethodAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updatePaymentMethodAction(id: string, name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await updatePaymentMethod(id, name);
    if (success) {
      revalidatePath(SERVICE_MANAGEMENT_PATH);
      revalidatePath(CREATE_ORDER_DIALOG_REVALIDATION_TARGET);
      return { success: true };
    }
    return { success: false, error: "Failed to update payment method in database." };
  } catch (error) {
    console.error("Error in updatePaymentMethodAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function deletePaymentMethodAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await deletePaymentMethod(id);
    if (success) {
      revalidatePath(SERVICE_MANAGEMENT_PATH);
      revalidatePath(CREATE_ORDER_DIALOG_REVALIDATION_TARGET);
      return { success: true };
    }
    return { success: false, error: "Failed to delete payment method from database. It might be in use by existing orders." };
  } catch (error) {
    console.error("Error in deletePaymentMethodAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

// Gift Actions
export async function addGiftAction(name: string): Promise<{ success: boolean; gift?: ServiceGiftItem; error?: string }> {
  try {
    const newGift = await addGift(name);
    if (newGift) {
      revalidatePath(SERVICE_MANAGEMENT_PATH);
      revalidatePath(CREATE_ORDER_DIALOG_REVALIDATION_TARGET);
      return { success: true, gift: newGift };
    }
    return { success: false, error: "Failed to add gift to database." };
  } catch (error) {
    console.error("Error in addGiftAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateGiftAction(id: string, name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await updateGift(id, name);
    if (success) {
      revalidatePath(SERVICE_MANAGEMENT_PATH);
      revalidatePath(CREATE_ORDER_DIALOG_REVALIDATION_TARGET);
      return { success: true };
    }
    return { success: false, error: "Failed to update gift in database." };
  } catch (error) {
    console.error("Error in updateGiftAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function deleteGiftAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await deleteGift(id);
    if (success) {
      revalidatePath(SERVICE_MANAGEMENT_PATH);
      revalidatePath(CREATE_ORDER_DIALOG_REVALIDATION_TARGET);
      return { success: true };
    }
    return { success: false, error: "Failed to delete gift from database. It might be in use by existing orders." };
  } catch (error) {
    console.error("Error in deleteGiftAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
