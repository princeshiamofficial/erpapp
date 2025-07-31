
"use server";

import type { ReportData } from '@/lib/report-service';
import { getOrdersForReport } from '@/lib/report-service';

export async function generateReportAction(
  title: string,
  customContent: string | null
): Promise<ReportData | null> {
  try {
    // For this example, we'll fetch the latest 50 orders.
    // This could be expanded with more parameters (date ranges, user filters, etc.)
    const orders = await getOrdersForReport({ limit: 50 });

    const reportData: ReportData = {
      title,
      customContent: customContent || null,
      generatedAt: new Date().toISOString(),
      orders: orders,
    };

    return reportData;
  } catch (error) {
    console.error("Error in generateReportAction:", error);
    return null;
  }
}
