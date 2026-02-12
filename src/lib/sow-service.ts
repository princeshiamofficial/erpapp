
"use server";

import { query } from './mysql';
import type { SowDataEntry } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const TABLE_NAME = 'sow_data';

export const getSowEntries = async (): Promise<SowDataEntry[]> => {
  try {
    const rows = await query<any[]>(`SELECT id, data_json FROM ${TABLE_NAME} ORDER BY id DESC`);
    return rows.map(row => ({
      id: row.id,
      ...(typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json)
    } as SowDataEntry)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error fetching SOW entries from MySQL:", error);
    return [];
  }
};

export const addSowEntry = async (data: Omit<SowDataEntry, 'id'>): Promise<SowDataEntry | null> => {
  try {
    const id = uuidv4();
    const dataWithId: SowDataEntry = { ...data, id } as SowDataEntry;
    await query(`INSERT INTO ${TABLE_NAME} (id, data_json) VALUES (?, ?)`, [id, JSON.stringify(dataWithId)]);
    return dataWithId;
  } catch (error) {
    console.error("Error adding SOW entry to MySQL:", error);
    return null;
  }
};
