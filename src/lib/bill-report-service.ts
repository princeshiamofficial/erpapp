

"use server";

import type { BillReport } from '@/types';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

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

export const addBillReportAction = async (reportData: Omit<BillReport, 'id'>): Promise<{ success: boolean; report?: BillReport; error?: string }> => {
  try {
    const newDoc = await addBillReport(reportData);
    if (newDoc) {
      return { success: true, report: newDoc };
    }
    return { success: false, error: "Failed to add report to database." };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "An unexpected server error occurred." };
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

    return {
        id: newDoc.id,
        ...newDoc.data
    } as BillReport;
  } catch (error) {
    console.error("Error adding bill report via API v3:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateBillReportAction = async (reportId: string, reportData: Omit<BillReport, 'id'>): Promise<{ success: boolean; error?: string }> => {
    try {
        const success = await updateBillReport(reportId, reportData);
        if (success) {
            return { success: true };
        }
        return { success: false, error: "Failed to update report in the database." };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "An unexpected server error occurred." };
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
        return true;
    } catch (error) {
        console.error(`Error updating bill report ${id} via API v3:`, error);
        return false;
    }
};


export const deleteBillReport = async (id: string): Promise<{ success: boolean, error?: string }> => {
  try {
    await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`, {
        method: 'DELETE'
    });
    return { success: true };
  } catch (error) {
    console.error(`Error deleting bill report ${id} via API v3:`, error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
};
