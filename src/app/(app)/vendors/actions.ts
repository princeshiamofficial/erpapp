

"use server";

import { revalidatePath } from "next/cache";
import type { BillReport } from "@/types";
import { addBillReport as addBillReportService } from '@/lib/bill-report-service';


export async function addBillReportAction(
  reportData: Omit<BillReport, 'id'>
): Promise<{ success: boolean; report?: BillReport; error?: string }> {
  try {
    if (!reportData.vendorId || !reportData.invoiceId || !reportData.amount || !reportData.payment) {
        return { success: false, error: "Missing required report data." };
    }
    const newReport = await addBillReportService(reportData);
    if (newReport) {
      revalidatePath("/(app)/vendors");
      return { success: true, report: newReport };
    }
    return { success: false, error: "Failed to add bill report to the database." };
  } catch (error) {
    console.error("Error in addBillReportAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected server error occurred." };
  }
}
