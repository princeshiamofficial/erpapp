
"use server";

import type { DistrictDataEntry } from '@/types';
import { query } from './mysql';

const TABLE_NAME = 'district_data';

export const getManualDistrictData = async (): Promise<DistrictDataEntry[]> => {
  try {
    const rows = await query<any[]>(`SELECT id, data_json FROM ${TABLE_NAME}`);
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
