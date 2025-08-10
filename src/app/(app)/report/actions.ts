
"use server";

import { revalidatePath } from "next/cache";
import { setReportProductFilters } from "@/lib/settings-service";

export async function updateReportFiltersAction(filters: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await setReportProductFilters(filters);
    if (success) {
      revalidatePath("/(app)/report");
      return { success: true };
    }
    return { success: false, error: "Failed to save filters to the database." };
  } catch (error) {
    console.error("Error in updateReportFiltersAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected server error occurred." };
  }
}
