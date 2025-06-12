
"use server";

import { revalidatePath } from "next/cache";
import type { Project, ProjectStatusType } from "@/types"; // Added Project
import { updateProjectStatus as updateProjectStatusInDb } from '@/lib/project-service';

export async function updateProjectStatusAction(
  project: Project, // Changed from projectId: string to the full Project object
  newStatus: ProjectStatusType
): Promise<{ success: boolean; error?: string }> {
  try {
    // Pass the full project object for potential creation if it doesn't exist
    const success = await updateProjectStatusInDb(project.id, newStatus, project);
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
