
"use server";

import type { ServiceModelItem } from '@/types';
import { query } from './mysql';
import { v4 as uuidv4 } from 'uuid';

const TABLE_NAME = 'stock';

export const getStockItems = async (): Promise<ServiceModelItem[]> => {
  try {
    const rows = await query<any[]>(`SELECT id, data_json FROM ${TABLE_NAME} ORDER BY id ASC`);
    return rows.map(row => {
      const data = typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json;
      return {
        id: row.id,
        ...data
      } as ServiceModelItem;
    }).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error fetching stock items from MySQL:", error);
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
    const id = uuidv4();
    const newItemData: ServiceModelItem = {
      id,
      name: name.trim(),
      buyingPrice: numBuyingPrice,
      sellingPrice: numSellingPrice,
      imageUrl: imageUrl || null,
      isReadyMade: isReadyMade || false,
      stockCount: finalStockCount,
      totalSold: 0
    } as ServiceModelItem;

    await query(`INSERT INTO ${TABLE_NAME} (id, data_json) VALUES (?, ?)`, [id, JSON.stringify(newItemData)]);
    return newItemData;
  } catch (error) {
    console.error("Error adding stock item to MySQL:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateStockItem = async (id: string, name: string, buyingPrice?: number, sellingPrice?: number, imageUrl?: string | null, isReadyMade?: boolean, stockCountChange?: number): Promise<boolean> => {
  if (!name.trim()) {
    throw new Error("Item name cannot be empty.");
  }

  try {
    const rows = await query<any[]>(`SELECT data_json FROM ${TABLE_NAME} WHERE id = ?`, [id]);
    if (rows.length === 0) {
      throw new Error("Document does not exist!");
    }

    const existingData = typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json;
    const numBuyingPrice = buyingPrice === undefined || isNaN(Number(buyingPrice)) ? 0 : Number(buyingPrice);
    const numSellingPrice = sellingPrice === undefined || isNaN(Number(sellingPrice)) ? 0 : Number(sellingPrice);

    const currentStock = existingData.stockCount || 0;
    const stockToAdd = (isReadyMade && stockCountChange !== undefined) ? stockCountChange : 0;
    const finalStockCount = currentStock + stockToAdd;

    const updates = {
      name: name.trim(),
      buyingPrice: numBuyingPrice,
      sellingPrice: numSellingPrice,
      imageUrl: imageUrl === undefined ? existingData.imageUrl : imageUrl,
      isReadyMade: isReadyMade === undefined ? existingData.isReadyMade : isReadyMade,
      stockCount: finalStockCount,
    };

    const finalData = { ...existingData, ...updates };

    await query(`UPDATE ${TABLE_NAME} SET data_json = ? WHERE id = ?`, [JSON.stringify(finalData), id]);
    return true;
  } catch (error) {
    console.error("Error updating stock item in MySQL:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};

export const deleteStockItem = async (id: string): Promise<boolean> => {
  try {
    await query(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, [id]);
    return true;
  } catch (error) {
    console.error("Error deleting stock item from MySQL:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};
