

"use server";

import { revalidatePath } from "next/cache";
import type { DailyRoutine } from "@/types";
import {
  getRoutinesForUser,
  toggleRoutineTask,
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
