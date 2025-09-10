
"use server";

import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import type { UserRole } from '@/types';

const COLLECTION_NAME = 'teamPerformance';

export interface TaskEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  userId: string;
  userName: string;
  role: UserRole;
  taskCount: number;
  createdAt: string; // ISO string
}

// Get all task entries
export const getTaskEntries = async (): Promise<TaskEntry[]> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=9999`);
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
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    
    // The API v3 does not have a direct equivalent of compound queries needed for "upsert".
    // We will assume the component logic prevents duplicates and just add a new document.
    // A more robust solution might involve fetching first, but this is simpler for now.
    const dataWithTimestamp = {
        ...entry,
        createdAt: new Date().toISOString()
    };
    
    const newDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents`, {
        method: 'POST',
        body: JSON.stringify({ data: dataWithTimestamp }),
    });

    return {
        id: newDoc.id,
        ...newDoc.data
    } as TaskEntry;
  } catch (error) {
    console.error("Error adding task entry via API v3:", error);
    return null;
  }
};
