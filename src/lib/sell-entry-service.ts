"use server";

import type { SellEntry } from '@/types';
import { query } from './mysql';
import { v4 as uuidv4 } from 'uuid';
import { updateStockQuantity } from './stock-service';

const TABLE_NAME = 'sell_entries';

export const getSellEntries = async (): Promise<SellEntry[]> => {
    try {
        const rows = await query<any[]>(`SELECT id, data_json FROM ${TABLE_NAME} ORDER BY id DESC`);

        return rows.map(row => {
            const data = typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json;
            return {
                id: row.id,
                ...data
            } as SellEntry;
        });
    } catch (error) {
        console.error("Error fetching sell entries from MySQL:", error);
        return [];
    }
};

export const addSellEntry = async (
    items: { productId: string; productName: string; quantity: number }[],
    recordedByUserId: string,
    recordedByUserName: string,
    customCreatedAt?: string,
    status: 'Pending' | 'Approved' = 'Pending'
): Promise<SellEntry | null> => {
    if (!items || items.length === 0) {
        throw new Error("At least one product must be selected.");
    }

    try {
        const id = uuidv4();

        // Get the next entry ID
        const countRows = await query<any[]>(`SELECT COUNT(*) as count FROM ${TABLE_NAME}`);
        const count = countRows[0]?.count || 0;
        const entryId = `SE-${String(count + 1).padStart(3, '0')}`;

        // Calculate total quantity for display or legacy support
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

        // Use the first item for legacy fields if needed, or leave empty
        const firstItem = items[0];

        // Deduct stock if auto-approved
        if (status === 'Approved') {
            for (const item of items) {
                await updateStockQuantity(item.productId, -1 * (item.quantity || 0));
            }
        }

        const newEntry: SellEntry = {
            id,
            entryId,
            items: items,
            productId: firstItem.productId, // Legacy support
            productName: items.length > 1 ? `${items.length} Items` : firstItem.productName, // Legacy support
            quantity: totalQuantity, // Legacy support
            status: status,
            recordedByUserId,
            recordedByUserName,
            approvedByUserId: status === 'Approved' ? recordedByUserId : null,
            approvedByUserName: status === 'Approved' ? recordedByUserName : null,
            createdAt: customCreatedAt || new Date().toISOString(),
            approvedAt: status === 'Approved' ? (customCreatedAt || new Date().toISOString()) : null
        };

        await query(`INSERT INTO ${TABLE_NAME} (id, data_json) VALUES (?, ?)`, [id, JSON.stringify(newEntry)]);
        return newEntry;
    } catch (error) {
        console.error("Error adding sell entry to MySQL:", error);
        if (error instanceof Error) throw error;
        return null;
    }
};

export const approveSellEntry = async (
    id: string,
    approvedByUserId: string,
    approvedByUserName: string
): Promise<boolean> => {
    try {
        const rows = await query<any[]>(`SELECT data_json FROM ${TABLE_NAME} WHERE id = ?`, [id]);
        if (rows.length === 0) {
            throw new Error("Sell entry does not exist!");
        }

        const existingData = typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json;

        if (existingData.status === 'Approved') {
            throw new Error("Sell entry is already approved.");
        }

        // Deduct stock
        if (existingData.items && Array.isArray(existingData.items)) {
            for (const item of existingData.items) {
                await updateStockQuantity(item.productId, -1 * (item.quantity || 0));
            }
        } else {
            // Legacy
            if (existingData.productId) {
                await updateStockQuantity(existingData.productId, -1 * (existingData.quantity || 0));
            }
        }

        const updatedData = {
            ...existingData,
            status: 'Approved',
            approvedByUserId,
            approvedByUserName,
            approvedAt: new Date().toISOString()
        };

        await query(`UPDATE ${TABLE_NAME} SET data_json = ? WHERE id = ?`, [JSON.stringify(updatedData), id]);
        return true;
    } catch (error) {
        console.error("Error approving sell entry in MySQL:", error);
        if (error instanceof Error) throw error;
        return false;
    }
};

export const rejectSellEntry = async (id: string, rejectedByUserId: string, rejectedByUserName: string): Promise<boolean> => {
    try {
        const rows = await query<any[]>(`SELECT data_json FROM ${TABLE_NAME} WHERE id = ?`, [id]);
        if (rows.length === 0) {
            throw new Error("Sell entry does not exist!");
        }

        const existingData = typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json;

        const updatedData = {
            ...existingData,
            status: 'Rejected',
            approvedByUserId: rejectedByUserId,
            approvedByUserName: rejectedByUserName,
            approvedAt: new Date().toISOString()
        };

        await query(`UPDATE ${TABLE_NAME} SET data_json = ? WHERE id = ?`, [JSON.stringify(updatedData), id]);
        return true;
    } catch (error) {
        console.error("Error rejecting sell entry in MySQL:", error);
        if (error instanceof Error) throw error;
        return false;
    }
};

export const deleteSellEntry = async (id: string): Promise<boolean> => {
    try {
        await query(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, [id]);
        return true;
    } catch (error) {
        console.error("Error deleting sell entry from MySQL:", error);
        if (error instanceof Error) throw error;
        return false;
    }
};
