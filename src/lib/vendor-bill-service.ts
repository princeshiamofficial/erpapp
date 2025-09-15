

import type { VendorBill, BillPaymentRecord } from '@/types';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

const COLLECTION_NAME = 'vendorBills';

export const getVendorBills = async (): Promise<VendorBill[]> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=9999&orderBy=billDate&direction=desc`);
    if (response && Array.isArray(response.documents)) {
      return response.documents.map((doc: { id: string, data: any }) => ({
        id: doc.id,
        ...doc.data
      } as VendorBill));
    }
    return [];
  } catch (error) {
    console.error("Error fetching vendor bills via API v3:", error);
    return [];
  }
};

export const getBillById = async (id: string): Promise<VendorBill | null> => {
    if (!id) return null;
    try {
        const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`);
        if (response && response.data) {
            return { id: response.id, ...response.data } as VendorBill;
        }
        return null;
    } catch (error) {
        if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
          return null;
        }
        console.error(`Error fetching vendor bill by ID ${id} via API v3:`, error);
        return null;
    }
};

export const addVendorBill = async (billData: Omit<VendorBill, 'id'>): Promise<VendorBill | null> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);

    const currentDate = new Date();
    const datePrefix = `INV-${format(currentDate, 'yyyyMMdd')}-`;
    
    // Fetch all bills to determine the next sequence number for the day
    const allBillsResponse = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=9999`);
    let newSequence = 1;
    if (allBillsResponse && Array.isArray(allBillsResponse.documents)) {
        const sameDayBills = allBillsResponse.documents.filter((doc: { data: any }) => doc.data.billId?.startsWith(datePrefix));
        if (sameDayBills.length > 0) {
            const lastSequence = Math.max(...sameDayBills.map((doc: { data: any }) => {
                const numPart = parseInt(doc.data.billId.split('-').pop() || '0', 10);
                return isNaN(numPart) ? 0 : numPart;
            }));
            newSequence = lastSequence + 1;
        }
    }
    const billId = `${datePrefix}${String(newSequence).padStart(3, '0')}`;
    
    const billDataWithId = {
      ...billData,
      billId: billId, // Add the custom formatted ID
    };

    const newDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents`, {
        method: 'POST',
        body: JSON.stringify({ data: billDataWithId }),
    });
    return { id: newDoc.id, ...newDoc.data } as VendorBill;
  } catch (error) {
    console.error("Error adding vendor bill via API v3:", error);
    return null;
  }
};

export const updateVendorBill = async (id: string, updates: Partial<Omit<VendorBill, 'id'>>): Promise<boolean> => {
    try {
        const existingDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`);
        const finalData = { ...existingDoc.data, ...updates };

        await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ data: finalData })
        });
        return true;
    } catch (error) {
        console.error(`Error updating vendor bill ${id} via API v3:`, error);
        return false;
    }
};

export const deleteVendorBill = async (id: string): Promise<boolean> => {
    try {
        await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`, {
            method: 'DELETE'
        });
        return true;
    } catch (error) {
        console.error(`Error deleting vendor bill ${id} via API v3:`, error);
        return false;
    }
};

