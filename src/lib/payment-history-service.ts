

"use server";

import { format, subMonths, startOfMonth } from 'date-fns';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import type { BillReport, AdvancePaymentRecord, TrackingLink } from '@/types'; 

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

// New function to log an advance payment from an order to the history collection
export async function logAdvancePaymentToHistory(order: TrackingLink, paymentRecord: AdvancePaymentRecord): Promise<void> {
    const date = new Date(paymentRecord.date);
    const collectionName = getPaymentHistoryCollectionName(date);

    // Adapt the AdvancePaymentRecord to a specific structure for logging
    const historyEntry = {
        orderId: order.id,
        company: order.companyName,
        paymentAmount: paymentRecord.amount,
        reference: paymentRecord.id,
        status: 'Approved', // Advance payments are implicitly approved
        method: paymentRecord.paymentMethod || 'Unknown',
        date: paymentRecord.date,
        // Add original context
        _originalContext: {
          crmUserId: order.crmUserId,
          crmUserName: order.crmUserName,
          paymentNotes: paymentRecord.notes,
        }
    };

    try {
        await ensureCollectionExistsV3(collectionName);
        const docId = paymentRecord.id; // Use the payment record's unique ID
        const payload = { id: docId, data: historyEntry };

        // Use PUT to create or overwrite, preventing duplicates if the action is retried
        await fetchFromApiV3(`collections/${collectionName}/documents/${docId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
        console.log(`[logAdvancePaymentToHistory] Successfully logged payment ${docId} for order ${order.id} to ${collectionName}.`);
    } catch (error) {
        console.error(`[logAdvancePaymentToHistory] Error syncing advance payment to history collection ${collectionName}:`, error);
        // We don't re-throw here to avoid failing the main order operation
    }
}
