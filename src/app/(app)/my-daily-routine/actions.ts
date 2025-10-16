

"use server";

import { revalidatePath } from "next/cache";
import type { DailyRoutine } from "@/types";
import {
  addRoutine,
  updateRoutine as updateRoutineInDb,
  deleteRoutine,
  getRoutineById,
  getRoutinesForUser,
} from "@/lib/daily-routine-service";

export async function getRoutinesAction(userId: string): Promise<DailyRoutine[]> {
  try {
    return await getRoutinesForUser(userId);
  } catch (error) {
    console.error("Error in getRoutinesAction:", error);
    return [];
  }
}

export async function addRoutineAction(
  routineData: Omit<DailyRoutine, 'id' | 'createdAt'>
): Promise<{ success: boolean; routine?: DailyRoutine; error?: string }> {
  try {
    const newRoutine = await addRoutine(routineData);
    if (newRoutine) {
      revalidatePath("/(app)/my-daily-routine");
      return { success: true, routine: newRoutine };
    }
    return { success: false, error: "Failed to add routine to the database." };
  } catch (error) {
    console.error("Error in addRoutineAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected server error occurred." };
  }
}

export async function updateRoutineAction(
  routineId: string,
  updates: Partial<Omit<DailyRoutine, 'id' | 'userId'>>,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const routineToUpdate = await getRoutineById(routineId, userId);
    if (!routineToUpdate) {
      return { success: false, error: "Routine not found or you don't have permission to edit it." };
    }

    const success = await updateRoutineInDb(routineId, userId, updates);
    if (success) {
      revalidatePath("/(app)/my-daily-routine");
      return { success: true };
    }
    return { success: false, error: "Failed to update routine in the database." };
  } catch (error) {
    console.error("Error in updateRoutineAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected server error occurred." };
  }
}

export async function deleteRoutineAction(routineId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const routineToDelete = await getRoutineById(routineId, userId);
    if (!routineToDelete) {
      return { success: false, error: "Routine not found or you don't have permission to delete it." };
    }
    
    const success = await deleteRoutine(routineId, userId);
    if (success) {
      revalidatePath("/(app)/my-daily-routine");
      return { success: true };
    }
    return { success: false, error: "Failed to delete routine from the database." };
  } catch (error) {
    console.error("Error in deleteRoutineAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected server error occurred." };
  }
}
