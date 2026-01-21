
"use server";

import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import type { SoldHistoryEntry, ServiceModelItem } from '@/types'; 
import { getStockItems, updateStockItem } from './stock-service'; 

const COLLECTION_NAME = 'soldhistory';

export const getSoldHistory = async (): Promise<SoldHistoryEntry[]> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=4444&orderBy=saleDate&direction=desc`);
    if (response && Array.isArray(response.documents)) {
      return response.documents.map((doc: { id: string, data: any }) => ({
        id: doc.id,
        ...doc.data
      } as SoldHistoryEntry));
    }
    return [];
  } catch (error) {
    console.error("Error fetching sold history via API v3:", error);
    return [];
  }
};

export const addSoldHistoryEntry = async (entryData: Omit<SoldHistoryEntry, 'id'>): Promise<SoldHistoryEntry | null> => {
    try {
        await ensureCollectionExistsV3(COLLECTION_NAME);
        const payload = { data: entryData };
        const newDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        const newEntry = { id: newDoc.id, ...newDoc.data } as SoldHistoryEntry;

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
            console.warn(`[addSoldHistoryEntry] Product "${newEntry.productName}" not found in stock collection. Stock not deducted.`);
        }
        // --- END STOCK DEDUCTION LOGIC ---

        return newEntry;
    } catch (error) {
        console.error("Error adding sold history entry via API v3:", error);
        return null;
    }
};

export const updateSoldHistoryEntry = async (id: string, updates: Partial<SoldHistoryEntry>): Promise<boolean> => {
    try {
        const existingDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`);
        const finalData = { ...existingDoc.data, ...updates };
        await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ data: finalData })
        });
        return true;
    } catch (error) {
        console.error(`Error updating sold history entry ${id} via API v3:`, error);
        return false;
    }
};

export const deleteSoldHistoryEntry = async (id: string): Promise<boolean> => {
    try {
        await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${id}`, {
            method: 'DELETE'
        });
        return true;
    } catch (error) {
        console.error(`Error deleting sold history entry ${id} via API v3:`, error);
        return false;
    }
};
