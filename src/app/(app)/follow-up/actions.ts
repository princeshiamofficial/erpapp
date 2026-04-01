
"use server";

import { query } from '@/lib/mysql';
import { getFollowUpById, deleteFollowUp } from '@/lib/follow-up-service';
import type { FollowUp, FollowUpStatusType, User, FollowUpLog } from '@/types';
import { revalidatePath } from 'next/cache';
import { getIO } from '@/lib/socket-io';

export async function updateFollowUpStatusAction(
    followUp: FollowUp,
    newStatus: FollowUpStatusType,
    currentUser: User,
    notes?: string
) {
    try {
        const existing = await getFollowUpById(followUp.id);
        if (!existing) {
            return { success: false, error: "Follow-up record not found." };
        }

        const activity: FollowUpLog = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            outcome: `Status changed to ${newStatus}`,
            notes: notes || null,
            recordedByUserId: currentUser.id,
            recordedByUserName: currentUser.name
        };

        const finalData = {
            ...existing,
            status: newStatus,
            crmId: currentUser.id,
            crmName: currentUser.name,
            updatedAt: new Date().toISOString(),
            history: [...(existing.history || []), activity]
        };

        const id = finalData.id;
        // @ts-ignore
        delete finalData.id;

        await query(
            `UPDATE follow_ups SET status = ?, data_json = ? WHERE id = ?`,
            [newStatus, JSON.stringify(finalData), id]
        );

        revalidatePath('/follow-up');

        const io = getIO();
        if (io) {
            io.emit("follow-up-updated", { id: followUp.id, status: newStatus });
        }

        return { success: true };
    } catch (error) {
        console.error("Error updating follow-up status:", error);
        return { success: false, error: "Failed to update status." };
    }
}

export async function addFollowUpsBatchAction(
  followUpsData: Omit<FollowUp, 'id' | 'crmId' | 'crmName'>[],
  currentUser: User
): Promise<{ success: boolean; createdCount: number; errorCount: number; errors: string[] }> {
  let createdCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  const { addFollowUp, getFollowUpByPhone, getFollowUpByJobId } = await import('@/lib/follow-up-service');

  for (const item of followUpsData) {
    try {
      // Check for duplicate jobId
      if (item.jobId) {
        const existingByJobId = await getFollowUpByJobId(item.jobId);
        if (existingByJobId) {
            errorCount++;
            errors.push(`Record with Job ID ${item.jobId} already exists.`);
            continue;
        }
      }
      const followUpDataWithUser = {
        ...item,
        crmId: currentUser.id,
        crmName: currentUser.name,
        updatedAt: new Date().toISOString(),
        history: [{
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            outcome: "Imported via CSV",
            notes: "Record created during batch import.",
            recordedByUserId: currentUser.id,
            recordedByUserName: currentUser.name
        }]
      };
      
      const newFollowUp = await addFollowUp(followUpDataWithUser as any);
      if (newFollowUp) {
        createdCount++;
      } else {
        errorCount++;
        errors.push(`Failed to add record for: ${item.contactName || 'Unknown'}`);
      }
    } catch (error) {
      errorCount++;
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      errors.push(`Error for ${item.contactName || 'Unknown'}: ${errorMessage}`);
    }
  }

  if (createdCount > 0) {
    revalidatePath("/follow-up");
    const io = getIO();
    if (io) {
      io.emit("follow-up-updated", { type: 'batch', count: createdCount });
    }
  }

  return {
    success: errorCount === 0,
    createdCount,
    errorCount,
    errors,
  };
}

export async function deleteFollowUpAction(id: string) {
  try {
    const success = await deleteFollowUp(id);
    if (success) {
      revalidatePath('/follow-up');
      const io = getIO();
      if (io) {
        io.emit("follow-up-updated", { type: 'delete', id });
      }
      return { success: true };
    }
    return { success: false, error: "Failed to delete record." };
  } catch (error) {
    console.error("Error deleting follow-up:", error);
    return { success: false, error: "An unexpected error occurred during deletion." };
  }
}
