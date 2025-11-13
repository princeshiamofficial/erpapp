
"use server";

import { format, subMonths, startOfMonth } from 'date-fns';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import type { BillReport, AdvancePaymentRecord, TrackingLink } from '@/types'; 
import { getOrders } from './order-service'; // Import getOrders to fetch from the 'orders' collection

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

export async function getAllPaymentHistory(): Promise<BillReport[]> {
    try {
        const allOrders = await getOrders();
        const allPayments: BillReport[] = [];

        allOrders.forEach(order => {
            if (order.advancePayments && order.advancePayments.length > 0) {
                order.advancePayments.forEach(payment => {
                    allPayments.push({
                        id: payment.id,
                        vendorId: order.crmUserId, // Using crmUserId as a reference
                        vendorName: order.id, // Storing Order ID here
                        date: payment.date,
                        invoiceId: order.companyName, // Storing Company name here
                        amount: 0, // Not applicable in this context
                        payment: payment.amount,
                        method: payment.paymentMethod || 'N/A',
                        status: 'Approved', // All advance payments are considered approved
                    });
                });
            } else if (order.advancePayment && order.advancePayment > 0) {
                // Handle legacy advance payment field
                allPayments.push({
                    id: `${order.id}-legacy`,
                    vendorId: order.crmUserId,
                    vendorName: order.id,
                    date: order.createdAt,
                    invoiceId: order.companyName,
                    amount: 0,
                    payment: order.advancePayment,
                    method: order.paymentMethod || 'Unknown',
                    status: 'Approved',
                });
            }
        });

        // Sort by date descending
        return allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
        console.error("Error transforming order payments into payment history:", error);
        return [];
    }
}

// This function is no longer the primary source for the history page, but might be used elsewhere.
// It will be kept for now to avoid breaking other potential dependencies.
export async function logAdvancePaymentToHistory(order: TrackingLink, paymentRecord: AdvancePaymentRecord): Promise<void> {
    const date = new Date(paymentRecord.date);
    const collectionName = getPaymentHistoryCollectionName(date);

    // This structure is now for backup purposes, the main history page reads directly from orders.
    const historyEntry = {
        orderId: order.id,
        company: order.companyName,
        paymentAmount: paymentRecord.amount,
        reference: paymentRecord.notes || paymentRecord.id, // Use notes as reference
        status: 'Approved',
        method: paymentRecord.paymentMethod || 'Unknown',
        date: paymentRecord.date,
        _originalContext: {
          crmUserId: order.crmUserId,
          crmUserName: order.crmUserName,
          paymentRecordId: paymentRecord.id
        }
    };

    try {
        await ensureCollectionExistsV3(collectionName);
        const docId = paymentRecord.id; 
        const payload = { id: docId, data: historyEntry };

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
