

"use server";

import type { DailyRoutine } from '@/types';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

const getHeadersCollectionName = (userId: string) => `routine-headers-${userId}`;
const getDailyCollectionName = (userId: string, date: Date) => `routines-${userId}-${format(date, 'MM-yyyy')}`;

export const getRoutineHeadersForUser = async (userId: string): Promise<DailyRoutine[]> => {
  if (!userId) return [];
  const collectionPath = getHeadersCollectionName(userId);
  try {
    const endpoint = `collections/${collectionPath}/documents?limit=9999&orderBy=createdAt&direction=asc`;
    const response = await fetchFromApiV3(endpoint);
    
    if (response && Array.isArray(response.documents)) {
      return response.documents
        .map((doc: { id: string, data: any }) => ({
          id: doc.id,
          ...doc.data
        } as DailyRoutine));
    }
    return [];
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
      return [];
    }
    console.error(`Error fetching routine headers for user ${userId} from collection ${collectionPath} via API v3:`, error);
    return [];
  }
};

export const addRoutineHeader = async (routineData: Omit<DailyRoutine, 'id' | 'createdAt' | 'updatedAt' | 'completedTasks'>): Promise<DailyRoutine | null> => {
  if (!routineData.userId || !routineData.title) return null;
  const collectionPath = getHeadersCollectionName(routineData.userId);
  try {
    await ensureCollectionExistsV3(collectionPath);
    const dataWithTimestamp: Omit<DailyRoutine, 'id'> = {
      userId: routineData.userId,
      title: routineData.title,
      time: routineData.time,
      description: routineData.description,
      color: routineData.color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const newDoc = await fetchFromApiV3(`collections/${collectionPath}/documents`, {
      method: 'POST',
      body: JSON.stringify({ data: dataWithTimestamp }),
    });
    return { id: newDoc.id, ...newDoc.data } as DailyRoutine;
  } catch (error) {
    console.error(`Error adding routine header via API v3:`, error);
    return null;
  }
};

export const updateRoutineHeader = async (id: string, updates: Partial<Omit<DailyRoutine, 'id' | 'userId'>>, userId: string): Promise<boolean> => {
  if (!id || !userId) return false;
  const collectionPath = getHeadersCollectionName(userId);
  try {
    const existingDoc = await fetchFromApiV3(`collections/${collectionPath}/documents/${id}`);
    const finalData = { ...existingDoc.data, ...updates, updatedAt: new Date().toISOString() };
    
    await fetchFromApiV3(`collections/${collectionPath}/documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ data: finalData })
    });
    return true;
  } catch(error) {
    console.error(`Error updating routine header ${id} via API v3:`, error);
    return false;
  }
};

export const deleteRoutineHeader = async (id: string, userId: string): Promise<boolean> => {
  if (!id || !userId) return false;
  const collectionPath = getHeadersCollectionName(userId);
  try {
    await fetchFromApiV3(`collections/${collectionPath}/documents/${id}`, {
        method: 'DELETE'
    });
    return true;
  } catch(error) {
    console.error(`Error deleting routine header ${id} via API v3:`, error);
    return false;
  }
};


// Functions for daily check-in data

export const getRoutinesForUser = async (userId: string, month: Date): Promise<DailyRoutine[]> => {
  if (!userId) return [];
  const collectionPath = getDailyCollectionName(userId, month);
  try {
    const endpoint = `collections/${collectionPath}/documents?limit=9999`;
    const response = await fetchFromApiV3(endpoint);
    
    if (response && Array.isArray(response.documents)) {
      return response.documents
        .map((doc: { id: string, data: any }) => ({
          id: doc.id,
          ...doc.data
        } as DailyRoutine));
    }
    return [];
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
      return [];
    }
    console.error(`Error fetching routine entries for user ${userId} from collection ${collectionPath} via API v3:`, error);
    return [];
  }
};

export const getRoutineById = async (routineId: string, userId: string): Promise<DailyRoutine | null> => {
    if (!routineId || !userId) return null;
    const dateFromId = new Date(routineId);
    const collectionPath = getDailyCollectionName(userId, dateFromId);
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

export const toggleRoutineTask = async (userId: string, date: string, taskId: string): Promise<DailyRoutine | null> => {
  if (!userId || !date || !taskId) return null;
  const dateObj = new Date(date);
  const collectionPath = getDailyCollectionName(userId, dateObj);
  const docId = date;
  const endpoint = `collections/${collectionPath}/documents/${docId}`;
  
  try {
    await ensureCollectionExistsV3(collectionPath);
    let existingDoc = await getRoutineById(docId, userId);

    if (!existingDoc) {
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
      const currentTasks = existingDoc.completedTasks || [];
      const taskIndex = currentTasks.indexOf(taskId);
      
      let updatedTasks: string[];
      if (taskIndex > -1) {
        updatedTasks = currentTasks.filter(t => t !== taskId);
      } else {
        updatedTasks = [...currentTasks, taskId];
      }
      
      const updates = {
        completedTasks: updatedTasks,
        updatedAt: new Date().toISOString(),
      };

      const finalData = { ...existingDoc, ...updates };
      delete (finalData as any).id;

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
