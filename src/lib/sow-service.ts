
"use server";

import { query } from './mysql';
import type { SowDataEntry } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const TABLE_NAME = 'sow_data';

export const getSowEntries = async (startDate?: string, endDate?: string, role?: string, userId?: string, searchTerm?: string): Promise<SowDataEntry[]> => {
  try {
    const conditions: string[] = [];
    const params: any[] = [];
    if (startDate) {
      conditions.push(`JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.createdAt')) >= ?`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.createdAt')) <= ?`);
      params.push(endDate);
    }
    if (userId && userId !== 'all' && (role === 'CRM' || role === 'DESIGNER_REPRESENTATIVE')) {
      conditions.push(`JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.createdByUserId')) = ?`);
      params.push(userId);
    }
    if (searchTerm) {
      conditions.push(`data_json LIKE ?`);
      params.push(`%${searchTerm}%`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query<any[]>(`SELECT id, data_json FROM ${TABLE_NAME} ${whereClause} ORDER BY id DESC`, params);
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
