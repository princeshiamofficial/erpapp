
"use server";

import { format, subMonths, startOfMonth } from 'date-fns';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import type { BillReport, AdvancePaymentRecord, TrackingLink } from '@/types'; 
import { getOrders } from './order-service'; // Import getOrders to fetch from the 'orders' collection

const getPaymentHistoryCollectionName = (date: Date): string => {
  return `payHistory-${format(date, 'MM-yyyy')}`;
};

// This type alias is for clarity within this service
type PaymentHistoryEntry = BillReport & { orderId?: string };


export async function getAllPaymentHistory(): Promise<PaymentHistoryEntry[]> {
    const allPayments: PaymentHistoryEntry[] = [];
    
    try {
        const allOrders = await getOrders();
        
        allOrders.forEach(order => {
            const processPayment = (payment: AdvancePaymentRecord) => {
                let displayNotes = payment.notes || null;
                if (displayNotes && displayNotes.toLowerCase().includes('steadfast webhook')) {
                    displayNotes = 'SteadFast';
                }

                allPayments.push({
                    id: payment.id,
                    orderId: order.id, // Add orderId for back-reference
                    vendorId: order.crmUserId,
                    vendorName: order.id,
                    date: payment.date,
                    invoiceId: order.companyName,
                    amount: 0,
                    payment: payment.amount,
                    method: payment.paymentMethod || 'N/A',
                    status: payment.status || 'Pending',
                    notes: displayNotes,
                });
            };

            if (order.advancePayments && order.advancePayments.length > 0) {
                order.advancePayments.forEach(processPayment);
            } else if (order.advancePayment && order.advancePayment > 0) {
                const legacyPaymentId = `${order.id}-legacy`;
                allPayments.push({
                    id: legacyPaymentId,
                    orderId: order.id,
                    vendorId: order.crmUserId,
                    vendorName: order.id,
                    date: order.createdAt,
                    invoiceId: order.companyName,
                    amount: 0,
                    payment: order.advancePayment,
                    method: order.paymentMethod || 'Unknown',
                    status: 'Approved', // Legacy payments are considered approved
                    notes: "Initial advance payment (legacy).",
                });
            }
        });
    } catch (error) {
         console.error("Error transforming order payments into payment history:", error);
    }

    return allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// This function is no longer the primary source of status updates but can be kept for other potential uses or removed.
// The primary logic is now in `order-service.ts`.
export async function updatePaymentStatus(paymentId: string, newStatus: 'Approved' | 'Pending'): Promise<boolean> {
  // This function is now a proxy or could be deprecated.
  // The actual logic should be in `order-service.ts` to update the order document directly.
  console.warn("DEPRECATION WARNING: updatePaymentStatus in payment-history-service.ts is called. This logic has moved to order-service.ts.");
  return false; // Return false to indicate the old path is not working.
}

// This function is no longer needed as we are not using a separate `payHistory` collection.
export async function logAdvancePaymentToHistory(order: TrackingLink, paymentRecord: AdvancePaymentRecord): Promise<void> {
  // The logic is now to update the order itself, which is handled in order-service.
  // This function can be left empty or removed.
  console.log("[logAdvancePaymentToHistory] This function is deprecated. Payment history is derived directly from orders.");
}
