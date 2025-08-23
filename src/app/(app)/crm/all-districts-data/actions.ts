
"use server";

import { revalidatePath } from "next/cache";
import type { DistrictDataEntry } from "@/types";
import { addManualDistrictData } from "@/lib/district-data-service";

export async function addManualDistrictDataAction(
  data: Omit<DistrictDataEntry, 'id'>
): Promise<{ success: boolean; data?: DistrictDataEntry; error?: string }> {
  try {
    const phoneRegex = /^0\d{10}$/;
    if (!phoneRegex.test(data.phone)) {
      return { success: false, error: "Invalid phone number. It must be an 11-digit number starting with 0." };
    }

    const newEntry = await addManualDistrictData(data);
    if (newEntry) {
      revalidatePath("/(app)/crm/all-districts-data");
      return { success: true, data: newEntry };
    }
    return { success: false, error: "Failed to add district data to database." };
  } catch (error) {
    console.error("Error in addManualDistrictDataAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
