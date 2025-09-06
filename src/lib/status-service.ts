

import type { CustomStatus, UserRole } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

const STATUSES_COLLECTION = 'customOrderStatuses';
export const READY_FOR_DESIGN_STATUS_ID = 'ready-for-design';
export const ORDER_SUBMITTED_ID = 'order-submitted'; 
export const CANCELLED_STATUS_ID = 'cancelled'; 
export const ON_HOLD_STATUS_ID = 'on-hold'; 
export const LOGISTICS_STATUS_ID = 'logistics'; 
export const QUALITY_CHECK_STATUS_ID = 'quality-check';
export const SHIPPED_STATUS_ID = 'shipped'; // Added SHIPPED_STATUS_ID
export const DELIVERED_STATUS_ID = 'delivered';

// Default statuses with names, colors, and default allowed roles
const defaultStatusesData: Array<Omit<CustomStatus, 'id' | 'isSystemStatus' | 'isVisible' | 'xid'> & { id: string, defaultName: string, defaultAllowedRoles?: UserRole[] }> = [
  { id: ORDER_SUBMITTED_ID, defaultName: 'Order Submitted', color: '#8B5CF6', defaultAllowedRoles: ['CRM', 'ADMIN', 'SYSTEM_ADMIN'] },
  { id: READY_FOR_DESIGN_STATUS_ID, defaultName: 'Ready for Design', color: '#14B8A6', defaultAllowedRoles: ['CRM', 'ADMIN', 'SYSTEM_ADMIN'] },
  { id: 'design-in-progress', defaultName: 'Design in Progress', color: '#3B82F6', defaultAllowedRoles: ['DESIGNER_REPRESENTATIVE', 'ADMIN', 'SYSTEM_ADMIN'] },
  { id: 'pending-client-approval', defaultName: 'Pending Client Approval', color: '#F59E0B', defaultAllowedRoles: ['DESIGNER_REPRESENTATIVE', 'ADMIN', 'SYSTEM_ADMIN'] },
  { id: 'changes-requested', defaultName: 'Changes Requested', color: '#EF4444', defaultAllowedRoles: ['DESIGNER_REPRESENTATIVE', 'ADMIN', 'SYSTEM_ADMIN'] },
  { id: 'approved-for-production', defaultName: 'Approved for Production', color: '#10B981', defaultAllowedRoles: ['DESIGNER_REPRESENTATIVE', 'ADMIN', 'SYSTEM_ADMIN'] },
  { id: 'in-production', defaultName: 'In Production', color: '#0EA5E9', defaultAllowedRoles: ['ADMIN', 'SYSTEM_ADMIN'] },
  { id: QUALITY_CHECK_STATUS_ID, defaultName: 'Quality Check', color: '#F97316', defaultAllowedRoles: ['ADMIN', 'SYSTEM_ADMIN'] }, // ID: quality-check
  { id: LOGISTICS_STATUS_ID, defaultName: 'Logistics', color: '#F97316', defaultAllowedRoles: ['ADMIN', 'SYSTEM_ADMIN', 'LR'] }, // ID: logistics
  { id: SHIPPED_STATUS_ID, defaultName: 'Shipped', color: '#22C55E', defaultAllowedRoles: ['ADMIN', 'SYSTEM_ADMIN', 'LR'] }, // ID: shipped
  { id: DELIVERED_STATUS_ID, defaultName: 'Delivered', color: '#65A30D', defaultAllowedRoles: ['ADMIN', 'SYSTEM_ADMIN', 'LR'] },
  { id: CANCELLED_STATUS_ID, defaultName: 'Cancelled', color: '#71717A', defaultAllowedRoles: ['ADMIN', 'SYSTEM_ADMIN'] },
  { id: ON_HOLD_STATUS_ID, defaultName: 'On Hold', color: '#A1A1AA', defaultAllowedRoles: ['ADMIN', 'SYSTEM_ADMIN'] },
];

export const seedDefaultStatuses = async (): Promise<CustomStatus[]> => {
  const createdStatuses: CustomStatus[] = [];
  await ensureCollectionExistsV3(STATUSES_COLLECTION);
  
  for (const statusData of defaultStatusesData) {
    const statusPayload = {
      name: statusData.defaultName,
      color: statusData.color,
      isSystemStatus: true,
      isVisible: true,
      allowedRoles: statusData.defaultAllowedRoles || [],
      xid: statusData.id,
    };

    try {
        const requestBody = {
            id: statusData.id,
            data: statusPayload
        };
        
        await fetchFromApiV3(`collections/${STATUSES_COLLECTION}/documents`, {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });
        
        createdStatuses.push({
            id: statusData.id,
            ...statusPayload
        });

    } catch(error) {
        console.error(`Failed to seed status with custom ID: ${statusData.id}`, error);
    }
  }
  console.log('Default statuses seeded via API v3 using custom IDs.');
  return createdStatuses;
};


export const getStatuses = async (): Promise<CustomStatus[]> => {
  try {
    await ensureCollectionExistsV3(STATUSES_COLLECTION);
    const response = await fetchFromApiV3(`collections/${STATUSES_COLLECTION}/documents?limit=100`);
    
    if (response && Array.isArray(response.documents)) {
      if (response.documents.length === 0) {
        console.log("No statuses found, seeding defaults via API v3.");
        return await seedDefaultStatuses();
      }
      return response.documents.map((doc: { id: string, data: any }) => ({
        id: doc.id,
        ...doc.data,
        xid: doc.data.xid || doc.id, // Fallback for older data
        isVisible: doc.data.isVisible !== false,
        allowedRoles: doc.data.allowedRoles || [],
      } as CustomStatus)).sort((a, b) => {
        if (a.isSystemStatus && !b.isSystemStatus) return -1;
        if (!a.isSystemStatus && b.isSystemStatus) return 1;
        return a.name.localeCompare(b.name);
      });
    }
    return [];
  } catch (error) {
    console.error("Error fetching statuses from API v3:", error);
    return [];
  }
};

export const getStatusById = async (id: string): Promise<CustomStatus | undefined> => {
  if (!id) return undefined;
  try {
    const response = await fetchFromApiV3(`collections/${STATUSES_COLLECTION}/documents/${id}`);
    if (response && response.data) {
      return { 
        id: response.id, 
        ...response.data,
        xid: response.data.xid || response.id, // Fallback
        isVisible: response.data.isVisible !== false,
        allowedRoles: response.data.allowedRoles || [],
      } as CustomStatus;
    }
    return undefined;
  } catch (error) {
    // If a document is not found, the API throws an error. We should handle this gracefully.
    if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
      console.warn(`Status with ID "${id}" not found in API database.`);
      return undefined;
    }
    console.error(`Error fetching status by ID "${id}" from API v3:`, error);
    return undefined;
  }
};

export const addStatus = async (name: string, color: string, isVisible: boolean, allowedRoles: UserRole[] = []): Promise<CustomStatus | null> => {
  if (!name.trim()) {
    throw new Error("Status name cannot be empty.");
  }
  try {
    const customId = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const newStatusData: Omit<CustomStatus, 'id'> = {
      name: name.trim(),
      color,
      isSystemStatus: false,
      isVisible,
      allowedRoles,
      xid: customId, // Set xid to the same as the custom id
    };

    const payload = {
        id: customId,
        data: newStatusData
    };
    
    await fetchFromApiV3(`collections/${STATUSES_COLLECTION}/documents`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    const createdStatus: CustomStatus = {
        id: customId,
        ...newStatusData
    };

    return createdStatus;
  } catch (error) {
    console.error("Error adding status via API v3:", error);
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
    actingUserRole?: UserRole
): Promise<boolean> {
  try {
    const existingStatus = await getStatusById(id);
    if (!existingStatus) {
      throw new Error(`Status with ID "${id}" not found for update.`);
    }
    
    const updates: Partial<Omit<CustomStatus, 'id'>> = {};
    
    if (name !== existingStatus.name) {
      if (existingStatus.isSystemStatus && actingUserRole !== 'SYSTEM_ADMIN') {
        throw new Error("Only System Administrators can change the name of system statuses.");
      }
      updates.name = name;
      // Also update the xid if it's not a system status
      if (!existingStatus.isSystemStatus) {
        updates.xid = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
    }
    if (color !== existingStatus.color) { updates.color = color; }
    if (isVisible !== (existingStatus.isVisible !== false)) { updates.isVisible = isVisible; }

    const sortedNewRoles = [...allowedRoles].sort();
    const sortedExistingRoles = [...(existingStatus.allowedRoles || [])].sort();
    if (JSON.stringify(sortedNewRoles) !== JSON.stringify(sortedExistingRoles)) {
        if (existingStatus.isSystemStatus && actingUserRole !== 'SYSTEM_ADMIN') {
            throw new Error("Only System Administrators can change assignment permissions for system statuses.");
        }
        updates.allowedRoles = allowedRoles;
    }
    
    if (Object.keys(updates).length === 0) return true;

    const dataToSend = { ...existingStatus, ...updates };
    delete (dataToSend as any).id;
    
    await fetchFromApiV3(`collections/${STATUSES_COLLECTION}/documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ data: dataToSend })
    });
    return true;
  } catch (error) {
    console.error(`Error updating status ID '${id}' via API v3:`, error);
    if (error instanceof Error) throw error;
    return false;
  }
};

export const deleteStatus = async (id: string): Promise<boolean> => {
  try {
    const statusToDelete = await getStatusById(id);
    if (!statusToDelete) {
      throw new Error(`Status with ID "${id}" not found for deletion.`);
    }
    if (statusToDelete.isSystemStatus) {
      throw new Error("System statuses cannot be deleted.");
    }
    await fetchFromApiV3(`collections/${STATUSES_COLLECTION}/documents/${id}`, { method: 'DELETE' });
    return true;
  } catch (error) {
    console.error("Error deleting status from API v3:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};


export const getContrastTextColor = (hexColor: string): string => {
  try {
    if (!hexColor || typeof hexColor !== 'string' || hexColor.length < 4) return '#000000';
    
    let rStr = '0', gStr = '0', bStr = '0';
    if (hexColor.length === 4) { 
      rStr = hexColor[1] + hexColor[1];
      gStr = hexColor[2] + hexColor[2];
      bStr = hexColor[3] + hexColor[3];
    } else if (hexColor.length === 7) { 
      rStr = hexColor.slice(1, 3);
      gStr = hexColor.slice(3, 5);
      bStr = hexColor.slice(5, 7);
    } else {
        return '#000000'; 
    }
    
    const r = parseInt(rStr, 16);
    const g = parseInt(gStr, 16);
    const b = parseInt(bStr, 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) return '#000000';
    
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000000' : '#FFFFFF';
  } catch (e) {
    console.error("Error parsing hexColor for contrast:", hexColor, e);
    return '#000000';
  }
};
