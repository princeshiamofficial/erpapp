
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

export const addBillReport = async (reportData: Omit<BillReport, 'id'>): Promise<BillReport | null> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const newDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents`, {
        method: 'POST',
        body: JSON.stringify({ data: reportData }),
    });
    return { id: newDoc.id, ...newDoc.data } as BillReport;
  } catch (error) {
    console.error("Error adding bill report via API v3:", error);
    return null;
  }
};
