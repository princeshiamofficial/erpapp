
"use server";

import { query } from './mysql';
import type { UserRole, FollowUpStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getIO } from './socket-io';

const FOLLOW_UP_STATUSES_TABLE = 'follow_up_statuses';

const defaultFollowUpStatuses: Array<Omit<FollowUpStatus, 'xid' | 'isVisible' | 'isSystemStatus'>> = [
    { id: 'new-lead', name: 'New Lead', color: '#2563eb', displayOrder: 1, icon: 'UserPlus', headerBgClass: 'bg-blue-600', allowedRoles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'] },
    { id: 'contacted', name: 'Contacted', color: '#9333ea', displayOrder: 2, icon: 'Phone', headerBgClass: 'bg-purple-600', allowedRoles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'] },
    { id: 'qualified', name: 'Qualified', color: '#0891b2', displayOrder: 3, icon: 'CheckCircle2', headerBgClass: 'bg-cyan-600', allowedRoles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'] },
    { id: 'proposal-sent', name: 'Proposal Sent', color: '#ea580c', displayOrder: 4, icon: 'MessageSquare', headerBgClass: 'bg-orange-600', allowedRoles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'] },
    { id: 'negotiation', name: 'Negotiation', color: '#4f46e5', displayOrder: 5, icon: 'TrendingUp', headerBgClass: 'bg-indigo-600', allowedRoles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'] },
    { id: 'won', name: 'Won', color: '#059669', displayOrder: 6, icon: 'Target', headerBgClass: 'bg-emerald-600', allowedRoles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'] },
    { id: 'lost', name: 'Lost', color: '#e11d48', displayOrder: 7, icon: 'XCircle', headerBgClass: 'bg-rose-600', allowedRoles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'] },
];

const mapRowToStatus = (row: any): FollowUpStatus => ({
    id: row.id,
    name: row.name,
    color: row.color,
    isSystemStatus: Boolean(row.is_system_status),
    isVisible: Boolean(row.is_visible),
    allowedRoles: typeof row.allowed_roles === 'string' ? JSON.parse(row.allowed_roles) : (row.allowed_roles || []),
    xid: row.xid || row.id,
    displayOrder: row.display_order || 0,
    icon: row.icon || undefined,
    headerBgClass: row.header_bg_class || undefined,
});

export const initFollowUpStatusesTable = async () => {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS ${FOLLOW_UP_STATUSES_TABLE} (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                color VARCHAR(255) NOT NULL,
                is_system_status BOOLEAN DEFAULT FALSE,
                is_visible BOOLEAN DEFAULT TRUE,
                allowed_roles JSON,
                xid VARCHAR(255),
                display_order INT DEFAULT 0,
                icon VARCHAR(255),
                header_bg_class VARCHAR(255)
            )
        `);
    } catch (error) {
        console.error("Error creating follow_up_statuses table:", error);
    }
};

export const seedFollowUpStatuses = async (): Promise<FollowUpStatus[]> => {
    await initFollowUpStatusesTable();
    const createdStatuses: FollowUpStatus[] = [];

    for (const statusData of defaultFollowUpStatuses) {
        try {
            await query(
                `INSERT INTO ${FOLLOW_UP_STATUSES_TABLE} (id, name, color, is_system_status, is_visible, allowed_roles, xid, display_order, icon, header_bg_class) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), color=VALUES(color), display_order=VALUES(display_order), icon=VALUES(icon), header_bg_class=VALUES(header_bg_class)`,
                [
                    statusData.id, 
                    statusData.name, 
                    statusData.color, 
                    true, 
                    true, 
                    JSON.stringify(['SYSTEM_ADMIN', 'ADMIN', 'CRM']), 
                    statusData.id, 
                    statusData.displayOrder,
                    statusData.icon || null,
                    statusData.headerBgClass || null
                ]
            );
            createdStatuses.push({
                ...statusData,
                isSystemStatus: true,
                isVisible: true,
                allowedRoles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'],
                xid: statusData.id,
            });
        } catch (error) {
            console.error(`Failed to seed follow-up status: ${statusData.id}`, error);
        }
    }
    return createdStatuses;
};

export const getFollowUpStatuses = async (): Promise<FollowUpStatus[]> => {
    try {
        await initFollowUpStatusesTable();
        const results = await query<any[]>(`SELECT * FROM ${FOLLOW_UP_STATUSES_TABLE} ORDER BY display_order ASC`);

        if (results.length === 0) {
            return await seedFollowUpStatuses();
        }

        return results.map(mapRowToStatus);
    } catch (error) {
        console.error("Error fetching follow-up statuses from MySQL:", error);
        return [];
    }
};

export const addFollowUpStatus = async (data: Omit<FollowUpStatus, 'id' | 'isSystemStatus' | 'xid'>): Promise<FollowUpStatus | null> => {
    try {
        const id = data.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || uuidv4();
        
        await query(
            `INSERT INTO ${FOLLOW_UP_STATUSES_TABLE} (id, name, color, is_system_status, is_visible, allowed_roles, xid, display_order, icon, header_bg_class) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, 
                data.name, 
                data.color, 
                false, 
                data.isVisible, 
                JSON.stringify(data.allowedRoles || []), 
                id, 
                data.displayOrder || 0,
                data.icon || null,
                data.headerBgClass || 'bg-slate-600'
            ]
        );

        const newStatus = {
            ...data,
            id,
            xid: id,
            isSystemStatus: false,
        };

        const io = getIO();
        if (io) io.emit("follow-up-updated", { type: 'status-create', id });

        return newStatus;
    } catch (error) {
        console.error("Error adding follow-up status:", error);
        return null;
    }
};

export const updateFollowUpStatus = async (id: string, updates: Partial<FollowUpStatus>): Promise<boolean> => {
    try {
        const fields: string[] = [];
        const params: any[] = [];

        if (updates.name !== undefined) { fields.push('name = ?'); params.push(updates.name); }
        if (updates.color !== undefined) { fields.push('color = ?'); params.push(updates.color); }
        if (updates.isVisible !== undefined) { fields.push('is_visible = ?'); params.push(updates.isVisible); }
        if (updates.allowedRoles !== undefined) { fields.push('allowed_roles = ?'); params.push(JSON.stringify(updates.allowedRoles)); }
        if (updates.displayOrder !== undefined) { fields.push('display_order = ?'); params.push(updates.displayOrder); }
        if (updates.icon !== undefined) { fields.push('icon = ?'); params.push(updates.icon); }
        if (updates.headerBgClass !== undefined) { fields.push('header_bg_class = ?'); params.push(updates.headerBgClass); }

        if (fields.length === 0) return true;

        params.push(id);
        await query(`UPDATE ${FOLLOW_UP_STATUSES_TABLE} SET ${fields.join(', ')} WHERE id = ?`, params);
        
        const io = getIO();
        if (io) io.emit("follow-up-updated", { type: 'status-update', id });
        
        return true;
    } catch (error) {
        console.error(`Error updating follow-up status ${id}:`, error);
        return false;
    }
};

export const deleteFollowUpStatus = async (id: string): Promise<boolean> => {
    try {
        const results = await query<any[]>(`SELECT is_system_status FROM ${FOLLOW_UP_STATUSES_TABLE} WHERE id = ?`, [id]);
        if (results.length > 0 && results[0].is_system_status) {
            throw new Error("Cannot delete system status.");
        }
        await query(`DELETE FROM ${FOLLOW_UP_STATUSES_TABLE} WHERE id = ?`, [id]);
        
        const io = getIO();
        if (io) io.emit("follow-up-updated", { type: 'status-delete', id });
        
        return true;
    } catch (error) {
        console.error(`Error deleting follow-up status ${id}:`, error);
        return false;
    }
};
