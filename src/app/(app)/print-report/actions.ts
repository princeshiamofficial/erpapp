
"use server";

import type { ReportData, TrackingLink } from '@/lib/report-service'; // Added TrackingLink
import { getOrdersForReport, addTask, updateTask } from '@/lib/report-service'; // Added addTask, updateTask

// Keep original action for potential other uses, though UI is changing
export async function generateReportAction(
  title: string,
  customContent: string | null
): Promise<ReportData | null> {
  try {
    const orders = await getOrdersForReport({ limit: 50 });

    const reportData: ReportData = {
      title,
      customContent: customContent || null,
      generatedAt: new Date().toISOString(),
      orders: orders,
    };

    return reportData;
  } catch (error) {
    console.error("Error in generateReportAction:", error);
    return null;
  }
}

// New action to add a task (which is really an order)
export async function addTaskAction(
  taskData: Omit<TrackingLink, 'id'>
): Promise<{ success: boolean; task?: TrackingLink; error?: string }> {
  try {
    // The report service's addTask will handle creation logic
    const newTask = await addTask(taskData);
    if (newTask) {
      return { success: true, task: newTask };
    }
    return { success: false, error: "Failed to add task to database." };
  } catch (error) {
    console.error("Error in addTaskAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

// New action to update a task
export async function updateTaskAction(
  taskId: string,
  updates: Partial<Omit<TrackingLink, 'id'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await updateTask(taskId, updates);
    if (success) {
      return { success: true };
    }
    return { success: false, error: "Failed to update task in database." };
  } catch (error) {
    console.error("Error in updateTaskAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
