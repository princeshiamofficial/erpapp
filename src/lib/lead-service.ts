
"use server";

import type { Lead, LeadStatusType } from '@/types';
import { query } from './mysql';
import { v4 as uuidv4 } from 'uuid';

const LEADS_TABLE = 'leads';

export const getLeads = async (): Promise<Lead[]> => {
  try {
    const rows = await query<any[]>(`SELECT id, data_json FROM ${LEADS_TABLE} ORDER BY id DESC`);
    return rows.map(row => ({
      id: row.id,
      ...(typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json)
    } as Lead)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error(`Error fetching leads from MySQL:`, error);
    return [];
  }
};

export const getLeadById = async (leadId: string): Promise<Lead | null> => {
  if (!leadId) return null;
  try {
    const rows = await query<any[]>(`SELECT id, data_json FROM ${LEADS_TABLE} WHERE id = ?`, [leadId]);
    if (rows.length > 0) {
      return { id: rows[0].id, ...(typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json) } as Lead;
    }
  } catch (error) {
    console.error(`Error fetching lead ${leadId} from MySQL:`, error);
  }
  return null;
};

export const getLeadByPhone = async (phone: string): Promise<Lead | null> => {
  if (!phone) return null;
  try {
    const rows = await query<any[]>(`SELECT id, data_json FROM ${LEADS_TABLE} WHERE phone = ?`, [phone]);
    if (rows.length > 0) {
      return { id: rows[0].id, ...(typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json) } as Lead;
    }
  } catch (error) {
    console.error(`Error fetching lead by phone ${phone} from MySQL:`, error);
  }
  return null;
};

export const addLead = async (leadData: Omit<Lead, 'id'>): Promise<Lead | null> => {
  try {
    const id = uuidv4();
    const dataWithStatus = {
      ...leadData,
      status: 'New Lead' as LeadStatusType,
      customerType: leadData.customerType || null,
    };

    await query(`INSERT INTO ${LEADS_TABLE} (id, business_name, contact_name, phone, status, crm_id, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, dataWithStatus.businessName || null, dataWithStatus.contactName || null, dataWithStatus.phone || null, dataWithStatus.status || null, dataWithStatus.crmId || null, JSON.stringify(dataWithStatus)]);

    return { id, ...dataWithStatus } as Lead;
  } catch (error) {
    console.error("Error adding lead to MySQL:", error);
    return null;
  }
};

export const updateLead = async (leadId: string, updates: Partial<Omit<Lead, 'id'>>): Promise<boolean> => {
  try {
    const existingLead = await getLeadById(leadId);
    if (!existingLead) throw new Error("Lead to update not found.");

    const finalData = { ...existingLead, ...updates };
    const id = finalData.id;
    delete (finalData as any).id;

    await query(`UPDATE ${LEADS_TABLE} SET business_name = ?, contact_name = ?, phone = ?, status = ?, crm_id = ?, data_json = ? WHERE id = ?`,
      [finalData.businessName || null, finalData.contactName || null, finalData.phone || null, finalData.status || null, finalData.crmId || null, JSON.stringify(finalData), id]);

    return true;
  } catch (error) {
    console.error(`Error updating lead ${leadId} in MySQL:`, error);
    return false;
  }
};

export const deleteLead = async (leadId: string): Promise<boolean> => {
  try {
    await query(`DELETE FROM ${LEADS_TABLE} WHERE id = ?`, [leadId]);
    return true;
  } catch (error) {
    console.error(`Error deleting lead ${leadId} from MySQL:`, error);
    return false;
  }
};
