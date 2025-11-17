

"use server";

import type { BillReport } from '@/types';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import { format } from 'date-fns';
import { addPaymentToHistory } from './payment-history-service'; // Import the service

const COLLECTION_NAME = 'billReports';

export const getBillReports = async (): Promise<BillReport[]> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=9999&orderBy=date&direction=desc`);
    if (response && Array.isArray(response.documents)) {
      return response.documents.map((doc: { id: string, data: any }) => ({
        id: doc.id,
        ...doc.data
      } as BillReport));
    }
    return [];
  } catch (error) {
    console.error("Error fetching bill reports via API v3:", error);
    return [];
  }
};

export const addBillReport = async (reportData: Omit<BillReport, 'id'>): Promise<BillReport | null> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const payload = { data: reportData };
    const newDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    const newEntry = {
        id: newDoc.id,
        ...newDoc.data
    } as BillReport;

    // Also add to the centralized payment history
    await addPaymentToHistory(newEntry);

    return newEntry;
  } catch (error) {
    console.error("Error adding bill report via API v3:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateBillReport = async (id: string, updates: Partial<BillReport>): Promise<boolean> => {
    try {
        const existingDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`);
        const finalData = { ...existingDoc.data, ...updates };
        await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ data: finalData })
        });
        
        // Also update the centralized payment history
        await addPaymentToHistory(finalData as Omit<BillReport, 'id'> & {id: string});

        return true;
    } catch (error) {
        console.error(`Error updating bill report ${id} via API v3:`, error);
        return false;
    }
};


export const deleteBillReport = async (id: string): Promise<{ success: boolean, error?: string }> => {
  try {
    // Also delete from the payment history
    const reportToDelete = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`);
    if (reportToDelete && reportToDelete.data) {
        const date = new Date(reportToDelete.data.date);
        const historyCollectionName = `payHistory-${format(date, 'MM-yyyy')}`;
        await fetchFromApiV3(`collections/${historyCollectionName}/documents/${id}`, {
            method: 'DELETE'
        }).catch(err => console.warn(`Could not delete from payment history, it might not exist: ${err.message}`));
    }
    
    await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`, {
        method: 'DELETE'
    });

    return { success: true };
  } catch (error) {
    console.error(`Error deleting bill report ${id} via API v3:`, error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
};
