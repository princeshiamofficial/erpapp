

"use server";
import { format } from 'date-fns';
import type { BillReport, AdvancePaymentRecord } from '@/types';
import { getOrders } from './order-service';
import { getBillReports } from './bill-report-service';

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
                } as any);
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
                    status: 'Approved',
                    notes: "Initial advance payment (legacy).",
                } as any);
            }
        });
    } catch (error) {
        console.error("Error transforming order payments into payment history:", error);
    }

    // Now, fetch bill reports from MySQL
    try {
        const billReports = await getBillReports();
        allPayments.push(...billReports);
    } catch (error) {
        console.error("Error fetching bill reports for payment history:", error);
    }

    return allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Deprecated
export async function updatePaymentStatus(paymentId: string, newStatus: 'Approved' | 'Pending'): Promise<boolean> {
    console.warn("DEPRECATION WARNING: updatePaymentStatus in payment-history-service.ts is called. This logic has moved to order-service.ts.");
    return false;
}

// No-op now as bill-report-service handles storage
export async function addPaymentToHistory(reportData: Omit<BillReport, 'id'> & { id: string }) {
    // No operation required with MySQL migration
}
