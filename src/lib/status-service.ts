"use server";

import { query } from './mysql';
import type { CustomStatus, UserRole } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const STATUSES_TABLE = 'order_statuses';

import {
  READY_FOR_DESIGN_STATUS_ID,
  ORDER_SUBMITTED_ID,
  CANCELLED_STATUS_ID,
  ON_HOLD_STATUS_ID,
  LOGISTICS_STATUS_ID,
  QUALITY_CHECK_STATUS_ID,
  SHIPPED_STATUS_ID,
  DELIVERED_STATUS_ID,
  PROJECT_PENDING_STATUS_ID
} from './status-constants';


// Default statuses with names, colors, and default allowed roles
const defaultStatusesData: Array<Omit<CustomStatus, 'id' | 'isSystemStatus' | 'isVisible' | 'xid'> & { id: string }> = [
  { id: ORDER_SUBMITTED_ID, name: 'Order Submitted', color: '#8B5CF6', allowedRoles: ['CRM', 'ADMIN', 'SYSTEM_ADMIN'] },
  { id: READY_FOR_DESIGN_STATUS_ID, name: 'Ready for Design', color: '#14B8A6', allowedRoles: ['CRM', 'ADMIN', 'SYSTEM_ADMIN'] },
  { id: 'design-in-progress', name: 'Design in Progress', color: '#3B82F6', allowedRoles: ['DESIGNER_REPRESENTATIVE', 'ADMIN', 'SYSTEM_ADMIN'] },
  { id: 'pending-client-approval', name: 'Pending Client Approval', color: '#F59E0B', allowedRoles: ['DESIGNER_REPRESENTATIVE', 'ADMIN', 'SYSTEM_ADMIN'] },
  { id: 'changes-requested', name: 'Changes Requested', color: '#EF4444', allowedRoles: ['DESIGNER_REPRESENTATIVE', 'ADMIN', 'SYSTEM_ADMIN'] },
  { id: 'approved-for-production', name: 'Approved for Production', color: '#10B981', allowedRoles: ['DESIGNER_REPRESENTATIVE', 'ADMIN', 'SYSTEM_ADMIN'] },
  { id: 'in-production', name: 'In Production', color: '#0EA5E9', allowedRoles: ['ADMIN', 'SYSTEM_ADMIN'] },
  { id: QUALITY_CHECK_STATUS_ID, name: 'Quality Check', color: '#F97316', allowedRoles: ['ADMIN', 'SYSTEM_ADMIN'] },
  { id: LOGISTICS_STATUS_ID, name: 'Logistics', color: '#F97316', allowedRoles: ['ADMIN', 'SYSTEM_ADMIN', 'LR'] },
  { id: SHIPPED_STATUS_ID, name: 'Shipped', color: '#22C55E', allowedRoles: ['ADMIN', 'SYSTEM_ADMIN', 'LR'] },
  { id: DELIVERED_STATUS_ID, name: 'Delivered', color: '#65A30D', allowedRoles: ['ADMIN', 'SYSTEM_ADMIN', 'LR'] },
  { id: CANCELLED_STATUS_ID, name: 'Cancelled', color: '#71717A', allowedRoles: ['ADMIN', 'SYSTEM_ADMIN'] },
  { id: ON_HOLD_STATUS_ID, name: 'On Hold', color: '#A1A1AA', allowedRoles: ['ADMIN', 'SYSTEM_ADMIN'] },
  { id: PROJECT_PENDING_STATUS_ID, name: 'Project Pending', color: '#D97706', allowedRoles: ['CRM', 'ADMIN', 'SYSTEM_ADMIN'] },
];

const mapRowToStatus = (row: any): CustomStatus => ({
  id: row.id,
  name: row.name,
  color: row.color,
  isSystemStatus: Boolean(row.is_system_status),
  isVisible: Boolean(row.is_visible),
  allowedRoles: typeof row.allowed_roles === 'string' ? JSON.parse(row.allowed_roles) : (row.allowed_roles || []),
  xid: row.xid || row.id,
  isDeleted: Boolean(row.is_deleted),
});

export const seedDefaultStatuses = async (): Promise<CustomStatus[]> => {
  const createdStatuses: CustomStatus[] = [];

  for (const statusData of defaultStatusesData) {
    const statusPayload = {
      id: statusData.id,
      name: statusData.name,
      color: statusData.color,
      isSystemStatus: true,
      isVisible: true,
      allowedRoles: JSON.stringify(statusData.allowedRoles || []),
      xid: statusData.id,
    };

    try {
      await query(
        `INSERT INTO ${STATUSES_TABLE} (id, name, color, is_system_status, is_visible, allowed_roles, xid) 
             VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), color=VALUES(color)`,
        [statusPayload.id, statusPayload.name, statusPayload.color, true, true, statusPayload.allowedRoles, statusPayload.id]
      );
      createdStatuses.push({
        id: statusData.id,
        name: statusData.name,
        color: statusData.color,
        isSystemStatus: true,
        isVisible: true,
        allowedRoles: statusData.allowedRoles || [],
        xid: statusData.id,
      });

    } catch (error) {
      console.error(`Failed to seed status: ${statusData.id}`, error);
    }
  }
  return createdStatuses;
};


export const getStatuses = async (): Promise<CustomStatus[]> => {
  try {
    // Check and add is_deleted column if missing
    try {
      const cols = await query<any[]>(`SHOW COLUMNS FROM ${STATUSES_TABLE} LIKE 'is_deleted'`);
      if (cols.length === 0) {
        await query(`ALTER TABLE ${STATUSES_TABLE} ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE`);
      }
    } catch (err) {
      console.error("Failed to migrate order_statuses is_deleted column:", err);
    }

    // Check total count of statuses in database
    const totalCountResult = await query<any[]>(`SELECT COUNT(*) as count FROM ${STATUSES_TABLE}`);
    const totalCount = totalCountResult[0]?.count || 0;

    if (totalCount < defaultStatusesData.length) {
      console.log("Some default statuses are missing, seeding defaults.");
      await seedDefaultStatuses();
    }

    const results = await query<any[]>(`SELECT * FROM ${STATUSES_TABLE} WHERE is_deleted = FALSE`);

    return results.map(mapRowToStatus).sort((a, b) => {
      if (a.isSystemStatus && !b.isSystemStatus) return -1;
      if (!a.isSystemStatus && b.isSystemStatus) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error("Error fetching statuses from MySQL:", error);
    return [];
  }
};

export const getStatusById = async (id: string): Promise<CustomStatus | undefined> => {
  if (!id) return undefined;
  try {
    const results = await query<any[]>(`SELECT * FROM ${STATUSES_TABLE} WHERE id = ?`, [id]);
    if (results.length > 0) {
      return mapRowToStatus(results[0]);
    }
    return undefined;
  } catch (error) {
    console.error(`Error fetching status by ID "${id}" from MySQL:`, error);
    return undefined;
  }
};

export const addStatus = async (name: string, color: string, isVisible: boolean, allowedRoles: UserRole[] = [], isSystemStatus: boolean = false): Promise<CustomStatus | null> => {
  if (!name.trim()) {
    throw new Error("Status name cannot be empty.");
  }
  try {
    const customDocId = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    await query(
      `INSERT INTO ${STATUSES_TABLE} (id, name, color, is_system_status, is_visible, allowed_roles, xid) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [customDocId, name.trim(), color, isSystemStatus, isVisible, JSON.stringify(allowedRoles), customDocId]
    );

    return {
      id: customDocId,
      xid: customDocId,
      name: name.trim(),
      color,
      isSystemStatus,
      isVisible,
      allowedRoles,
    };
  } catch (error) {
    console.error("Error adding status in MySQL:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export async function updateStatus(
  id: string,
  name: string,
  color: string,
  isVisible: boolean,
  allowedRoles: UserRole[],
  actingUserRole?: UserRole,
  isSystemStatus?: boolean
): Promise<boolean> {
  try {
    const existingStatus = await getStatusById(id);
    if (!existingStatus) {
      throw new Error(`Status with ID "${id}" not found for update.`);
    }

    const updates: { [key: string]: any } = {};
    const effectiveIsSystem = isSystemStatus !== undefined ? isSystemStatus : existingStatus.isSystemStatus;

    if (name !== existingStatus.name) {
      if (existingStatus.isSystemStatus && actingUserRole !== 'SYSTEM_ADMIN') {
        throw new Error("Only System Administrators can change the name of system statuses.");
      }
      updates.name = name;
      if (!effectiveIsSystem) {
        updates.xid = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      } else {
        updates.xid = id;
      }
    }
    if (color !== existingStatus.color) { updates.color = color; }
    if (isVisible !== existingStatus.isVisible) { updates.is_visible = isVisible; }
    
    if (isSystemStatus !== undefined && isSystemStatus !== existingStatus.isSystemStatus) {
      if (actingUserRole !== 'SYSTEM_ADMIN') {
        throw new Error("Only System Administrators can change status type between custom and system.");
      }
      updates.is_system_status = isSystemStatus;
      if (name === existingStatus.name) {
        if (isSystemStatus) {
          updates.xid = id;
        } else {
          updates.xid = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        }
      }
    }

    const sortedNewRoles = [...allowedRoles].sort();
    const sortedExistingRoles = [...(existingStatus.allowedRoles || [])].sort();
    if (JSON.stringify(sortedNewRoles) !== JSON.stringify(sortedExistingRoles)) {
      if (existingStatus.isSystemStatus && actingUserRole !== 'SYSTEM_ADMIN') {
        throw new Error("Only System Administrators can change assignment permissions for system statuses.");
      }
      updates.allowed_roles = JSON.stringify(allowedRoles);
    }

    if (Object.keys(updates).length === 0) return true;

    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const params = [...Object.values(updates), id];

    await query(`UPDATE ${STATUSES_TABLE} SET ${fields} WHERE id = ?`, params);
    return true;
  } catch (error) {
    console.error(`Error updating status ID '${id}' in MySQL:`, error);
    if (error instanceof Error) throw error;
    return false;
  }
}

export const deleteStatus = async (id: string, actingUserRole?: UserRole): Promise<boolean> => {
  try {
    const statusToDelete = await getStatusById(id);
    if (!statusToDelete) {
      throw new Error(`Status with ID "${id}" not found for deletion.`);
    }
    if (statusToDelete.isSystemStatus && actingUserRole !== 'SYSTEM_ADMIN') {
      throw new Error("System statuses can only be deleted by System Administrators.");
    }
    await query(`UPDATE ${STATUSES_TABLE} SET is_deleted = TRUE WHERE id = ?`, [id]);
    return true;
  } catch (error) {
    console.error("Error deleting status from MySQL:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};

export const getDeletedStatuses = async (): Promise<CustomStatus[]> => {
  try {
    const results = await query<any[]>(`SELECT * FROM ${STATUSES_TABLE} WHERE is_deleted = TRUE`);
    return results.map(mapRowToStatus).sort((a, b) => {
      if (a.isSystemStatus && !b.isSystemStatus) return -1;
      if (!a.isSystemStatus && b.isSystemStatus) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error("Error fetching deleted statuses from MySQL:", error);
    return [];
  }
};

export const permanentDeleteStatus = async (id: string, actingUserRole?: UserRole): Promise<boolean> => {
  try {
    const statusToDelete = await getStatusById(id);
    if (!statusToDelete) {
      throw new Error(`Status with ID "${id}" not found for deletion.`);
    }
    if (statusToDelete.isSystemStatus && actingUserRole !== 'SYSTEM_ADMIN') {
      throw new Error("System statuses can only be deleted by System Administrators.");
    }
    await query(`DELETE FROM ${STATUSES_TABLE} WHERE id = ?`, [id]);
    return true;
  } catch (error) {
    console.error("Error permanently deleting status from MySQL:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};

export const restoreStatus = async (id: string): Promise<boolean> => {
  try {
    await query(`UPDATE ${STATUSES_TABLE} SET is_deleted = FALSE WHERE id = ?`, [id]);
    return true;
  } catch (error) {
    console.error("Error restoring status from MySQL:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};





