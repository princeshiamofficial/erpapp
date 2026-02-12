"use server";

import { query } from './mysql';
import type { VendorBill } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { addBillReport } from './bill-report-service';

const VENDOR_BILLS_TABLE = 'vendor_bills';

export const getVendorBills = async (): Promise<VendorBill[]> => {
  try {
    const results = await query<any[]>(`SELECT * FROM ${VENDOR_BILLS_TABLE} ORDER BY bill_date DESC`);
    return results.map(row => ({
      id: row.id,
      vendorId: row.vendor_id,
      vendorName: row.vendor_name,
      billDate: row.bill_date,
      dueDate: row.due_date,
      total: row.total_amount,
      paidAmount: row.paid_amount,
      dueAmount: row.due_amount,
      status: row.status,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
      payments: typeof row.payments === 'string' ? JSON.parse(row.payments) : row.payments,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // billId is usually same as id in this context
      billId: row.id
    } as VendorBill));
  } catch (error) {
    console.error("Error fetching vendor bills from MySQL:", error);
    return [];
  }
};

export const getBillById = async (id: string): Promise<VendorBill | null> => {
  if (!id) return null;
  try {
    const results = await query<any[]>(`SELECT * FROM ${VENDOR_BILLS_TABLE} WHERE id = ?`, [id]);
    if (results.length > 0) {
      const row = results[0];
      return {
        id: row.id,
        vendorId: row.vendor_id,
        vendorName: row.vendor_name,
        billDate: row.bill_date,
        dueDate: row.due_date,
        total: row.total_amount,
        paidAmount: row.paid_amount,
        dueAmount: row.due_amount,
        status: row.status,
        items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
        payments: typeof row.payments === 'string' ? JSON.parse(row.payments) : row.payments,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        billId: row.id
      } as VendorBill;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching vendor bill by ID ${id} from MySQL:`, error);
    return null;
  }
};

export const addVendorBill = async (billData: Omit<VendorBill, 'id'>): Promise<VendorBill | null> => {
  try {
    const currentDate = new Date();
    const datePrefix = `INV-${format(currentDate, 'yyyyMMdd')}-`;

    const results = await query<any[]>(`SELECT id FROM ${VENDOR_BILLS_TABLE} WHERE id LIKE ? ORDER BY id DESC LIMIT 1`, [`${datePrefix}%`]);
    let newSequence = 1;
    if (results.length > 0) {
      const lastId = results[0].id;
      const parts = lastId.split('-');
      const lastSeq = parseInt(parts.pop() || '0', 10);
      if (!isNaN(lastSeq)) newSequence = lastSeq + 1;
    }
    const billId = `${datePrefix}${String(newSequence).padStart(3, '0')}`;

    const billDataWithId = { ...billData, billId };
    const createdAt = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const updatedAt = createdAt;
    const billDate = typeof billData.billDate === 'string' ? billData.billDate : format(billData.billDate, 'yyyy-MM-dd HH:mm:ss');
    const dueDate = billData.dueDate ? (typeof billData.dueDate === 'string' ? billData.dueDate : format(billData.dueDate, 'yyyy-MM-dd HH:mm:ss')) : null;

    await query(
      `INSERT INTO ${VENDOR_BILLS_TABLE} (id, vendor_id, vendor_name, bill_date, due_date, total_amount, paid_amount, due_amount, status, items, payments, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        billId, billData.vendorId, billData.vendorName, billDate, dueDate,
        billData.total, billData.paidAmount, billData.dueAmount, billData.status,
        JSON.stringify(billData.items), JSON.stringify(billData.payments),
        createdAt, updatedAt
      ]
    );

    await addBillReport({
      vendorId: billData.vendorId,
      vendorName: billData.vendorName,
      date: billData.billDate,
      invoiceId: billId,
      amount: billData.total,
      payment: 0,
      method: 'N/A'
    });

    return { id: billId, ...billDataWithId } as VendorBill;
  } catch (error) {
    console.error("Error adding vendor bill to MySQL:", error);
    return null;
  }
};

export const updateVendorBill = async (id: string, updates: Partial<Omit<VendorBill, 'id'>>): Promise<boolean> => {
  try {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.vendorId !== undefined) { fields.push('vendor_id = ?'); values.push(updates.vendorId); }
    if (updates.vendorName !== undefined) { fields.push('vendor_name = ?'); values.push(updates.vendorName); }
    if (updates.billDate !== undefined) {
      fields.push('bill_date = ?');
      values.push(typeof updates.billDate === 'string' ? updates.billDate : format(updates.billDate, 'yyyy-MM-dd HH:mm:ss'));
    }
    if (updates.dueDate !== undefined) {
      fields.push('due_date = ?');
      values.push(updates.dueDate ? (typeof updates.dueDate === 'string' ? updates.dueDate : format(updates.dueDate, 'yyyy-MM-dd HH:mm:ss')) : null);
    }
    if (updates.total !== undefined) { fields.push('total_amount = ?'); values.push(updates.total); }
    if (updates.paidAmount !== undefined) { fields.push('paid_amount = ?'); values.push(updates.paidAmount); }
    if (updates.dueAmount !== undefined) { fields.push('due_amount = ?'); values.push(updates.dueAmount); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.items !== undefined) { fields.push('items = ?'); values.push(JSON.stringify(updates.items)); }
    if (updates.payments !== undefined) { fields.push('payments = ?'); values.push(JSON.stringify(updates.payments)); }

    fields.push('updated_at = ?');
    values.push(format(new Date(), 'yyyy-MM-dd HH:mm:ss'));

    if (fields.length === 1) return true; // Only updated_at

    values.push(id);
    await query(`UPDATE ${VENDOR_BILLS_TABLE} SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
  } catch (error) {
    console.error(`Error updating vendor bill ${id} in MySQL:`, error);
    return false;
  }
};

export const deleteVendorBill = async (id: string): Promise<boolean> => {
  try {
    await query(`DELETE FROM ${VENDOR_BILLS_TABLE} WHERE id = ?`, [id]);
    return true;
  } catch (error) {
    console.error(`Error deleting vendor bill ${id} from MySQL:`, error);
    return false;
  }
};
