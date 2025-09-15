

import type { VendorProduct } from '@/types';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

const COLLECTION_NAME = 'vendorProducts';

export const getVendorProducts = async (): Promise<VendorProduct[]> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=9999&orderBy=name&direction=asc`);
    if (response && Array.isArray(response.documents)) {
      return response.documents.map((doc: { id: string, data: any }) => ({
        id: doc.id,
        ...doc.data
      } as VendorProduct));
    }
    return [];
  } catch (error) {
    console.error("Error fetching vendor products via API v3:", error);
    return [];
  }
};

export const addVendorProduct = async (productData: Omit<VendorProduct, 'id'>): Promise<VendorProduct | null> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const newDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents`, {
        method: 'POST',
        body: JSON.stringify({ data: productData }),
    });
    return { id: newDoc.id, ...newDoc.data } as VendorProduct;
  } catch (error) {
    console.error("Error adding vendor product via API v3:", error);
    return null;
  }
};

export const updateVendorProduct = async (id: string, updates: Partial<VendorProduct>): Promise<boolean> => {
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
    console.error(`Error updating vendor product ${id} via API v3:`, error);
    return false;
  }
};

export const deleteVendorProduct = async (id: string): Promise<boolean> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`, {
        method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error(`Error deleting vendor product ${id} via API v3:`, error);
    return false;
  }
};
