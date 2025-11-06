

"use server";

import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import type { UserRole } from '@/types';
import { format } from 'date-fns';

const COLLECTION_NAME = 'teamPerformance';
const MONTHLY_TARGET_COLLECTION_NAME = 'monthlyTeamTargets';

export interface TaskEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  userId: string;
  userName: string;
  role: UserRole;
  taskCount: number;
  likelihood?: number;
  createdAt: string; // ISO string
}

export interface MonthlyTargetHistory {
    id: string; // e.g., 'CRM-2024-06'
    team: UserRole | 'all';
    month: string; // YYYY-MM
    target: number;
    achieved: number;
    undone: number;
}


// Get all task entries
export const getTaskEntries = async (): Promise<TaskEntry[]> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=4444`);
    if (response && Array.isArray(response.documents)) {
        return response.documents.map((doc: { id: string, data: any }) => ({
            id: doc.id,
            ...doc.data
        } as TaskEntry));
    }
    return [];
  } catch (error) {
    console.error("Error fetching task entries via API v3:", error);
    return [];
  }
};

// Add or update a task entry for a specific user and date.
export const addTaskEntry = async (entry: Omit<TaskEntry, 'id' | 'createdAt'>): Promise<TaskEntry | null> => {
  if (!entry.userId || !entry.date) {
    console.error("addTaskEntry: userId and date are required.");
    return null;
  }
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const docId = `${entry.userId}-${entry.date}`;
    
    const existingDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${docId}`).catch(() => null);

    if (existingDoc && existingDoc.data) {
      // Document exists, update it by adding new values
      const updatedTaskCount = (existingDoc.data.taskCount || 0) + entry.taskCount;
      const updatedLikelihood = (existingDoc.data.likelihood || 0) + (entry.likelihood || 0);
      
      const finalData = { 
        ...existingDoc.data, 
        taskCount: updatedTaskCount,
        likelihood: updatedLikelihood
      };
      
      await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${docId}`, {
        method: 'PUT',
        body: JSON.stringify({ data: finalData }),
      });
      return { id: docId, ...finalData } as TaskEntry;

    } else {
      // Document does not exist, create it
      const dataWithTimestamp = {
          ...entry,
          createdAt: new Date().toISOString()
      };
      const payload = {
        id: docId,
        data: dataWithTimestamp
      };
      await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents`, {
          method: 'POST',
          body: JSON.stringify(payload),
      });
      return { id: docId, ...dataWithTimestamp };
    }
  } catch (error) {
    console.error("Error adding/updating task entry via API v3:", error);
    return null;
  }
};

export async function updateTaskEntry(
  taskId: string,
  updates: Partial<Omit<TaskEntry, 'id' | 'userId' | 'userName' | 'role' | 'createdAt'>>
): Promise<boolean> {
  try {
    const existingDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${taskId}`);
    if (!existingDoc || !existingDoc.data) {
      throw new Error(`Task entry with ID ${taskId} not found.`);
    }

    const updatedData = { ...existingDoc.data, ...updates };
    
    await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ data: updatedData })
    });
    return true;
  } catch (error) {
    console.error(`Error updating task entry ${taskId} via API v3:`, error);
    return false;
  }
}

export async function deleteTaskEntry(taskId: string): Promise<boolean> {
  try {
    await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${taskId}`, {
      method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error(`Error deleting task entry ${taskId} via API v3:`, error);
    return false;
  }
}


// New functions for monthly target history

export const getMonthlyTargetHistory = async (team: UserRole | 'all'): Promise<MonthlyTargetHistory[]> => {
    try {
        await ensureCollectionExistsV3(MONTHLY_TARGET_COLLECTION_NAME);
        const response = await fetchFromApiV3(`collections/${MONTHLY_TARGET_COLLECTION_NAME}/documents?limit=4444`);
        if (response && Array.isArray(response.documents)) {
            return response.documents
                .map((doc: { id: string, data: any }) => ({ id: doc.id, ...doc.data } as MonthlyTargetHistory))
                .filter(item => item.team === team)
                .sort((a, b) => b.month.localeCompare(a.month)); // Sort descending by month
        }
        return [];
    } catch (error) {
        console.error(`Error fetching monthly target history for team ${team} via API v3:`, error);
        return [];
    }
};

export const setMonthlyTargetHistory = async (entry: Omit<MonthlyTargetHistory, 'id'>): Promise<MonthlyTargetHistory | null> => {
    try {
        await ensureCollectionExistsV3(MONTHLY_TARGET_COLLECTION_NAME);
        const docId = `${entry.team}-${entry.month}`;
        
        const payload = {
            id: docId,
            data: entry
        };

        // Use POST to create, which will fail if the ID exists. We'll catch and then PUT.
        try {
             await fetchFromApiV3(`collections/${MONTHLY_TARGET_COLLECTION_NAME}/documents`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
        } catch (postError) {
             // If POST fails (likely due to duplicate ID), use PUT to update.
             await fetchFromApiV3(`collections/${MONTHLY_TARGET_COLLECTION_NAME}/documents/${docId}`, {
                method: 'PUT',
                body: JSON.stringify({ data: entry }),
            });
        }

        return { id: docId, ...entry };
    } catch (error) {
        console.error("Error setting monthly target history via API v3:", error);
        return null;
    }
};

export { deleteTaskEntry as deleteTaskEntryFromDb };
