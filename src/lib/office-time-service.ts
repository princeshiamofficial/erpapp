
"use server";

import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import type { OfficeTime } from '@/types';

const COLLECTION_NAME = 'officeTime';

export const getOfficeTimes = async (): Promise<OfficeTime[]> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=50`);
    if (response && Array.isArray(response.documents)) {
      return response.documents.map((doc: { id: string, data: any }) => ({
        id: doc.id,
        ...doc.data
      } as OfficeTime));
    }
    return [];
  } catch (error) {
    console.error("Error fetching office times via API v3:", error);
    return [];
  }
};

export const addOfficeTime = async (officeTimeData: Omit<OfficeTime, 'id'>): Promise<OfficeTime | null> => {
    try {
        await ensureCollectionExistsV3(COLLECTION_NAME);
        const newDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents`, {
            method: 'POST',
            body: JSON.stringify({ data: officeTimeData }),
        });
        return { id: newDoc.id, ...newDoc.data } as OfficeTime;
    } catch (error) {
        console.error("Error adding office time via API v3:", error);
        return null;
    }
};

export const updateOfficeTime = async (id: string, updates: Partial<OfficeTime>): Promise<boolean> => {
    try {
        await ensureCollectionExistsV3(COLLECTION_NAME);
        const existingDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`);
        const finalData = { ...existingDoc.data, ...updates };
        await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ data: finalData })
        });
        return true;
    } catch (error) {
        console.error(`Error updating office time ${id} via API v3:`, error);
        return false;
    }
};

export const deleteOfficeTime = async (id: string): Promise<boolean> => {
    try {
        await ensureCollectionExistsV3(COLLECTION_NAME);
        await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`, {
            method: 'DELETE'
        });
        return true;
    } catch (error) {
        console.error(`Error deleting office time ${id} via API v3:`, error);
        return false;
    }
};
