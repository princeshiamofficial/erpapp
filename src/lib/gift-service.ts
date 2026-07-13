"use server";

import type { Gift, User } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { query } from './mysql';

const GIFTS_TABLE = 'client_gifts';

export const getGifts = async (): Promise<Gift[]> => {
  try {
    const rows = await query<any[]>(`SELECT id, data_json FROM ${GIFTS_TABLE}`);
    const gifts = rows.map(row => {
      const parsed = typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json;
      return {
        id: row.id,
        ...parsed
      } as Gift;
    });

    // Sort by createdAt DESC to show latest data on top
    return gifts.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Error fetching gifts from MySQL:", error);
    return [];
  }
};

export const getGiftsPaginated = async (
  page: number = 1,
  limit: number = 25,
  searchTerm?: string
): Promise<{ gifts: Gift[]; total: number }> => {
  try {
    const conditions: string[] = [];
    const params: any[] = [];

    if (searchTerm) {
      conditions.push('data_json LIKE ?');
      params.push(`%${searchTerm}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as total FROM ${GIFTS_TABLE} ${whereClause}`;
    const countResult = await query<any[]>(countQuery, params);
    const total = countResult[0]?.total || 0;

    const offset = Math.max(0, (page - 1) * limit);
    const dataQuery = `
      SELECT id, data_json 
      FROM ${GIFTS_TABLE} 
      ${whereClause} 
      ORDER BY id DESC 
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...params, Number(limit), Number(offset)];
    const rows = await query<any[]>(dataQuery, dataParams);

    const gifts = rows.map(row => {
      const parsed = typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json;
      return {
        id: row.id,
        ...parsed
      } as Gift;
    });

    gifts.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return { gifts, total };
  } catch (error) {
    console.error("Error fetching paginated gifts from MySQL:", error);
    return { gifts: [], total: 0 };
  }
};

export const getGiftById = async (id: string): Promise<Gift | null> => {
  if (!id) return null;
  try {
    const rows = await query<any[]>(`SELECT id, data_json FROM ${GIFTS_TABLE} WHERE id = ?`, [id]);
    if (rows.length > 0) {
      const parsed = typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json;
      return {
        id: rows[0].id,
        ...parsed
      } as Gift;
    }
  } catch (error) {
    console.error(`Error fetching gift by ID ${id} from MySQL:`, error);
  }
  return null;
};

export const addGift = async (giftData: Omit<Gift, 'id' | 'giftIdDisplay' | 'createdAt' | 'updatedAt' | 'giftItemName' | 'givenByUserId' | 'givenByUserName'> & { giftItemNames: string[] }, currentUser: User): Promise<Gift | null> => {
  try {
    const allGifts = await getGifts();
    const currentYear = new Date().getFullYear();
    const giftPrefix = `G${currentYear}0`;
    let maxId = 0;
    allGifts.forEach(gift => {
      if (gift.giftIdDisplay && gift.giftIdDisplay.startsWith(giftPrefix)) {
        const numPart = parseInt(gift.giftIdDisplay.substring(giftPrefix.length), 10);
        if (!isNaN(numPart) && numPart > maxId) {
          maxId = numPart;
        }
      }
    });
    const newSequence = maxId + 1;
    const giftIdDisplay = `${giftPrefix}${String(newSequence).padStart(2, '0')}`;

    const now = new Date().toISOString();
    const newGiftData: Gift = {
      ...(giftData as any),
      id: uuidv4(),
      giftIdDisplay,
      givenByUserId: currentUser.id,
      givenByUserName: currentUser.name,
      createdAt: now,
      updatedAt: now,
      giftItemName: giftData.giftItemNames.join(', '),
    };

    await query(`INSERT INTO ${GIFTS_TABLE} (id, data_json) VALUES (?, ?)`, [newGiftData.id, JSON.stringify(newGiftData)]);

    return newGiftData;
  } catch (error) {
    console.error("Error adding gift to MySQL:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateGift = async (id: string, updates: Partial<Omit<Gift, 'id' | 'createdAt'>>, currentUser: User): Promise<Gift | null> => {
  try {
    const existingGift = await getGiftById(id);
    if (!existingGift) throw new Error(`Gift with ID ${id} not found.`);

    const finalUpdates = { ...updates };
    if (updates.giftItemNames) {
      finalUpdates.giftItemName = updates.giftItemNames.join(', ');
    }

    const finalData = {
      ...existingGift,
      ...finalUpdates,
      updatedAt: new Date().toISOString(),
    };

    await query(`UPDATE ${GIFTS_TABLE} SET data_json = ? WHERE id = ?`, [JSON.stringify(finalData), id]);
    return finalData;
  } catch (error) {
    console.error(`Error updating gift ${id} in MySQL:`, error);
    return null;
  }
};

export const deleteGift = async (id: string): Promise<boolean> => {
  try {
    await query(`DELETE FROM ${GIFTS_TABLE} WHERE id = ?`, [id]);
    return true;
  } catch (error) {
    console.error(`Error deleting gift ${id} from MySQL:`, error);
    return false;
  }
};
