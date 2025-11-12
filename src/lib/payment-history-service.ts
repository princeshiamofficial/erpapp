
"use server";

import { format, subMonths, startOfMonth } from 'date-fns';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import type { BillReport } from '@/types'; 

const getPaymentHistoryCollectionName = (date: Date): string => {
  return `payHistory-${format(date, 'MM-yyyy')}`;
};

export async function getPaymentsForMonth(month: Date): Promise<BillReport[]> {
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
    if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
        return []; // It's okay if a month's collection doesn't exist
    }
    console.error(`Error fetching payments for ${format(month, 'MMMM yyyy')}:`, error);
    return [];
  }
}

export async function getAllPaymentHistory(monthsToFetch: number = 24): Promise<BillReport[]> {
    const allPayments: BillReport[] = [];
    const today = new Date();

    const monthFetchPromises: Promise<BillReport[]>[] = [];

    for (let i = 0; i < monthsToFetch; i++) {
        const monthDate = subMonths(today, i);
        monthFetchPromises.push(getPaymentsForMonth(monthDate));
    }

    try {
        const monthlyResults = await Promise.all(monthFetchPromises);
        monthlyResults.forEach(payments => {
            allPayments.push(...payments);
        });

        // Sort by date descending
        return allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
        console.error("Error fetching all payment history:", error);
        return [];
    }
}
