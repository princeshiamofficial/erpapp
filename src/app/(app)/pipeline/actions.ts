
"use server";

import { revalidatePath } from "next/cache";
import type { Lead } from '@/types';
import {
  getLeads as getLeadsFromDb,
  addLead,
  updateLead,
  deleteLead
} from '@/lib/lead-service';


export async function getLeads(): Promise<Lead[]> {
  try {
    return await getLeadsFromDb();
  } catch (error) {
    console.error("Error in getLeads server action:", error);
    return [];
  }
}

export async function addLeadAction(
  leadData: Omit<Lead, 'id'>
): Promise<{ success: boolean; lead?: Lead; error?: string }> {
  try {
    const newLead = await addLead(leadData);
    if (newLead) {
      revalidatePath("/(app)/pipeline");
      return { success: true, lead: newLead };
    }
    return { success: false, error: "Failed to add lead to database." };
  } catch (error) {
    console.error("Error in addLeadAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateLeadAction(
  leadId: string,
  updates: Partial<Omit<Lead, 'id'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await updateLead(leadId, updates);
    if (success) {
      revalidatePath("/(app)/pipeline");
      return { success: true };
    }
    return { success: false, error: "Failed to update lead in database." };
  } catch (error) {
    console.error("Error in updateLeadAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function deleteLeadAction(leadId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await deleteLead(leadId);
    if (success) {
      revalidatePath("/(app)/pipeline");
      return { success: true };
    }
    return { success: false, error: "Failed to delete lead from database." };
  } catch (error) {
    console.error("Error in deleteLeadAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
