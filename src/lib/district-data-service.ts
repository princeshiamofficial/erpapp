

import type { DistrictDataEntry } from '@/types';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

const COLLECTION_NAME = 'districtData'; // The collection to store manual district data

// Get all manually added district data entries
export const getManualDistrictData = async (): Promise<DistrictDataEntry[]> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=9999`);
    if (response && Array.isArray(response.documents)) {
        return response.documents.map((doc: { id: string, data: any }) => ({
            id: doc.id,
            ...doc.data
        } as DistrictDataEntry));
    }
    return [];
  } catch (error) {
    console.error("Error fetching manual district data via API v3:", error);
    return [];
  }
};

// Add a new manual district data entry
export const addManualDistrictData = async (data: Omit<DistrictDataEntry, 'id'>): Promise<DistrictDataEntry | null> => {
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
    } as DistrictDataEntry;
  } catch (error) {
    console.error("Error adding manual district data via API v3:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};
