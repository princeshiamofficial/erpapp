
"use server";

import type { ServiceModelItem } from '@/types';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

const STOCK_COLLECTION = 'stock';

export const getStockItems = async (): Promise<ServiceModelItem[]> => {
  try {
    await ensureCollectionExistsV3(STOCK_COLLECTION);
    const response = await fetchFromApiV3(`collections/${STOCK_COLLECTION}/documents?limit=9999&orderBy=name&direction=asc`);
    if (response && Array.isArray(response.documents)) {
      return response.documents.map((doc: { id: string, data: any }) => ({
        id: doc.id,
        ...doc.data
      } as ServiceModelItem));
    }
    return [];
  } catch (error) {
    console.error("Error fetching stock items via API v3:", error);
    return [];
  }
};

export const addStockItem = async (name: string, buyingPrice?: number, sellingPrice?: number, imageUrl?: string | null, isReadyMade?: boolean, stockCount?: number): Promise<ServiceModelItem | null> => {
  if (!name.trim()) {
    throw new Error("Item name cannot be empty.");
  }
  const numBuyingPrice = buyingPrice === undefined || isNaN(Number(buyingPrice)) ? 0 : Number(buyingPrice);
  const numSellingPrice = sellingPrice === undefined || isNaN(Number(sellingPrice)) ? 0 : Number(sellingPrice);
  const finalStockCount = (isReadyMade && stockCount !== undefined) ? stockCount : 0;

  try {
    await ensureCollectionExistsV3(STOCK_COLLECTION);
    const newItemData: Omit<ServiceModelItem, 'id' | 'totalSold'> = { 
      name: name.trim(), 
      buyingPrice: numBuyingPrice, 
      sellingPrice: numSellingPrice, 
      imageUrl: imageUrl || null,
      isReadyMade: isReadyMade || false,
      stockCount: finalStockCount,
    };

    const newDoc = await fetchFromApiV3(`collections/${STOCK_COLLECTION}/documents`, {
        method: 'POST',
        body: JSON.stringify({ data: newItemData }),
    });

    return {
        id: newDoc.id,
        ...newDoc.data
    } as ServiceModelItem;
  } catch (error) {
    console.error("Error adding stock item via API v3:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateStockItem = async (id: string, name: string, buyingPrice?: number, sellingPrice?: number, imageUrl?: string | null, isReadyMade?: boolean, stockCountChange?: number): Promise<boolean> => {
  if (!name.trim()) {
    throw new Error("Item name cannot be empty.");
  }
  
  try {
    const existingDoc = await fetchFromApiV3(`collections/${STOCK_COLLECTION}/documents/${id}`);
    if (!existingDoc || !existingDoc.data) {
        throw new Error("Document does not exist!");
    }

    const numBuyingPrice = buyingPrice === undefined || isNaN(Number(buyingPrice)) ? 0 : Number(buyingPrice);
    const numSellingPrice = sellingPrice === undefined || isNaN(Number(sellingPrice)) ? 0 : Number(sellingPrice);

    const currentStock = existingDoc.data.stockCount || 0;
    const stockToAdd = (isReadyMade && stockCountChange !== undefined) ? stockCountChange : 0;
    const finalStockCount = currentStock + stockToAdd;
    
    const updates = {
      name: name.trim(),
      buyingPrice: numBuyingPrice,
      sellingPrice: numSellingPrice,
      imageUrl: imageUrl === undefined ? existingDoc.data.imageUrl : imageUrl,
      isReadyMade: isReadyMade === undefined ? existingDoc.data.isReadyMade : isReadyMade,
      stockCount: finalStockCount,
    };
    
    const finalData = { ...existingDoc.data, ...updates };

    await fetchFromApiV3(`collections/${STOCK_COLLECTION}/documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ data: finalData })
    });
    return true;
  } catch (error) {
    console.error("Error updating stock item via API v3:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};

export const deleteStockItem = async (id: string): Promise<boolean> => {
  try {
    await fetchFromApiV3(`collections/${STOCK_COLLECTION}/documents/${id}`, {
        method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error("Error deleting stock item via API v3:", error);
    if (error instanceof Error) throw error; 
    return false;
  }
};
