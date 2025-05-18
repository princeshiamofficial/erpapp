
"use server";

import { revalidatePath } from "next/cache";
import {
  addModel,
  updateModel,
  deleteModel,
  addLamination,
  updateLamination,
  deleteLamination,
} from "@/lib/service-options-service";
import type { ServiceModelItem, ServiceLaminationItem } from "@/types";

const SERVICE_MANAGEMENT_PATH = "/(app)/admin/service-management";

// Model Actions
export async function addModelAction(name: string): Promise<{ success: boolean; model?: ServiceModelItem; error?: string }> {
  try {
    const newModel = await addModel(name);
    if (newModel) {
      revalidatePath(SERVICE_MANAGEMENT_PATH);
      return { success: true, model: newModel };
    }
    return { success: false, error: "Failed to add model to database." };
  } catch (error) {
    console.error("Error in addModelAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateModelAction(id: string, name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await updateModel(id, name);
    if (success) {
      revalidatePath(SERVICE_MANAGEMENT_PATH);
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
      return { success: true };
    }
    return { success: false, error: "Failed to delete model from database." };
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
      return { success: true };
    }
    return { success: false, error: "Failed to delete lamination from database." };
  } catch (error) {
    console.error("Error in deleteLaminationAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
