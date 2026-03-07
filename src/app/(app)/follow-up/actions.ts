
"use server";

import { query } from '@/lib/mysql';
import { getFollowUpById } from '@/lib/follow-up-service';
import type { FollowUp, FollowUpStatusType, User, FollowUpLog } from '@/types';
import { revalidatePath } from 'next/cache';

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

        return { success: true };
    } catch (error) {
        console.error("Error updating follow-up status:", error);
        return { success: false, error: "Failed to update status." };
    }
}
