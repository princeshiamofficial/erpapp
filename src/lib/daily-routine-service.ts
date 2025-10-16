

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
    // The endpoint needs to be correctly formatted for subcollections
    const endpoint = `/collections/users/documents/${userId}/collections/dailyRoutines/documents?limit=9999`;
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
    console.error(`Error fetching routines for user ${userId} via API v3:`, error);
    return [];
  }
};

export const getRoutineById = async (routineId: string, userId: string): Promise<DailyRoutine | null> => {
    if (!routineId || !userId) return null;
    const endpoint = `/collections/users/documents/${userId}/collections/dailyRoutines/documents/${routineId}`;
    try {
        const response = await fetchFromApiV3(endpoint);
        return { id: response.id, ...response.data } as DailyRoutine;
    } catch (error) {
        console.error(`Error fetching routine by ID ${routineId} via API v3:`, error);
        return null;
    }
};

export const addRoutine = async (routineData: Omit<DailyRoutine, 'id' | 'createdAt'>): Promise<DailyRoutine | null> => {
  if (!routineData.userId) return null;
  const endpoint = `/collections/users/documents/${routineData.userId}/collections/dailyRoutines/documents`;
  try {
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
    console.error(`Error adding routine to ${endpoint} via API v3:`, error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateRoutine = async (routineId: string, userId: string, updates: Partial<Omit<DailyRoutine, 'id' | 'userId'>>): Promise<boolean> => {
  if (!routineId || !userId) return false;
  const endpoint = `/collections/users/documents/${userId}/collections/dailyRoutines/documents/${routineId}`;
  try {
    const existingDoc = await fetchFromApiV3(endpoint);
    const finalData = { ...existingDoc.data, ...updates };

    await fetchFromApiV3(endpoint, {
        method: 'PUT',
        body: JSON.stringify({ data: finalData })
    });
    return true;
  } catch (error) {
    console.error(`Error updating routine ${routineId} in ${endpoint} via API v3:`, error);
    return false;
  }
};

export const deleteRoutine = async (routineId: string, userId: string): Promise<boolean> => {
  if (!routineId || !userId) return false;
  const endpoint = `/collections/users/documents/${userId}/collections/dailyRoutines/documents/${routineId}`;
  try {
    await fetchFromApiV3(endpoint, {
      method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error(`Error deleting routine ${routineId} from ${endpoint} via API v3:`, error);
    return false;
  }
};
