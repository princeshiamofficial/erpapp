

"use server";
import { query } from './mysql';
import type { BillReport } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

const BILL_REPORTS_TABLE = 'bill_reports';

export const getBillReports = async (): Promise<BillReport[]> => {
  try {
    const results = await query<any[]>(`SELECT * FROM ${BILL_REPORTS_TABLE} ORDER BY date DESC`);
    return results.map(row => ({
      id: row.id,
      vendorId: row.vendor_id,
      vendorName: row.vendor_name,
      amount: Number(row.amount) || 0,
      payment: Number(row.payment) || 0,
      method: row.method,
      date: row.date,
      invoiceId: row.invoice_id
    } as BillReport));
  } catch (error) {
    console.error("Error fetching bill reports from MySQL:", error);
    return [];
  }
};

export const addBillReport = async (reportData: Omit<BillReport, 'id'>): Promise<BillReport | null> => {
  try {
    const id = uuidv4();
    const date = typeof reportData.date === 'string' ? reportData.date : format(reportData.date, 'yyyy-MM-dd HH:mm:ss');

    await query(
      `INSERT INTO ${BILL_REPORTS_TABLE} (id, vendor_id, vendor_name, amount, payment, method, date, invoice_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, reportData.vendorId, reportData.vendorName, reportData.amount || 0, reportData.payment || 0, reportData.method, date, reportData.invoiceId]
    );

    return { id, ...reportData } as BillReport;
  } catch (error) {
    console.error("Error adding bill report to MySQL:", error);
    return null;
  }
};

export const updateBillReport = async (id: string, updates: Partial<BillReport>): Promise<boolean> => {
  try {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.vendorId !== undefined) { fields.push('vendor_id = ?'); values.push(updates.vendorId); }
    if (updates.vendorName !== undefined) { fields.push('vendor_name = ?'); values.push(updates.vendorName); }
    if (updates.amount !== undefined) { fields.push('amount = ?'); values.push(updates.amount); }
    if (updates.payment !== undefined) { fields.push('payment = ?'); values.push(updates.payment); }
    if (updates.method !== undefined) { fields.push('method = ?'); values.push(updates.method); }
    if (updates.date !== undefined) {
      fields.push('date = ?');
      values.push(typeof updates.date === 'string' ? updates.date : format(updates.date, 'yyyy-MM-dd HH:mm:ss'));
    }
    if (updates.invoiceId !== undefined) { fields.push('invoice_id = ?'); values.push(updates.invoiceId); }

    if (fields.length === 0) return true;

    values.push(id);
    await query(`UPDATE ${BILL_REPORTS_TABLE} SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
  } catch (error) {
    console.error(`Error updating bill report ${id} in MySQL:`, error);
    return false;
  }
};


export const deleteBillReport = async (id: string): Promise<{ success: boolean, error?: string }> => {
  try {
    await query(`DELETE FROM ${BILL_REPORTS_TABLE} WHERE id = ?`, [id]);
    return { success: true };
  } catch (error) {
    console.error(`Error deleting bill report ${id} from MySQL:`, error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
};
