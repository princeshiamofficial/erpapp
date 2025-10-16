

"use server";

import type { DailyRoutine } from '@/types';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

const getCollectionName = (userId: string) => `routine-${userId}`;

export const getRoutinesForUser = async (userId: string): Promise<DailyRoutine[]> => {
  if (!userId) return [];
  const collectionPath = getCollectionName(userId);
  try {
    // Ensuring a user-specific collection exists. If not, it will be created on the first write.
    // We can attempt to fetch, and if it fails with 'not found', we return an empty array, which is correct.
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
      // This is expected if the user has no routines yet.
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
        console.error(`Error fetching routine by ID ${routineId} from ${collectionPath} via API v3:`, error);
        return null;
    }
};

export const addRoutine = async (routineData: Omit<DailyRoutine, 'id' | 'createdAt'>): Promise<DailyRoutine | null> => {
  if (!routineData.userId) return null;
  const collectionPath = getCollectionName(routineData.userId);
  const endpoint = `collections/${collectionPath}/documents`;
  try {
    await ensureCollectionExistsV3(collectionPath);
    const dataWithTimestamp = {
        ...routineData,
        createdAt: new Date().toISOString(),
    };
    
    const newDoc = await fetchFromApiV3(endpoint, {
        method: 'POST',
        body: JSON.stringify({ data: dataWithTimestamp }),
    });

    return { id: newDoc.id, ...newDoc.data } as DailyRoutine;
  } catch (error) {
    console.error(`Error adding routine to ${collectionPath} via API v3:`, error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateRoutine = async (routineId: string, userId: string, updates: Partial<Omit<DailyRoutine, 'id' | 'userId'>>): Promise<boolean> => {
  if (!routineId || !userId) return false;
  const collectionPath = getCollectionName(userId);
  const endpoint = `collections/${collectionPath}/documents/${routineId}`;
  try {
    const existingDoc = await fetchFromApiV3(endpoint);
    const finalData = { ...existingDoc.data, ...updates };

    await fetchFromApiV3(endpoint, {
        method: 'PUT',
        body: JSON.stringify({ data: finalData })
    });
    return true;
  } catch (error) {
    console.error(`Error updating routine ${routineId} in ${collectionPath} via API v3:`, error);
    return false;
  }
};

export const deleteRoutine = async (routineId: string, userId: string): Promise<boolean> => {
  if (!routineId || !userId) return false;
  const collectionPath = getCollectionName(userId);
  const endpoint = `collections/${collectionPath}/documents/${routineId}`;
  try {
    await fetchFromApiV3(endpoint, {
      method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error(`Error deleting routine ${routineId} from ${collectionPath} via API v3:`, error);
    return false;
  }
};
