
import type { DistrictDataEntry } from '@/types';
import { fetchFromApi, ensureCollectionExists } from './api-helper';

const COLLECTION_NAME = 'districtData'; // The collection to store manual district data

// Get all manually added district data entries
export const getManualDistrictData = async (): Promise<DistrictDataEntry[]> => {
  try {
    await ensureCollectionExists(COLLECTION_NAME);
    const response = await fetchFromApi(`collections/${COLLECTION_NAME}/documents?limit=500`);
    if (response && Array.isArray(response.documents)) {
        return response.documents.map((doc: { id: string, data: any }) => ({
            id: doc.id,
            ...doc.data
        } as DistrictDataEntry));
    }
    return [];
  } catch (error) {
    console.error("Error fetching manual district data via API:", error);
    return [];
  }
};

// Add a new manual district data entry
export const addManualDistrictData = async (data: Omit<DistrictDataEntry, 'id'>): Promise<DistrictDataEntry | null> => {
  try {
    await ensureCollectionExists(COLLECTION_NAME);
    const payload = { data };
    const newDoc = await fetchFromApi(`collections/${COLLECTION_NAME}/documents`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    return {
        id: newDoc.id,
        ...newDoc.data
    } as DistrictDataEntry;
  } catch (error) {
    console.error("Error adding manual district data via API:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};
