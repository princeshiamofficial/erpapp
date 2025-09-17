
import type { Dr2oEntry } from '@/types';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

const COLLECTION_NAME = 'dr2o';

export const getDr2oEntries = async (): Promise<Dr2oEntry[]> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=9999`);
    if (response && Array.isArray(response.documents)) {
      return response.documents.map((doc: { id: string, data: any }) => ({
        id: doc.id,
        ...doc.data,
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching DR 2.O entries via API v3:", error);
    return [];
  }
};

export const addDr2oEntry = async (entryData: Omit<Dr2oEntry, 'id'>): Promise<Dr2oEntry | null> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const payload = { data: entryData };
    const newDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return { id: newDoc.id, ...newDoc.data };
  } catch (error) {
    console.error("Error adding DR 2.O entry via API v3:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateDr2oEntry = async (id: string, updates: Partial<Dr2oEntry>): Promise<boolean> => {
  try {
    const existingDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`);
    const finalData = { ...existingDoc.data, ...updates };

    await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ data: finalData }),
    });
    return true;
  } catch (error) {
    console.error(`Error updating DR 2.O entry ${id} via API v3:`, error);
    return false;
  }
};
