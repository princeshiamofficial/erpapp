
"use server";

import type { DistrictDataEntry } from '@/types';
import { query } from './mysql';

const TABLE_NAME = 'district_data';

export const getManualDistrictData = async (startDate?: string, endDate?: string, role?: string, userId?: string, page?: number, limit?: number, searchTerm?: string): Promise<DistrictDataEntry[]> => {
  try {
    const conditions: string[] = [];
    const params: any[] = [];
    if (startDate) {
      conditions.push(`JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.orderDate')) >= ?`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.orderDate')) <= ?`);
      params.push(endDate);
    }
    if (userId && userId !== 'all' && role === 'CRM') {
      conditions.push(`JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.crmUserId')) = ?`);
      params.push(userId);
    }
    if (searchTerm) {
      conditions.push(`data_json LIKE ?`);
      params.push(`%${searchTerm}%`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    let limitSql = '';
    if (page !== undefined && limit !== undefined) {
      limitSql = 'LIMIT ? OFFSET ?';
      params.push(limit, (page - 1) * limit);
    }

    const rows = await query<any[]>(`SELECT id, data_json FROM ${TABLE_NAME} ${whereClause} ORDER BY JSON_UNQUOTE(JSON_EXTRACT(data_json, '$.orderDate')) DESC ${limitSql}`, params);
    return rows.map(row => ({
      id: row.id,
      ...(typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json)
    } as DistrictDataEntry));
  } catch (error) {
    console.error("Error fetching manual district data from MySQL:", error);
    return [];
  }
};

export const addManualDistrictData = async (data: Omit<DistrictDataEntry, 'id'>): Promise<DistrictDataEntry | null> => {
  try {
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    const dataWithId = { ...data, id };
    await query(`INSERT INTO ${TABLE_NAME} (id, data_json) VALUES (?, ?)`, [id, JSON.stringify(dataWithId)]);
    return dataWithId as DistrictDataEntry;
  } catch (error) {
    console.error("Error adding manual district data to MySQL:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};
