
"use server";

import { format, subMonths, startOfMonth } from 'date-fns';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import type { BillReport, AdvancePaymentRecord, TrackingLink } from '@/types'; 
import { getOrders } from './order-service'; // Import getOrders to fetch from the 'orders' collection

const getPaymentHistoryCollectionName = (date: Date): string => {
  return `payHistory-${format(date, 'MM-yyyy')}`;
};

export async function getAllPaymentHistory(): Promise<BillReport[]> {
    const monthsToFetch = Array.from({ length: 24 }, (_, i) => subMonths(new Date(), i));
    const allPayments: BillReport[] = [];

    for (const month of monthsToFetch) {
        const collectionName = getPaymentHistoryCollectionName(month);
        try {
            await ensureCollectionExistsV3(collectionName);
            const response = await fetchFromApiV3(`collections/${collectionName}/documents?limit=9999`);
            if (response && Array.isArray(response.documents)) {
                const paymentsFromMonth = response.documents.map((doc: { id: string, data: any }) => ({
                    id: doc.id,
                    ...doc.data
                }));
                allPayments.push(...paymentsFromMonth);
            }
        } catch (error) {
            if (!(error instanceof Error && error.message.toLowerCase().includes('not found'))) {
                console.error(`Error fetching payment history from ${collectionName}:`, error);
            }
        }
    }
    
    // Fallback for legacy data or if a month's collection fails: read from orders.
    // This is now less critical but good for robustness.
    try {
        const allOrders = await getOrders();
        allOrders.forEach(order => {
            const processPayment = (payment: AdvancePaymentRecord) => {
                if (!allPayments.find(p => p.id === payment.id)) {
                    let displayNotes = payment.notes || null;
                    if (displayNotes && displayNotes.toLowerCase().includes('steadfast webhook')) {
                        displayNotes = 'SteadFast';
                    }
                    allPayments.push({
                        id: payment.id,
                        vendorId: order.crmUserId,
                        vendorName: order.id,
                        date: payment.date,
                        invoiceId: order.companyName,
                        amount: 0,
                        payment: payment.amount,
                        method: payment.paymentMethod || 'N/A',
                        status: 'Pending',
                        notes: displayNotes,
                    });
                }
            };

            if (order.advancePayments && order.advancePayments.length > 0) {
                order.advancePayments.forEach(processPayment);
            } else if (order.advancePayment && order.advancePayment > 0) {
                const legacyPaymentId = `${order.id}-legacy`;
                if (!allPayments.find(p => p.id === legacyPaymentId)) {
                    allPayments.push({
                        id: legacyPaymentId,
                        vendorId: order.crmUserId,
                        vendorName: order.id,
                        date: order.createdAt,
                        invoiceId: order.companyName,
                        amount: 0,
                        payment: order.advancePayment,
                        method: order.paymentMethod || 'Unknown',
                        status: 'Pending',
                        notes: "Initial advance payment (legacy).",
                    });
                }
            }
        });
    } catch (error) {
         console.error("Error transforming order payments into payment history:", error);
    }


    return allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}


export async function logAdvancePaymentToHistory(order: TrackingLink, paymentRecord: AdvancePaymentRecord): Promise<void> {
    const date = new Date(paymentRecord.date);
    const collectionName = getPaymentHistoryCollectionName(date);

    let displayNotes = paymentRecord.notes || null;
    if (displayNotes && displayNotes.toLowerCase().includes('steadfast webhook')) {
        displayNotes = 'SteadFast';
    }

    const historyEntry: BillReport = {
        id: paymentRecord.id,
        vendorId: order.crmUserId,
        vendorName: order.id,
        date: paymentRecord.date,
        invoiceId: order.companyName,
        amount: 0,
        payment: paymentRecord.amount,
        method: paymentRecord.paymentMethod || 'N/A',
        status: 'Pending',
        notes: displayNotes,
    };

    try {
        await ensureCollectionExistsV3(collectionName);
        const docId = paymentRecord.id; 
        const payload = { id: docId, data: historyEntry };

        await fetchFromApiV3(`collections/${collectionName}/documents/${docId}`, {
            method: 'PUT', // Use PUT to create or overwrite, ensuring idempotency
            body: JSON.stringify(payload),
        });
        console.log(`[logAdvancePaymentToHistory] Successfully logged payment ${docId} for order ${order.id} to ${collectionName}.`);
    } catch (error) {
        console.error(`[logAdvancePaymentToHistory] Error syncing advance payment to history collection ${collectionName}:`, error);
        // We don't re-throw here to avoid failing the main order operation
    }
}

export async function updatePaymentStatus(paymentId: string, newStatus: 'Paid' | 'Pending'): Promise<{ success: boolean, error?: string }> {
  const allPayments = await getAllPaymentHistory();
  const paymentToUpdate = allPayments.find(p => p.id === paymentId);

  if (!paymentToUpdate) {
    return { success: false, error: 'Payment record not found.' };
  }
  
  const date = new Date(paymentToUpdate.date);
  const collectionName = getPaymentHistoryCollectionName(date);
  
  try {
    const updatedData = { ...paymentToUpdate, status: newStatus };
    delete (updatedData as any).id; // The API expects data only

    await fetchFromApiV3(`collections/${collectionName}/documents/${paymentId}`, {
      method: 'PUT',
      body: JSON.stringify({ id: paymentId, data: updatedData }),
    });
    return { success: true };
  } catch (error) {
    console.error(`Error updating payment status for ${paymentId}:`, error);
    return { success: false, error: 'Failed to update status in the database.' };
  }
}
