
"use server";

import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import type { SowDataEntry } from '@/types';

const COLLECTION_NAME = 'sowData';

export const getSowEntries = async (): Promise<SowDataEntry[]> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=500&orderBy=createdAt&direction=desc`);
    if (response && Array.isArray(response.documents)) {
        return response.documents.map((doc: { id: string, data: any }) => ({
            id: doc.id,
            ...doc.data
        } as SowDataEntry));
    }
    return [];
  } catch (error) {
    console.error("Error fetching SOW entries via API v3:", error);
    return [];
  }
};

export const addSowEntry = async (data: Omit<SowDataEntry, 'id'>): Promise<SowDataEntry | null> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const payload = { data };
    const newDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    return {
        id: newDoc.id,
        ...newDoc.data
    } as SowDataEntry;
  } catch (error) {
    console.error("Error adding SOW entry via API v3:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};
