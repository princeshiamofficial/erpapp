

"use server";

import type { DailyRoutine } from '@/types';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

const getCollectionName = (userId: string) => `routine-${userId}`;

export const getRoutinesForUser = async (userId: string): Promise<DailyRoutine[]> => {
  if (!userId) return [];
  const collectionPath = getCollectionName(userId);
  try {
    const endpoint = `collections/${collectionPath}/documents?limit=9999`;
    const response = await fetchFromApiV3(endpoint);
    
    if (response && Array.isArray(response.documents)) {
      return response.documents.map((doc: { id: string, data: any }) => ({
        id: doc.id,
        ...doc.data
      } as DailyRoutine));
    }
    return [];
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
      return [];
    }
    console.error(`Error fetching routines for user ${userId} from collection ${collectionPath} via API v3:`, error);
    return [];
  }
};

export const getRoutineById = async (routineId: string, userId: string): Promise<DailyRoutine | null> => {
    if (!routineId || !userId) return null;
    const collectionPath = getCollectionName(userId);
    const endpoint = `collections/${collectionPath}/documents/${routineId}`;
    try {
        const response = await fetchFromApiV3(endpoint);
        return { id: response.id, ...response.data } as DailyRoutine;
    } catch (error) {
       if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
          return null;
       }
        console.error(`Error fetching routine by ID ${routineId} from ${collectionPath} via API v3:`, error);
        return null;
    }
};

// This function now creates or updates a routine for a specific date
export const toggleRoutineTask = async (userId: string, date: string, taskId: string): Promise<DailyRoutine | null> => {
  if (!userId || !date || !taskId) return null;
  const collectionPath = getCollectionName(userId);
  const docId = date; // Document ID is the date string 'YYYY-MM-DD'
  const endpoint = `collections/${collectionPath}/documents/${docId}`;
  
  try {
    await ensureCollectionExistsV3(collectionPath);
    let existingDoc = await getRoutineById(docId, userId);

    if (!existingDoc) {
      // Create a new document for the day if it doesn't exist
      const newRoutine: Omit<DailyRoutine, 'id'> = {
        userId,
        completedTasks: [taskId],
        updatedAt: new Date().toISOString(),
      };
      const payload = { id: docId, data: newRoutine };
      await fetchFromApiV3(`collections/${collectionPath}/documents`, {
          method: 'POST',
          body: JSON.stringify(payload)
      });
      return { id: docId, ...newRoutine };
    } else {
      // Update existing document
      const currentTasks = existingDoc.completedTasks || [];
      const taskIndex = currentTasks.indexOf(taskId);
      
      let updatedTasks: string[];
      if (taskIndex > -1) {
        // Task is already completed, so remove it (toggle off)
        updatedTasks = currentTasks.filter(t => t !== taskId);
      } else {
        // Task is not completed, so add it (toggle on)
        updatedTasks = [...currentTasks, taskId];
      }
      
      const updates = {
        completedTasks: updatedTasks,
        updatedAt: new Date().toISOString(),
      };

      const finalData = { ...existingDoc, ...updates };
      delete (finalData as any).id; // Don't send the id back in the data payload

      await fetchFromApiV3(endpoint, {
          method: 'PUT',
          body: JSON.stringify({ data: finalData })
      });
      
      return { ...existingDoc, ...updates };
    }
  } catch (error) {
    console.error(`Error toggling routine task in ${collectionPath} via API v3:`, error);
    if (error instanceof Error) throw error;
    return null;
  }
};
