"use server";

import type { TrackingLink, OrderLogEntry, OrderItem, AdvancePaymentRecord } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { query } from './mysql';
import { parseISO } from 'date-fns';

const QUOTATIONS_TABLE = 'quotations';

export const getQuotations = async (searchTerm?: string): Promise<TrackingLink[]> => {
  try {
    let queryStr = `SELECT id, data_json FROM ${QUOTATIONS_TABLE} WHERE is_deleted = FALSE`;
    const params: any[] = [];
    if (searchTerm) {
      queryStr += ` AND data_json LIKE ?`;
      params.push(`%${searchTerm}%`);
    }
    queryStr += ` ORDER BY id DESC`;
    const rows = await query<any[]>(queryStr, params);
    return rows.map(row => ({
      id: row.id,
      ...(typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json)
    } as TrackingLink)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error fetching quotations from MySQL:", error);
    return [];
  }
};

export const getQuotationById = async (id: string): Promise<TrackingLink | undefined> => {
  if (!id) return undefined;
  try {
    const rows = await query<any[]>(`SELECT id, data_json FROM ${QUOTATIONS_TABLE} WHERE id = ? AND is_deleted = FALSE`, [id]);
    if (rows.length > 0) {
      return { id: rows[0].id, ...(typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json) } as TrackingLink;
    }
  } catch (error) {
    console.error("Error fetching quotation by ID from MySQL:", error);
  }
  return undefined;
};

export const addQuotation = async (quotationData: {
  companyName: string;
  address: string;
  phoneNumber: string;
  orderItems: OrderItem[];
  advancePaymentAmount?: number | null;
  specialClientDiscount?: number | null;
  shippingCharge?: number | null;
  advancePaymentMethod?: string | null;
  orderNotes?: string | null;
  initialStatusId: string;
  crmUserId: string;
  crmUserName: string;
  createdAt: string;
}): Promise<TrackingLink | null> => {
  const transactionTime = new Date().toISOString();

  try {
    let finalCreatedAt = quotationData.createdAt;
    try {
      finalCreatedAt = parseISO(quotationData.createdAt).toISOString();
    } catch (e) {
      finalCreatedAt = new Date().toISOString();
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const quotationPrefix = `Q${currentYear}${currentMonth}`;

    const allQuotations = await getQuotations();
    let newSequence = 1;
    if (allQuotations.length > 0) {
      const maxId = allQuotations
        .map(q => q.id)
        .filter(id => id.startsWith(quotationPrefix))
        .map(id => parseInt(id.substring(quotationPrefix.length), 10))
        .filter(num => !isNaN(num))
        .reduce((max, current) => (current > max ? current : max), 0);
      newSequence = maxId + 1;
    }
    const quotationId = `${quotationPrefix}${String(newSequence).padStart(2, '0')}`;

    const initialLogEntry: OrderLogEntry = {
      id: uuidv4(), timestamp: finalCreatedAt, status: quotationData.initialStatusId,
      changedByUserId: quotationData.crmUserId, changedByUserName: quotationData.crmUserName, notes: "Quotation created.",
    };

    const initialAdvancePayments: AdvancePaymentRecord[] = [];
    if (quotationData.advancePaymentAmount && quotationData.advancePaymentAmount > 0) {
      initialAdvancePayments.push({
        id: uuidv4(), amount: quotationData.advancePaymentAmount, date: finalCreatedAt,
        paymentMethod: quotationData.advancePaymentMethod || "Unknown", notes: "Initial advance payment.",
        recordedByUserId: quotationData.crmUserId, recordedByUserName: quotationData.crmUserName,
      });
    }

    const newQuotationData: Omit<TrackingLink, 'id'> = {
      companyName: quotationData.companyName, address: quotationData.address, phoneNumber: quotationData.phoneNumber,
      orderItems: quotationData.orderItems, specialClientDiscount: quotationData.specialClientDiscount ?? null,
      shippingCharge: quotationData.shippingCharge ?? null, orderNotes: quotationData.orderNotes || null,
      crmUserId: quotationData.crmUserId, crmUserName: quotationData.crmUserName,
      designerRepresentativeId: null, designerRepresentativeName: null,
      assigneeAvatarUrl: null,
      designerRepresentativeAvatarUrl: null,
      createdAt: finalCreatedAt, updatedAt: transactionTime,
      updatedByUserId: quotationData.crmUserId, updatedByUserName: quotationData.crmUserName,
      isPublic: false, currentStatus: quotationData.initialStatusId,
      statusHistory: [initialLogEntry], comments: [], viewCount: 0,
      advancePayments: initialAdvancePayments,
      packzyConsignmentId: null, packzyTrackingCode: null,
    };

    await query(`INSERT INTO ${QUOTATIONS_TABLE} (id, data_json) VALUES (?, ?)`, [quotationId, JSON.stringify(newQuotationData)]);

    return { id: quotationId, ...newQuotationData };
  } catch (error) {
    console.error("Error adding quotation to MySQL:", error);
    return null;
  }
};

export const updateQuotation = async (id: string, updates: Partial<TrackingLink>): Promise<boolean> => {
  try {
    const existingQuotation = await getQuotationById(id);
    if (!existingQuotation) throw new Error(`Quotation ${id} not found.`);

    const finalData = { ...existingQuotation, ...updates };
    const qid = finalData.id;
    delete (finalData as any).id;

    await query(`UPDATE ${QUOTATIONS_TABLE} SET data_json = ? WHERE id = ?`, [JSON.stringify(finalData), qid]);
    return true;
  } catch (error) {
    console.error(`Error updating quotation ${id} in MySQL:`, error);
    return false;
  }
};

export const deleteQuotation = async (quotationId: string, userId: string): Promise<boolean> => {
  try {
    const mysqlDeletedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await query(`UPDATE ${QUOTATIONS_TABLE} SET is_deleted = TRUE, deleted_at = ?, deleted_by_id = ? WHERE id = ?`, [mysqlDeletedAt, userId, quotationId]);
    return true;
  } catch (error) {
    console.error(`Error soft deleting quotation ${quotationId} from MySQL:`, error);
    return false;
  }
};

export const getDeletedQuotations = async (): Promise<TrackingLink[]> => {
  try {
    const rows = await query<any[]>(`
      SELECT q.id, q.data_json, q.deleted_at, q.deleted_by_id, u.name as deleted_by_name, u.avatar_url as deleted_by_avatar_url 
      FROM ${QUOTATIONS_TABLE} q
      LEFT JOIN users u ON q.deleted_by_id = u.id
      WHERE q.is_deleted = TRUE 
      ORDER BY q.deleted_at DESC
    `);
    return rows.map(row => ({
      id: row.id,
      ...(typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json),
      deletedAt: row.deleted_at,
      deletedById: row.deleted_by_id,
      deletedByName: row.deleted_by_name, // Using name from users table
      deletedByAvatarUrl: row.deleted_by_avatar_url,
    } as TrackingLink));
  } catch (error) {
    console.error("Error fetching deleted quotations from MySQL:", error);
    return [];
  }
};

export const restoreQuotation = async (quotationId: string): Promise<boolean> => {
  try {
    await query(`UPDATE ${QUOTATIONS_TABLE} SET is_deleted = FALSE, deleted_at = NULL WHERE id = ?`, [quotationId]);
    return true;
  } catch (error) {
    console.error(`Error restoring quotation ${quotationId} from MySQL:`, error);
    return false;
  }
};

export const permanentlyDeleteQuotation = async (quotationId: string): Promise<boolean> => {
  try {
    await query(`DELETE FROM ${QUOTATIONS_TABLE} WHERE id = ?`, [quotationId]);
    return true;
  } catch (error) {
    console.error(`Error permanently deleting quotation ${quotationId} from MySQL:`, error);
    return false;
  }
};
