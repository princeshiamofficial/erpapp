
"use server";

import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import type { Vendor } from '@/types';

const COLLECTION_NAME = 'vendors';

export const getVendors = async (): Promise<Vendor[]> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=9999&orderBy=name&direction=asc`);
    if (response && Array.isArray(response.documents)) {
      return response.documents.map((doc: { id: string, data: any }) => ({
        id: doc.id,
        ...doc.data
      } as Vendor));
    }
    return [];
  } catch (error) {
    console.error("Error fetching vendors via API v3:", error);
    return [];
  }
};

export const getVendorById = async (id: string): Promise<Vendor | null> => {
  if (!id) return null;
  try {
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`);
    if (response && response.data) {
      return { id: response.id, ...response.data } as Vendor;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching vendor by ID ${id} via API v3:`, error);
    return null;
  }
};

export const addVendor = async (vendorData: Omit<Vendor, 'id' | 'vendorId' | 'createdAt' | 'updatedAt'>): Promise<Vendor | null> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);

    const allVendors = await getVendors();
    let maxIdNumber = 0;
    allVendors.forEach(vendor => {
      if (vendor.vendorId && vendor.vendorId.startsWith('V-')) {
        const numPart = parseInt(vendor.vendorId.split('-')[1], 10);
        if (!isNaN(numPart) && numPart > maxIdNumber) {
          maxIdNumber = numPart;
        }
      }
    });

    const newIdNumber = maxIdNumber + 1;
    const vendorId = `V-${String(newIdNumber).padStart(3, '0')}`;
    const now = new Date().toISOString();
    
    const newVendorData = {
      ...vendorData,
      vendorId,
      createdAt: now,
      updatedAt: now,
    };

    const newDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents`, {
      method: 'POST',
      body: JSON.stringify({ data: newVendorData }),
    });

    return {
      id: newDoc.id,
      ...newDoc.data,
    } as Vendor;
  } catch (error) {
    console.error("Error adding vendor via API v3:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateVendor = async (id: string, updates: Partial<Omit<Vendor, 'id' | 'vendorId' | 'createdAt'>>): Promise<boolean> => {
  try {
    const existingVendor = await getVendorById(id);
    if (!existingVendor) {
      throw new Error(`Vendor with ID ${id} not found.`);
    }

    const finalData = {
      ...existingVendor,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    delete (finalData as any).id;

    await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ data: finalData }),
    });
    return true;
  } catch (error) {
    console.error(`Error updating vendor ${id} via API v3:`, error);
    return false;
  }
};

export const deleteVendor = async (id: string): Promise<boolean> => {
  try {
    await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    console.error(`Error deleting vendor ${id} via API v3:`, error);
    return false;
  }
};
