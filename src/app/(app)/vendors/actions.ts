
"use server";

import { revalidatePath } from "next/cache";
import type { Vendor } from "@/types";
import {
  addVendor,
  updateVendor,
  deleteVendor,
} from "@/lib/vendor-service";

export async function addVendorAction(
  vendorData: Omit<Vendor, 'id' | 'vendorId' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; vendor?: Vendor; error?: string }> {
  try {
    const phoneRegex = /^0\d{10}$/;
    if (!phoneRegex.test(vendorData.phone)) {
      return { success: false, error: "Invalid phone number. It must be an 11-digit number starting with 0." };
    }
    const newVendor = await addVendor(vendorData);
    if (newVendor) {
      revalidatePath("/(app)/vendors");
      return { success: true, vendor: newVendor };
    }
    return { success: false, error: "Failed to add vendor to database." };
  } catch (error) {
    console.error("Error in addVendorAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateVendorAction(
  vendorId: string,
  updates: Partial<Omit<Vendor, 'id' | 'vendorId' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (updates.phone && !/^0\d{10}$/.test(updates.phone)) {
      return { success: false, error: "Invalid phone number format." };
    }
    const success = await updateVendor(vendorId, updates);
    if (success) {
      revalidatePath("/(app)/vendors");
      return { success: true };
    }
    return { success: false, error: "Failed to update vendor in database." };
  } catch (error) {
    console.error("Error in updateVendorAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function deleteVendorAction(vendorId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await deleteVendor(vendorId);
    if (success) {
      revalidatePath("/(app)/vendors");
      return { success: true };
    }
    return { success: false, error: "Failed to delete vendor from database." };
  } catch (error) {
    console.error("Error in deleteVendorAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
