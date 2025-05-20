
import { db } from './firebase';
import { collection, getDocs, doc, updateDoc, getDoc, query, where, writeBatch, setDoc, deleteDoc } from 'firebase/firestore';
import type { CustomStatus, UserRole } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const STATUSES_COLLECTION = 'customOrderStatuses';
export const READY_FOR_DESIGN_STATUS_ID = 'ready-for-design';

// Default statuses with names, colors, and default allowed roles
const defaultStatusesData: Array<Omit<CustomStatus, 'id' | 'isSystemStatus' | 'isVisible'> & { defaultName: string, defaultAllowedRoles?: UserRole[] }> = [
  { defaultName: 'Order Submitted', color: '#8B5CF6', defaultAllowedRoles: ['CRM', 'ADMIN', 'SYSTEM_ADMIN'] },
  { defaultName: 'Ready for Design', color: '#14B8A6', defaultAllowedRoles: ['CRM', 'ADMIN', 'SYSTEM_ADMIN'] },
  { defaultName: 'Design in Progress', color: '#3B82F6', defaultAllowedRoles: ['DESIGNER_REPRESENTATIVE', 'ADMIN', 'SYSTEM_ADMIN'] },
  { defaultName: 'Pending Client Approval', color: '#F59E0B', defaultAllowedRoles: ['DESIGNER_REPRESENTATIVE', 'ADMIN', 'SYSTEM_ADMIN'] },
  { defaultName: 'Changes Requested', color: '#EF4444', defaultAllowedRoles: ['DESIGNER_REPRESENTATIVE', 'ADMIN', 'SYSTEM_ADMIN'] },
  { defaultName: 'Approved for Production', color: '#10B981', defaultAllowedRoles: ['DESIGNER_REPRESENTATIVE', 'ADMIN', 'SYSTEM_ADMIN'] },
  { defaultName: 'In Production', color: '#0EA5E9', defaultAllowedRoles: ['ADMIN', 'SYSTEM_ADMIN'] },
  { defaultName: 'Quality Check', color: '#F97316', defaultAllowedRoles: ['ADMIN', 'SYSTEM_ADMIN'] },
  { defaultName: 'Shipped', color: '#22C55E', defaultAllowedRoles: ['ADMIN', 'SYSTEM_ADMIN'] },
  { defaultName: 'Delivered', color: '#65A30D', defaultAllowedRoles: ['ADMIN', 'SYSTEM_ADMIN'] },
  { defaultName: 'Cancelled', color: '#71717A', defaultAllowedRoles: ['ADMIN', 'SYSTEM_ADMIN'] },
  { defaultName: 'On Hold', color: '#A1A1AA', defaultAllowedRoles: ['ADMIN', 'SYSTEM_ADMIN'] },
];

export const seedDefaultStatuses = async (): Promise<CustomStatus[]> => {
  const statusesRef = collection(db, STATUSES_COLLECTION);
  const batch = writeBatch(db);
  const createdStatuses: CustomStatus[] = [];

  defaultStatusesData.forEach(statusData => {
    const id = statusData.defaultName.toLowerCase().replace(/\s+/g, '-');
    const newStatus: CustomStatus = {
      id,
      name: statusData.defaultName,
      color: statusData.color,
      isSystemStatus: true,
      isVisible: true,
      allowedRoles: statusData.defaultAllowedRoles || [], // Default to empty if not specified
    };
    const docRef = doc(statusesRef, id);
    batch.set(docRef, newStatus);
    createdStatuses.push(newStatus);
  });
  try {
    await batch.commit();
    console.log('Default statuses seeded in Firestore with allowedRoles.');
    return createdStatuses;
  } catch (error) {
     console.error("Error seeding default statuses:", error);
     return [];
  }
};

export const getStatuses = async (): Promise<CustomStatus[]> => {
  const statusesCol = collection(db, STATUSES_COLLECTION);
  let statuses: CustomStatus[] = [];
  try {
    const snapshot = await getDocs(statusesCol);
    if (snapshot.empty) {
      console.log("No statuses found in Firestore, attempting to seed default statuses.");
      statuses = await seedDefaultStatuses();
    } else {
      statuses = snapshot.docs.map(docSnap => ({ 
        id: docSnap.id, 
        ...docSnap.data(), 
        isVisible: docSnap.data().isVisible !== false,
        allowedRoles: docSnap.data().allowedRoles || [], // Ensure allowedRoles is always an array
      } as CustomStatus));
      
      const batch = writeBatch(db);
      let newStatusesAddedToBatch = false;

      for (const defaultStatusData of defaultStatusesData) {
        const expectedId = defaultStatusData.defaultName.toLowerCase().replace(/\s+/g, '-');
        const existingStatus = statuses.find(s => s.id === expectedId);

        if (!existingStatus) {
          console.warn(`getStatuses: Default system status with ID '${expectedId}' (Name: "${defaultStatusData.defaultName}") was missing from Firestore. Re-creating it.`);
          const newSystemStatus: CustomStatus = {
            id: expectedId,
            name: defaultStatusData.defaultName,
            color: defaultStatusData.color,
            isSystemStatus: true,
            isVisible: true,
            allowedRoles: defaultStatusData.defaultAllowedRoles || [],
          };
          const docRef = doc(db, STATUSES_COLLECTION, expectedId);
          batch.set(docRef, newSystemStatus);
          statuses.push(newSystemStatus); // Add to current list to avoid re-fetching immediately
          newStatusesAddedToBatch = true;
        } else if (existingStatus.isSystemStatus && (!existingStatus.allowedRoles || existingStatus.allowedRoles.length === 0) && defaultStatusData.defaultAllowedRoles && defaultStatusData.defaultAllowedRoles.length > 0) {
          // If it's a system status and allowedRoles is missing/empty, but defaults exist, update it.
          console.warn(`getStatuses: System status '${expectedId}' was missing default allowedRoles. Updating.`);
          const docRef = doc(db, STATUSES_COLLECTION, expectedId);
          batch.update(docRef, { allowedRoles: defaultStatusData.defaultAllowedRoles });
          existingStatus.allowedRoles = defaultStatusData.defaultAllowedRoles; // Update in current list
          newStatusesAddedToBatch = true;
        }
      }
      
      if (newStatusesAddedToBatch) {
        try {
          await batch.commit();
          console.log('getStatuses: Missing default system statuses or their allowedRoles were re-seeded/updated.');
        } catch (commitError) {
          console.error('getStatuses: Error committing batch for re-seeding/updating system statuses:', commitError);
        }
      }
    }
    
    return statuses.sort((a, b) => {
      if (a.isSystemStatus && !b.isSystemStatus) return -1;
      if (!a.isSystemStatus && b.isSystemStatus) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error("Error fetching statuses from Firestore:", error);
    return [];
  }
};

export const getStatusById = async (id: string): Promise<CustomStatus | undefined> => {
  if (!id) return undefined;
  try {
    const docRef = doc(db, STATUSES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return { 
        id: docSnap.id, 
        ...data, 
        isVisible: data.isVisible !== false,
        allowedRoles: data.allowedRoles || [],
      } as CustomStatus;
    }
    console.warn(`Status with ID "${id}" not found in Firestore.`);
    return undefined;
  } catch (error) {
    console.error(`Error fetching status by ID "${id}" from Firestore:`, error);
    return undefined;
  }
};

export const getAllStatusNames = async (): Promise<string[]> => {
  try {
    const statuses = await getStatuses();
    return statuses.map(status => status.name);
  } catch (error) {
    console.error("Error fetching all status names:", error);
    return [];
  }
};

export const getStatusName = async (id: string): Promise<string | null> => {
  if (!id) return null;
  try {
    const status = await getStatusById(id);
    return status ? status.name : null;
  } catch (error) {
    console.error(`Error fetching status name for ID "${id}":`, error);
    return null;
  }
};

export const addStatus = async (name: string, color: string, isVisible: boolean, allowedRoles: UserRole[] = []): Promise<CustomStatus | null> => {
  try {
    const statusesCol = collection(db, STATUSES_COLLECTION);
    const q = query(statusesCol, where("name", "==", name));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error(`Status with name "${name}" already exists.`);
    }

    const newStatusId = uuidv4();
    const newStatusData: CustomStatus = {
      id: newStatusId,
      name,
      color,
      isSystemStatus: false,
      isVisible,
      allowedRoles,
    };

    const docRef = doc(db, STATUSES_COLLECTION, newStatusId);
    await setDoc(docRef, newStatusData);
    return newStatusData;
  } catch (error) {
    console.error("Error adding status to Firestore:", error);
    if (error instanceof Error && error.message.includes("already exists")) {
        throw error;
    }
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
  console.log(`status-service/updateStatus: ID: '${id}', Name: '${name}', Color: '${color}', Visible: ${isVisible}, Roles: ${allowedRoles.join(',')}, Acting: ${actingUserRole}`);
  try {
    const statusDocRef = doc(db, STATUSES_COLLECTION, id);
    const statusSnapshot = await getDoc(statusDocRef);

    if (!statusSnapshot.exists()) {
      throw new Error(`Status with ID "${id}" not found for update.`);
    }
    const existingStatus = { id: statusSnapshot.id, ...statusSnapshot.data() } as CustomStatus;
    
    const updates: Partial<CustomStatus> = {};
    
    if (name !== existingStatus.name) {
      if (existingStatus.isSystemStatus && actingUserRole !== 'SYSTEM_ADMIN') {
        throw new Error("Only System Administrators can change the name of system statuses.");
      }
      updates.name = name;
    }
    if (color !== existingStatus.color) {
        updates.color = color;
    }
    if (isVisible !== (existingStatus.isVisible !== false)) {
        updates.isVisible = isVisible;
    }
    // Compare allowedRoles arrays
    const sortedNewRoles = [...allowedRoles].sort();
    const sortedExistingRoles = [...(existingStatus.allowedRoles || [])].sort();
    if (JSON.stringify(sortedNewRoles) !== JSON.stringify(sortedExistingRoles)) {
        if (existingStatus.isSystemStatus && actingUserRole !== 'SYSTEM_ADMIN') {
            throw new Error("Only System Administrators can change assignment permissions for system statuses.");
        }
        updates.allowedRoles = allowedRoles;
    }
    
    if (Object.keys(updates).length === 0) {
        console.log('status-service/updateStatus: No actual changes. Skipping update.');
        return true;
    }

    await updateDoc(statusDocRef, updates);
    return true;
  } catch (error) {
    console.error(`status-service/updateStatus: Error updating status ID '${id}':`, error);
    if (error instanceof Error) throw error;
    return false;
  }
};

export const deleteStatus = async (id: string): Promise<boolean> => {
  try {
    const statusDocRef = doc(db, STATUSES_COLLECTION, id);
    const statusSnapshot = await getDoc(statusDocRef);
    if (!statusSnapshot.exists()) {
      throw new Error(`Status with ID "${id}" not found for deletion.`);
    }
    const statusData = statusSnapshot.data() as CustomStatus;
    if (statusData.isSystemStatus) {
      throw new Error("System statuses cannot be deleted.");
    }
    await deleteDoc(statusDocRef);
    return true;
  } catch (error) {
    console.error("Error deleting status from Firestore:", error);
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
