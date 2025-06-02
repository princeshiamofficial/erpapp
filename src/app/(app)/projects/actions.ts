
"use server";

import { revalidatePath } from "next/cache";
import type { ProjectStatusType } from "@/types";
import { updateProjectStatus as updateProjectStatusInDb } from '@/lib/project-service';

export async function updateProjectStatusAction(
  projectId: string,
  newStatus: ProjectStatusType
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await updateProjectStatusInDb(projectId, newStatus);
    if (success) {
      revalidatePath("/(app)/projects");
      return { success: true };
    }
    return { success: false, error: "Failed to update project status in database." };
  } catch (error) {
    console.error("Error in updateProjectStatusAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
