

"use server";

import { revalidatePath } from "next/cache";
import type { BillReport } from "@/types";
import { addBillReport as addBillReportService } from '@/lib/bill-report-service';


export async function addBillReportAction(
  reportData: Omit<BillReport, 'id'>
): Promise<{ success: boolean; report?: BillReport; error?: string }> {
  try {
    if (!reportData.vendorId || !reportData.invoiceId || !reportData.amount) {
        return { success: false, error: "Missing required bill data." };
    }
    // When adding a bill, payment is always 0 initially.
    const dataWithZeroPayment = {
        ...reportData,
        payment: 0,
        method: 'N/A' // Default method for a bill with no payment yet
    };
    const newReport = await addBillReportService(dataWithZeroPayment);
    if (newReport) {
      revalidatePath("/(app)/vendors");
      return { success: true, report: newReport };
    }
    return { success: false, error: "Failed to add bill report to the database." };
  } catch (error) {
    console.error("Error in addBillReportAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function addBillPaymentAction(
  reportData: Omit<BillReport, 'id'>
): Promise<{ success: boolean; report?: BillReport; error?: string }> {
  try {
    if (!reportData.vendorId || !reportData.payment || !reportData.method) {
        return { success: false, error: "Missing required payment data." };
    }
    // When adding a payment, the amount is 0 and invoice ID is a placeholder.
    const dataWithZeroAmount = {
        ...reportData,
        invoiceId: `PAY-${Date.now()}`,
        amount: 0,
    };
    const newReport = await addBillReportService(dataWithZeroAmount);
    if (newReport) {
      revalidatePath("/(app)/vendors");
      return { success: true, report: newReport };
    }
    return { success: false, error: "Failed to add bill payment to the database." };
  } catch (error) {
    console.error("Error in addBillPaymentAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

