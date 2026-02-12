"use server";

import type { TrackingLink, OrderLogEntry, OrderItem, AdvancePaymentRecord } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { query } from './mysql';
import { parseISO } from 'date-fns';

const QUOTATIONS_TABLE = 'quotations';

export const getQuotations = async (): Promise<TrackingLink[]> => {
  try {
    const rows = await query<any[]>(`SELECT id, data_json FROM ${QUOTATIONS_TABLE} ORDER BY id DESC`);
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
    const rows = await query<any[]>(`SELECT id, data_json FROM ${QUOTATIONS_TABLE} WHERE id = ?`, [id]);
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

    const quotationPrefix = 'QTN-';
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
    const quotationId = `${quotationPrefix}${String(newSequence).padStart(4, '0')}`;

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

export const deleteQuotation = async (quotationId: string): Promise<boolean> => {
  try {
    await query(`DELETE FROM ${QUOTATIONS_TABLE} WHERE id = ?`, [quotationId]);
    return true;
  } catch (error) {
    console.error(`Error deleting quotation ${quotationId} from MySQL:`, error);
    return false;
  }
};
