

import { db } from './firebase';
import { collection, getDocs, doc, updateDoc, getDoc, query, where, writeBatch, setDoc, deleteDoc as deleteFirestoreDoc } from 'firebase/firestore';
import type { CustomStatus, UserRole } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { fetchFromApi, ensureCollectionExists } from './api-helper';

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
  await ensureCollectionExists(STATUSES_COLLECTION);
  
  for (const statusData of defaultStatusesData) {
    const newStatus: CustomStatus = {
      id: statusData.id,
      xid: statusData.id, // Use the system ID as the xid for defaults
      name: statusData.defaultName,
      color: statusData.color,
      isSystemStatus: true,
      isVisible: true,
      allowedRoles: statusData.defaultAllowedRoles || [],
    };

    try {
        await fetchFromApi(`collections/${STATUSES_COLLECTION}/documents`, {
            method: 'POST',
            body: JSON.stringify({ documentId: newStatus.id, data: newStatus })
        });
        createdStatuses.push(newStatus);
    } catch(error) {
        console.error(`Failed to seed status: ${newStatus.name}`, error);
    }
  }
  console.log('Default statuses seeded via API.');
  return createdStatuses;
};

export const getStatuses = async (): Promise<CustomStatus[]> => {
  try {
    await ensureCollectionExists(STATUSES_COLLECTION);
    const response = await fetchFromApi(`collections/${STATUSES_COLLECTION}/documents?limit=100`);
    
    if (response && Array.isArray(response.documents)) {
      if (response.documents.length === 0) {
        console.log("No statuses found, seeding defaults via API.");
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
    console.error("Error fetching statuses from API:", error);
    return [];
  }
};

export const getStatusById = async (id: string): Promise<CustomStatus | undefined> => {
  if (!id) return undefined;
  try {
    const response = await fetchFromApi(`collections/${STATUSES_COLLECTION}/documents/${id}`);
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
    console.error(`Error fetching status by ID "${id}" from API:`, error);
    return undefined;
  }
};

export const addStatus = async (name: string, color: string, isVisible: boolean, allowedRoles: UserRole[] = []): Promise<CustomStatus | null> => {
  if (!name.trim()) {
    throw new Error("Status name cannot be empty.");
  }
  try {
    const newStatusData: Omit<CustomStatus, 'id'> = {
      name: name.trim(),
      color,
      isSystemStatus: false,
      isVisible,
      allowedRoles,
      xid: name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    };
    const response = await fetchFromApi(`collections/${STATUSES_COLLECTION}/documents`, {
        method: 'POST',
        body: JSON.stringify({ data: newStatusData })
    });
    return { id: response.id, ...response.data } as CustomStatus;
  } catch (error) {
    console.error("Error adding status via API:", error);
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
    
    await fetchFromApi(`collections/${STATUSES_COLLECTION}/documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ data: dataToSend })
    });
    return true;
  } catch (error) {
    console.error(`Error updating status ID '${id}' via API:`, error);
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
    await fetchFromApi(`collections/${STATUSES_COLLECTION}/documents/${id}`, { method: 'DELETE' });
    return true;
  } catch (error) {
    console.error("Error deleting status from API:", error);
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
