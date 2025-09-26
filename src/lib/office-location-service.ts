
"use server";

import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

const COLLECTION_NAME = 'officeLocation';

export interface CompanyLocation {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
}

export const getOfficeLocations = async (): Promise<CompanyLocation[]> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=9999`);
    if (response && Array.isArray(response.documents)) {
      return response.documents.map((doc: { id: string, data: any }) => ({
        id: doc.id,
        ...doc.data
      } as CompanyLocation));
    }
    return [];
  } catch (error) {
    console.error("Error fetching office locations via API v3:", error);
    return [];
  }
};

export const addOfficeLocation = async (locationData: Omit<CompanyLocation, 'id'>): Promise<CompanyLocation | null> => {
    try {
        await ensureCollectionExistsV3(COLLECTION_NAME);
        const newDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents`, {
            method: 'POST',
            body: JSON.stringify({ data: locationData }),
        });
        return { id: newDoc.id, ...newDoc.data } as CompanyLocation;
    } catch (error) {
        console.error("Error adding office location via API v3:", error);
        return null;
    }
};

export const updateOfficeLocation = async (id: string, updates: Partial<CompanyLocation>): Promise<boolean> => {
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
        console.error(`Error updating office location ${id} via API v3:`, error);
        return false;
    }
};

export const deleteOfficeLocation = async (id: string): Promise<boolean> => {
    try {
        await ensureCollectionExistsV3(COLLECTION_NAME);
        await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`, {
            method: 'DELETE'
        });
        return true;
    } catch (error) {
        console.error(`Error deleting office location ${id} via API v3:`, error);
        return false;
    }
};
