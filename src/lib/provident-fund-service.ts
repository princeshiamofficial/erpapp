
"use server";

import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import type { ProvidentFundRecord } from '@/types';

const COLLECTION_NAME = 'providentFund';

/**
 * Fetches all provident fund records, optionally filtered by employee ID.
 * @param employeeId Optional ID to filter records by.
 * @returns A list of provident fund records.
 */
export const getProvidentFundRecords = async (employeeId?: string): Promise<ProvidentFundRecord[]> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    let url = `collections/${COLLECTION_NAME}/documents?limit=9999`;
    
    const response = await fetchFromApiV3(url);
    if (response && Array.isArray(response.documents)) {
      const records = response.documents.map((doc: any) => ({
        id: doc.id,
        ...doc.data
      } as ProvidentFundRecord));

      if (employeeId) {
          return records.filter(r => r.employeeId === employeeId);
      }
      return records;
    }
    return [];
  } catch (error) {
    console.error("Error fetching Provident Fund records via API v3:", error);
    return [];
  }
};

/**
 * Adds or updates a provident fund record.
 * @param record The record to save.
 * @returns True if successful, false otherwise.
 */
export const updateProvidentFundRecord = async (record: ProvidentFundRecord): Promise<boolean> => {
    try {
        await ensureCollectionExistsV3(COLLECTION_NAME);
        const docId = record.id;
        const payload = { id: docId, data: record };
        
        // Use PUT to create or update the document with a predictable ID
        await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${docId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        return true;
    } catch (error) {
        console.error(`Error updating Provident Fund record ${record.id} via API v3:`, error);
        return false;
    }
};

/**
 * Deletes a provident fund record.
 * @param id The ID of the record to delete.
 * @returns True if successful, false otherwise.
 */
export const deleteProvidentFundRecord = async (id: string): Promise<boolean> => {
    try {
        await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`, {
            method: 'DELETE'
        });
        return true;
    } catch (error) {
        console.error(`Error deleting Provident Fund record ${id} via API v3:`, error);
        return false;
    }
};
