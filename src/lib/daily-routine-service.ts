

"use server";

import type { DailyRoutine } from '@/types';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

const getCollectionName = (userId: string) => `users/${userId}/dailyRoutines`;

export const getRoutinesForUser = async (userId: string): Promise<DailyRoutine[]> => {
  if (!userId) return [];
  const collectionPath = getCollectionName(userId);
  try {
    // There is no way to ensure a sub-collection exists with the current API helper.
    // We'll proceed assuming it might not exist and handle the error gracefully.
    const response = await fetchFromApiV3(`collections/${collectionPath}/documents?limit=9999`);
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
    console.error(`Error fetching routines for user ${userId} via API v3:`, error);
    return [];
  }
};

export const getRoutineById = async (routineId: string, userId: string): Promise<DailyRoutine | null> => {
    if (!routineId || !userId) return null;
    const collectionPath = getCollectionName(userId);
    try {
        const response = await fetchFromApiV3(`collections/${collectionPath}/documents/${routineId}`);
        return { id: response.id, ...response.data } as DailyRoutine;
    } catch (error) {
        console.error(`Error fetching routine by ID ${routineId} via API v3:`, error);
        return null;
    }
};

export const addRoutine = async (routineData: Omit<DailyRoutine, 'id' | 'createdAt'>): Promise<DailyRoutine | null> => {
  if (!routineData.userId) return null;
  const collectionPath = getCollectionName(routineData.userId);
  try {
    const dataWithTimestamp = {
        ...routineData,
        createdAt: new Date().toISOString(),
    };
    
    // We can't use ensureCollectionExistsV3 for subcollections, so we just try to add.
    // The API should handle creating the path if it doesn't exist.
    const newDoc = await fetchFromApiV3(`collections/${collectionPath}/documents`, {
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
  try {
    const existingDoc = await fetchFromApiV3(`collections/${collectionPath}/documents/${routineId}`);
    const finalData = { ...existingDoc.data, ...updates };

    await fetchFromApiV3(`collections/${collectionPath}/documents/${routineId}`, {
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
  try {
    await fetchFromApiV3(`collections/${collectionPath}/documents/${routineId}`, {
      method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error(`Error deleting routine ${routineId} from ${collectionPath} via API v3:`, error);
    return false;
  }
};
