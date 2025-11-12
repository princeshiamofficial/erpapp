
"use server";

import { format } from 'date-fns';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import type { BillPaymentRecord } from '@/types'; // Assuming payment records will be stored here.

const getPaymentHistoryCollectionName = (date: Date): string => {
  return `payHistory-${format(date, 'MM-yyyy')}`;
};

// Example function to demonstrate usage (can be expanded later)
export async function getPaymentsForMonth(month: Date): Promise<BillPaymentRecord[]> {
  const collectionName = getPaymentHistoryCollectionName(month);
  try {
    await ensureCollectionExistsV3(collectionName);
    const response = await fetchFromApiV3(`collections/${collectionName}/documents?limit=9999`);
    if (response && Array.isArray(response.documents)) {
      return response.documents.map((doc: { id: string, data: any }) => ({
        id: doc.id,
        ...doc.data
      }));
    }
    return [];
  } catch (error) {
    console.error(`Error fetching payments for ${format(month, 'MMMM yyyy')}:`, error);
    return [];
  }
}
