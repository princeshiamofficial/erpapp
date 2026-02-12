
"use server";

import { query } from './mysql';
import type { SoldHistoryEntry } from '@/types';
import { getStockItems, updateStockItem } from './stock-service';
import { v4 as uuidv4 } from 'uuid';

const TABLE_NAME = 'sold_history';

export const getSoldHistory = async (): Promise<SoldHistoryEntry[]> => {
    try {
        const rows = await query<any[]>(`SELECT id, data_json FROM ${TABLE_NAME} ORDER BY id DESC`);
        const history = rows.map(row => ({
            id: row.id,
            ...(typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json)
        } as SoldHistoryEntry));

        return history.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
    } catch (error) {
        console.error("Error fetching sold history from MySQL:", error);
        return [];
    }
};

export const addSoldHistoryEntry = async (entryData: Omit<SoldHistoryEntry, 'id'>): Promise<SoldHistoryEntry | null> => {
    try {
        const id = uuidv4();
        const newEntry: SoldHistoryEntry = { id, ...entryData } as SoldHistoryEntry;

        await query(`INSERT INTO ${TABLE_NAME} (id, data_json) VALUES (?, ?)`, [id, JSON.stringify(newEntry)]);

        // --- STOCK DEDUCTION LOGIC ---
        const allStockItems = await getStockItems();
        const productSold = allStockItems.find(item => item.name === newEntry.productName);

        if (productSold) {
            const stockChange = -newEntry.quantity;
            await updateStockItem(
                productSold.id,
                productSold.name,
                productSold.buyingPrice,
                productSold.sellingPrice,
                productSold.imageUrl,
                productSold.isReadyMade,
                stockChange
            );
        } else {
            console.warn(`[addSoldHistoryEntry] Product "${newEntry.productName}" not found in stock table. Stock not deducted.`);
        }
        // --- END STOCK DEDUCTION LOGIC ---

        return newEntry;
    } catch (error) {
        console.error("Error adding sold history entry to MySQL:", error);
        return null;
    }
};

export const updateSoldHistoryEntry = async (id: string, updates: Partial<SoldHistoryEntry>): Promise<boolean> => {
    try {
        const rows = await query<any[]>(`SELECT data_json FROM ${TABLE_NAME} WHERE id = ?`, [id]);
        if (rows.length === 0) return false;

        const existingData = typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json;
        const finalData = { ...existingData, ...updates };

        await query(`UPDATE ${TABLE_NAME} SET data_json = ? WHERE id = ?`, [JSON.stringify(finalData), id]);
        return true;
    } catch (error) {
        console.error(`Error updating sold history entry ${id} in MySQL:`, error);
        return false;
    }
};

export const deleteSoldHistoryEntry = async (id: string): Promise<boolean> => {
    try {
        await query(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, [id]);
        return true;
    } catch (error) {
        console.error(`Error deleting sold history entry ${id} from MySQL:`, error);
        return false;
    }
};
