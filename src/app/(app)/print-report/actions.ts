
"use server";

import { revalidatePath } from "next/cache";
import type { TrackingLink, User } from '@/types';
import { getOrdersForReport, addTask, updateTask, getTaskById as getOrderFromReportService, deleteDoc as deleteOrderFromReportService } from '@/lib/report-service'; // Use report-service functions

export interface ReportData {
  title: string;
  customContent: string | null;
  generatedAt: string;
  orders: TrackingLink[];
}


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

export async function addTaskAction(
  taskData: Partial<Omit<TrackingLink, 'id' | 'crmUserId' | 'crmUserName'>>,
  currentUser: User
): Promise<{ success: boolean; task?: TrackingLink; error?: string }> {
  try {
    if (!currentUser || !currentUser.id || !currentUser.name) {
      return { success: false, error: "Current user information is missing." };
    }
    const completeTaskData = {
      companyName: "New Task (Details pending)",
      address: "N/A",
      phoneNumber: "N/A",
      orderItems: [],
      createdAt: new Date().toISOString(),
      isPublic: false,
      currentStatus: "order-submitted", 
      statusHistory: [],
      comments: [],
      ...taskData,
      crmUserId: currentUser.id,
      crmUserName: currentUser.name,
    };

    const newTask = await addTask(completeTaskData as Omit<TrackingLink, 'id'>);
    if (newTask) {
      revalidatePath('/(app)/print-report');
      return { success: true, task: newTask };
    }
    return { success: false, error: "Failed to add task to database." };
  } catch (error) {
    console.error("Error in addTaskAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateTaskAction(
  taskId: string,
  updates: Partial<Omit<TrackingLink, 'id'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await updateTask(taskId, updates);
    if (success) {
      revalidatePath('/(app)/print-report');
      return { success: true };
    }
    return { success: false, error: "Failed to update task in database." };
  } catch (error) {
    console.error("Error in updateTaskAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function assignMeToAction(
  orderId: string,
  currentUser: User
): Promise<{ success: boolean; error?: string }> {
  try {
    if (currentUser.role !== 'LR') {
      return { success: false, error: "Only LR users can self-assign tasks." };
    }
    const updates: Partial<TrackingLink> = {
      designerRepresentativeId: currentUser.id,
      designerRepresentativeName: currentUser.name,
      designerRepresentativeAvatarUrl: currentUser.avatarUrl || null,
      updatedAt: new Date().toISOString(),
      updatedByUserId: currentUser.id,
      updatedByUserName: currentUser.name,
    };
    const success = await updateTask(orderId, updates);
    if (success) {
      revalidatePath('/(app)/print-report');
      revalidatePath('/(app)/projects');
      revalidatePath(`/track/${orderId}`);
      return { success: true };
    }
    return { success: false, error: "Failed to update task assignment." };
  } catch (error) {
    console.error("Error in assignMeToAction:", error);
    return { success: false, error: "An unexpected server error occurred." };
  }
}


export async function deleteOrderAction(orderId: string): Promise<{ success: boolean, error?: string }> {
  try {
    const success = await deleteOrderFromReportService(orderId);
    if (success) {
      revalidatePath("/(app)/print-report");
      return { success: true };
    }
    return { success: false, error: "Failed to delete the task from the database." };
  } catch (error) {
    console.error("Error in deleteOrderAction for print-report:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected server error occurred." };
  }
}
