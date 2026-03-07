
"use server";

import type { FollowUp } from '@/types';
import { query } from './mysql';
import { v4 as uuidv4 } from 'uuid';

const FOLLOWUPS_TABLE = 'follow_ups';

export const getFollowUps = async (): Promise<FollowUp[]> => {
    try {
        const rows = await query<any[]>(`SELECT id, data_json FROM ${FOLLOWUPS_TABLE} ORDER BY id DESC`);
        return rows.map(row => ({
            id: row.id,
            ...(typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json)
        } as FollowUp)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
        console.error(`Error fetching follow-ups from MySQL:`, error);
        return [];
    }
};

export const getFollowUpById = async (id: string): Promise<FollowUp | null> => {
    if (!id) return null;
    try {
        const rows = await query<any[]>(`SELECT id, data_json FROM ${FOLLOWUPS_TABLE} WHERE id = ?`, [id]);
        if (rows.length > 0) {
            return { id: rows[0].id, ...(typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json) } as FollowUp;
        }
    } catch (error) {
        console.error(`Error fetching follow-up ${id} from MySQL:`, error);
    }
    return null;
};

export const addFollowUp = async (data: Omit<FollowUp, 'id'>): Promise<FollowUp | null> => {
    try {
        const id = uuidv4();
        const completeData: FollowUp = {
            ...data,
            id,
            status: data.status || 'New Lead',
            updatedAt: new Date().toISOString()
        } as any;

        // Ensure we have correct dates for the JSON blob
        const jsonData = {
            ...completeData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await query(`INSERT INTO ${FOLLOWUPS_TABLE} (id, lead_id, business_name, contact_name, phone, status, crm_id, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                jsonData.leadId || null,
                jsonData.businessName || null,
                jsonData.contactName || null,
                jsonData.phone || null,
                jsonData.status || null,
                jsonData.crmId || null,
                JSON.stringify(jsonData)
            ]);

        return { ...jsonData, id };
    } catch (error) {
        console.error("Error adding follow-up to MySQL:", error);
        return null;
    }
};

export const updateFollowUp = async (id: string, updates: Partial<Omit<FollowUp, 'id'>>): Promise<boolean> => {
    try {
        const existing = await getFollowUpById(id);
        if (!existing) throw new Error("Follow-up to update not found.");

        const updatedData = {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString()
        } as FollowUp;

        const recordId = updatedData.id;
        const { id: _, ...dataForStorage } = updatedData;

        await query(`UPDATE ${FOLLOWUPS_TABLE} SET business_name = ?, contact_name = ?, phone = ?, status = ?, crm_id = ?, data_json = ? WHERE id = ?`,
            [
                updatedData.businessName || null,
                updatedData.contactName || null,
                updatedData.phone || null,
                updatedData.status || null,
                updatedData.crmId || null,
                JSON.stringify(dataForStorage),
                recordId
            ]);

        return true;
    } catch (error) {
        console.error(`Error updating follow-up ${id} in MySQL:`, error);
        return false;
    }
};

export const deleteFollowUp = async (id: string): Promise<boolean> => {
    try {
        await query(`DELETE FROM ${FOLLOWUPS_TABLE} WHERE id = ?`, [id]);
        return true;
    } catch (error) {
        console.error(`Error deleting follow-up ${id} from MySQL:`, error);
        return false;
    }
};
