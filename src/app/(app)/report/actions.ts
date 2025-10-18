

"use server";

import { revalidatePath } from "next/cache";
import { setReportProductFilters } from "@/lib/settings-service";
import type { TaskEntry } from '@/types';
import { updateTaskEntry, deleteTaskEntry as deleteTaskEntryFromDb } from '@/lib/team-performance-service';

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
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateTaskEntryAction(
  taskId: string,
  updates: Partial<Omit<TaskEntry, 'id' | 'userId' | 'userName' | 'role' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await updateTaskEntry(taskId, updates);
    if (success) {
      revalidatePath("/(app)/report");
      return { success: true };
    }
    return { success: false, error: "Failed to update task entry in database." };
  } catch (error) {
    console.error("Error in updateTaskEntryAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected server error occurred." };
  }
}

export async function deleteTaskEntryAction(taskId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await deleteTaskEntryFromDb(taskId);
    if (success) {
      revalidatePath("/(app)/report");
      return { success: true };
    }
    return { success: false, error: "Failed to delete task entry from database." };
  } catch (error) {
    console.error("Error in deleteTaskEntryAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected server error occurred." };
  }
}
