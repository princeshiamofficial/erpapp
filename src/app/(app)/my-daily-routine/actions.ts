

"use server";

import { revalidatePath } from "next/cache";
import type { DailyRoutine } from "@/types";
import {
  getRoutinesForUser,
  toggleRoutineTask,
  addRoutineHeader,
  updateRoutineHeader,
  deleteRoutineHeader,
  getRoutineHeadersForUser,
} from "@/lib/daily-routine-service";


export async function getRoutinesAction(userId: string): Promise<DailyRoutine[]> {
  try {
    return await getRoutinesForUser(userId);
  } catch (error) {
    console.error("Error in getRoutinesAction:", error);
    return [];
  }
}

export async function toggleRoutineTaskAction(
  userId: string,
  date: string,
  taskId: string
): Promise<{ success: boolean; data?: DailyRoutine; error?: string }> {
  try {
    const updatedRoutine = await toggleRoutineTask(userId, date, taskId);
    if (updatedRoutine) {
      revalidatePath("/(app)/my-daily-routine");
      return { success: true, data: updatedRoutine };
    }
    return { success: false, error: "Failed to update routine in the database." };
  } catch (error) {
    console.error("Error in toggleRoutineTaskAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected server error occurred." };
  }
}

// Actions for managing routine headers
export async function addRoutineAction(routineData: Omit<DailyRoutine, 'id' | 'createdAt' | 'updatedAt' | 'completedTasks'>): Promise<{ success: boolean; routine?: DailyRoutine; error?: string }> {
    try {
        const newRoutine = await addRoutineHeader(routineData);
        if (newRoutine) {
            revalidatePath("/(app)/my-daily-routine");
            return { success: true, routine: newRoutine };
        }
        return { success: false, error: "Failed to add new routine header." };
    } catch (error) {
        console.error("Error in addRoutineAction:", error);
        return { success: false, error: "An unexpected error occurred while adding the routine header."};
    }
}

export async function updateRoutineAction(
    id: string,
    updates: Partial<Omit<DailyRoutine, 'id' | 'userId'>>,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const success = await updateRoutineHeader(id, updates, userId);
        if (success) {
            revalidatePath("/(app)/my-daily-routine");
            return { success: true };
        }
        return { success: false, error: "Failed to update routine header." };
    } catch (error) {
        console.error("Error in updateRoutineAction:", error);
        return { success: false, error: "An unexpected error occurred while updating the routine header." };
    }
}

export async function deleteRoutineAction(id: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const success = await deleteRoutineHeader(id, userId);
        if (success) {
            revalidatePath("/(app)/my-daily-routine");
            return { success: true };
        }
        return { success: false, error: "Failed to delete routine header." };
    } catch (error) {
        console.error("Error in deleteRoutineAction:", error);
        return { success: false, error: "An unexpected error occurred while deleting the routine header." };
    }
}

export async function getRoutineHeadersAction(userId: string): Promise<DailyRoutine[]> {
    return getRoutineHeadersForUser(userId);
}
