

"use server";

import { revalidatePath } from "next/cache";
import type { Lead, User, LeadActivity } from '@/types';
import {
  getLeads as getLeadsFromDb,
  addLead,
  updateLead,
  deleteLead
} from '@/lib/lead-service';
import { getUserById } from "@/lib/user-service";
import { v4 as uuidv4 } from 'uuid';


export async function getLeads(): Promise<Lead[]> {
  try {
    return await getLeadsFromDb();
  } catch (error) {
    console.error("Error in getLeads server action:", error);
    return [];
  }
}

export async function addLeadAction(
  leadData: Omit<Lead, 'id' | 'crmId' | 'crmName' | 'activityHistory'>,
  currentUser: User
): Promise<{ success: boolean; lead?: Lead; error?: string }> {
  try {
    const phoneRegex = /^0\d{10}$/;
    if (!phoneRegex.test(leadData.phone)) {
      return { success: false, error: "Invalid phone number. It must be an 11-digit number starting with 0." };
    }

    const initialActivity: LeadActivity = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      activity: "Lead Created",
      notes: "Initial lead entry created.",
      changedByUserId: currentUser.id,
      changedByUserName: currentUser.name,
    };

    const leadDataWithUser = {
      ...leadData,
      crmId: currentUser.id,
      crmName: currentUser.name,
      category: 'POP', // Default category on single add
      activityHistory: [initialActivity],
    };
    const newLead = await addLead(leadDataWithUser);
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

export async function addLeadActivityAction(
  leadId: string,
  activityData: { activity: string; notes?: string | null },
  currentUser: User
): Promise<{ success: boolean; lead?: Lead; error?: string }> {
  try {
    const lead = await getLeadsFromDb().then(leads => leads.find(l => l.id === leadId));
    if (!lead) {
      return { success: false, error: "Lead not found." };
    }

    const newActivity: LeadActivity = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      activity: activityData.activity,
      notes: activityData.notes || null,
      changedByUserId: currentUser.id,
      changedByUserName: currentUser.name,
    };

    const updatedHistory = [...(lead.activityHistory || []), newActivity];
    const success = await updateLead(leadId, { activityHistory: updatedHistory });

    if (success) {
      revalidatePath("/(app)/pipeline");
      const updatedLead = await getLeadsFromDb().then(leads => leads.find(l => l.id === leadId));
      return { success: true, lead: updatedLead };
    }
    return { success: false, error: "Failed to add activity to lead." };
  } catch (error) {
    console.error("Error in addLeadActivityAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected server error occurred." };
  }
}

export async function addLeadsBatchAction(
  leadsData: Omit<Lead, 'id' | 'crmId' | 'crmName'>[],
  currentUser: User
): Promise<{ success: boolean; createdCount: number; errorCount: number; errors: string[] }> {
    let createdCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const lead of leadsData) {
        try {
            const leadDataWithUser = {
              ...lead,
              crmId: currentUser.id,
              crmName: currentUser.name,
            };
            const newLead = await addLead(leadDataWithUser);
            if (newLead) {
                createdCount++;
            } else {
                errorCount++;
                errors.push(`Failed to add lead for contact: ${lead.contactName || 'Unknown'}`);
            }
        } catch (error) {
            errorCount++;
            const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
            errors.push(`Error for ${lead.contactName || 'Unknown'}: ${errorMessage}`);
        }
    }

    if (createdCount > 0) {
        revalidatePath("/(app)/pipeline");
    }

    return {
        success: errorCount === 0,
        createdCount,
        errorCount,
        errors,
    };
}


export async function updateLeadAction(
  leadId: string,
  updates: Partial<Omit<Lead, 'id'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (updates.phone) {
        const phoneRegex = /^0\d{10}$/;
        if (!phoneRegex.test(updates.phone)) {
            return { success: false, error: "Invalid phone number. It must be an 11-digit number starting with 0." };
        }
    }
    
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

export async function transferLeadAction(
    leadId: string,
    newCrmId: string,
    actingUser: User
): Promise<{ success: boolean; error?: string }> {
    if (!['ADMIN', 'SYSTEM_ADMIN', 'CRM'].includes(actingUser.role)) {
        return { success: false, error: "Permission denied." };
    }
    try {
        const newCrmUser = await getUserById(newCrmId);
        if (!newCrmUser) {
            return { success: false, error: "The new assigned user was not found." };
        }

        const updates = {
            crmId: newCrmUser.id,
            crmName: newCrmUser.name,
        };

        const success = await updateLead(leadId, updates);
        if (success) {
            revalidatePath("/(app)/pipeline");
            return { success: true };
        }
        return { success: false, error: "Failed to update lead in the database during transfer." };
    } catch (error) {
        console.error("Error in transferLeadAction:", error);
        return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred during lead transfer." };
    }
}
