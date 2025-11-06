

import type { VendorCategory } from '@/types';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

const COLLECTION_NAME = 'vendorCategories';

export const getVendorCategories = async (): Promise<VendorCategory[]> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=4444&orderBy=name&direction=asc`);
    if (response && Array.isArray(response.documents)) {
      return response.documents.map((doc: { id: string, data: any }) => ({
        id: doc.id,
        ...doc.data
      } as VendorCategory));
    }
    return [];
  } catch (error) {
    console.error("Error fetching vendor categories via API v3:", error);
    return [];
  }
};

export const addVendorCategory = async (categoryData: Omit<VendorCategory, 'id'>): Promise<VendorCategory | null> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const newDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents`, {
        method: 'POST',
        body: JSON.stringify({ data: categoryData }),
    });
    return { id: newDoc.id, ...newDoc.data } as VendorCategory;
  } catch (error) {
    console.error("Error adding vendor category via API v3:", error);
    return null;
  }
};

export const updateVendorCategory = async (id: string, updates: Partial<VendorCategory>): Promise<boolean> => {
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
    console.error(`Error updating vendor category ${id} via API v3:`, error);
    return false;
  }
};

export const deleteVendorCategory = async (id: string): Promise<boolean> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`, {
        method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error(`Error deleting vendor category ${id} via API v3:`, error);
    return false;
  }
};
