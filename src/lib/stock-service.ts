
"use server";

import type { ServiceModelItem } from '@/types';
import { query } from './mysql';
import { v4 as uuidv4 } from 'uuid';
import { getOrders } from './order-service';
import { logStockActivity } from './stock-activity-service';

const TABLE_NAME = 'stock';

export const getStockItems = async (): Promise<ServiceModelItem[]> => {
  try {
    const [rows, allOrders, sellEntriesRows] = await Promise.all([
      query<any[]>(`SELECT id, data_json FROM ${TABLE_NAME} ORDER BY id ASC`),
      getOrders(),
      query<any[]>(`SELECT data_json FROM sell_entries`)
    ]);

    const items = rows.map(row => {
      const data = typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json;
      return {
        id: row.id,
        ...data
      } as ServiceModelItem;
    });

    // Calculate sold counts from orders
    const soldCounts = new Map<string, number>();
    allOrders.forEach(order => {
      order.orderItems.forEach(item => {
        soldCounts.set(item.model, (soldCounts.get(item.model) || 0) + item.quantity);
      });
    });

    // Create a map of product ID to product Name for lookup
    const productIdToName = new Map<string, string>();
    items.forEach(item => {
      productIdToName.set(item.id, item.name);
    });

    // Add approved sell entries to sold counts
    sellEntriesRows.forEach(row => {
      const data = typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json;
      if (data.status === 'Approved') {
        if (data.items && Array.isArray(data.items)) {
          // Handle new multi-item entries
          data.items.forEach((item: any) => {
            const prodName = productIdToName.get(item.productId) || item.productName; // Fallback to recorded name
            if (prodName) {
              soldCounts.set(prodName, (soldCounts.get(prodName) || 0) + (item.quantity || 0));
            }
          });
        } else {
          // Legacy single-item entries
          const prodName = data.productName;
          if (prodName) {
            soldCounts.set(prodName, (soldCounts.get(prodName) || 0) + (data.quantity || 0));
          }
        }
      }
    });

    // Add totalSold to each item and sort by name
    return items.map(item => ({
      ...item,
      totalSold: soldCounts.get(item.name) || 0
    })).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error fetching stock items from MySQL:", error);
    return [];
  }
};

export const addStockItem = async (name: string, buyingPrice?: number, sellingPrice?: number, imageUrl?: string | null, isReadyMade?: boolean, stockCount?: number, userId?: string, userName?: string): Promise<ServiceModelItem | null> => {
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
    
    if (userId && userName) {
      await logStockActivity('ADD', name.trim(), userName, userId, `Added new product: ${name.trim()}`, finalStockCount, id);
    }

    return newItemData;
  } catch (error) {
    console.error("Error adding stock item to MySQL:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateStockItem = async (id: string, name: string, buyingPrice?: number, sellingPrice?: number, imageUrl?: string | null, isReadyMade?: boolean, stockCountChange?: number, userId?: string, userName?: string): Promise<boolean> => {
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

    if (userId && userName && stockCountChange !== 0 && stockCountChange !== undefined) {
      const type = stockCountChange > 0 ? 'RESTOCK' : 'UPDATE';
      await logStockActivity(type, name.trim(), userName, userId, `${type === 'RESTOCK' ? 'Restocked' : 'Updated'} ${name.trim()}: ${stockCountChange > 0 ? '+' : ''}${stockCountChange} units`, stockCountChange, id);
    } else if (userId && userName) {
      await logStockActivity('UPDATE', name.trim(), userName, userId, `Updated details for ${name.trim()}`, 0, id);
    }

    return true;
  } catch (error) {
    console.error("Error updating stock item in MySQL:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};

export const deleteStockItem = async (id: string, userId?: string, userName?: string): Promise<boolean> => {
    try {
        const rows = await query<any[]>(`SELECT data_json FROM ${TABLE_NAME} WHERE id = ?`, [id]);
        let productName = 'Unknown Product';
        if (rows.length > 0) {
          const data = typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json;
          productName = data.name;
        }

        await query(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, [id]);

        if (userId && userName) {
          await logStockActivity('DELETE', productName, userName, userId, `Deleted product: ${productName}`, 0, id);
        }

        return true;
  } catch (error) {
    console.error("Error deleting stock item from MySQL:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};

export const updateStockQuantity = async (id: string, change: number): Promise<boolean> => {
  try {
    const rows = await query<any[]>(`SELECT data_json FROM ${TABLE_NAME} WHERE id = ?`, [id]);
    if (rows.length === 0) return false;

    const data = typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json;
    const currentStock = data.stockCount || 0;
    const newStock = currentStock + change;

    const updatedData = { ...data, stockCount: newStock };

    await query(`UPDATE ${TABLE_NAME} SET data_json = ? WHERE id = ?`, [JSON.stringify(updatedData), id]);
    return true;
  } catch (error) {
    console.error("Error updating stock quantity:", error);
    return false;
  }
};
