
"use server";

import type { PurchaseRequest } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { query } from './mysql';

const TABLE_NAME = 'purchase_requests';

export const getPurchaseRequests = async (): Promise<PurchaseRequest[]> => {
  try {
    const rows = await query<any[]>(`SELECT id, data_json FROM ${TABLE_NAME}`);
    const requests = rows.map(row => ({
      id: row.id,
      ...(typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json)
    } as PurchaseRequest));

    // Sort by human-readable ID descending as the primary sort key
    return requests.sort((a, b) => {
      const idA = a.requestId ? parseInt(a.requestId.split('-')[1] || '0', 10) : 0;
      const idB = b.requestId ? parseInt(b.requestId.split('-')[1] || '0', 10) : 0;
      if (idB !== idA) return idB - idA;
      // Fallback to creation date if IDs are the same or malformed
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Error fetching purchase requests from MySQL:", error);
    return [];
  }
};

export const getPurchaseRequestById = async (requestId: string): Promise<PurchaseRequest | null> => {
  if (!requestId) return null;
  try {
    const rows = await query<any[]>(`SELECT id, data_json FROM ${TABLE_NAME} WHERE id = ?`, [requestId]);
    if (rows.length === 0) return null;
    return {
      id: rows[0].id,
      ...(typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json)
    } as PurchaseRequest;
  } catch (error) {
    console.error(`Error fetching purchase request by ID ${requestId} from MySQL:`, error);
    return null;
  }
};

export const addPurchaseRequest = async (requestData: Omit<PurchaseRequest, 'id' | 'requestId' | 'createdAt' | 'updatedAt'>): Promise<PurchaseRequest | null> => {
  try {
    const allRequests = await getPurchaseRequests();
    let maxId = 0;
    allRequests.forEach(req => {
      if (req.requestId && req.requestId.startsWith('PR-')) {
        const numPart = parseInt(req.requestId.split('-')[1], 10);
        if (!isNaN(numPart) && numPart > maxId) {
          maxId = numPart;
        }
      }
    });

    const id = uuidv4();
    const newRequestId = `PR-${String(maxId + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const newRequestData: PurchaseRequest = {
      ...requestData,
      id,
      requestId: newRequestId,
      createdAt: now,
      updatedAt: now,
    } as PurchaseRequest;

    await query(`INSERT INTO ${TABLE_NAME} (id, data_json) VALUES (?, ?)`, [id, JSON.stringify(newRequestData)]);
    return newRequestData;
  } catch (error) {
    console.error("Error adding purchase request to MySQL:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updatePurchaseRequest = async (requestId: string, updates: Partial<Omit<PurchaseRequest, 'id'>>): Promise<boolean> => {
  try {
    const existingRequest = await getPurchaseRequestById(requestId);
    if (!existingRequest) {
      throw new Error("Purchase request not found.");
    }

    const finalUpdates = {
      ...existingRequest,
      ...updates,
      createdAt: existingRequest.createdAt, // Preserve original creation date
      updatedAt: new Date().toISOString()
    };

    await query(`UPDATE ${TABLE_NAME} SET data_json = ? WHERE id = ?`, [JSON.stringify(finalUpdates), requestId]);
    return true;
  } catch (error) {
    console.error(`Error updating purchase request ${requestId} in MySQL:`, error);
    return false;
  }
};

export const deletePurchaseRequest = async (requestId: string): Promise<boolean> => {
  try {
    await query(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, [requestId]);
    return true;
  } catch (error) {
    console.error(`Error deleting purchase request ${requestId} from MySQL:`, error);
    return false;
  }
};
