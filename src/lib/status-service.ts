
import { db } from './firebase';
import { collection, getDocs, doc, updateDoc, getDoc, query, where, writeBatch, setDoc } from 'firebase/firestore';
import type { CustomStatus, UserRole } from '@/types'; // Added UserRole
import { v4 as uuidv4 } from 'uuid';

const STATUSES_COLLECTION = 'customOrderStatuses';
export const READY_FOR_DESIGN_STATUS_ID = 'ready-for-design'; // Export if needed elsewhere

const defaultStatusesData: Omit<CustomStatus, 'id' | 'isSystemStatus' | 'isVisible'>[] = [
  { name: 'Order Submitted', color: '#8B5CF6' },
  { name: 'Design in Progress', color: '#3B82F6' },
  { name: 'Pending Client Approval', color: '#F59E0B' },
  { name: 'Changes Requested', color: '#EF4444' },
  { name: 'Approved for Production', color: '#10B981' },
  { name: 'Ready for Design', color: '#14B8A6' },
  { name: 'In Production', color: '#0EA5E9' },
  { name: 'Quality Check', color: '#F97316' },
  { name: 'Shipped', color: '#22C55E' },
  { name: 'Delivered', color: '#65A30D' },
  { name: 'Cancelled', color: '#71717A' },
  { name: 'On Hold', color: '#A1A1AA' },
];

export const seedDefaultStatuses = async (): Promise<CustomStatus[]> => {
  const statusesRef = collection(db, STATUSES_COLLECTION);
  const batch = writeBatch(db);
  const createdStatuses: CustomStatus[] = [];

  defaultStatusesData.forEach(statusData => {
    const id = statusData.name.toLowerCase().replace(/\s+/g, '-');
    const newStatus: CustomStatus = {
      ...statusData,
      id,
      isSystemStatus: true,
      isVisible: true,
    };
    const docRef = doc(statusesRef, id);
    batch.set(docRef, newStatus);
    createdStatuses.push(newStatus);
  });
  try {
    await batch.commit();
    console.log('Default statuses seeded in Firestore.');
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
      statuses = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data(), isVisible: docSnap.data().isVisible !== false } as CustomStatus));
      
      const batch = writeBatch(db);
      let newStatusesAddedToBatch = false;

      for (const defaultStatusData of defaultStatusesData) {
        const expectedId = defaultStatusData.name.toLowerCase().replace(/\s+/g, '-');
        if (!statuses.some(s => s.id === expectedId)) {
          console.warn(`getStatuses: Default system status with ID '${expectedId}' (Name: "${defaultStatusData.name}") was missing from Firestore. Re-creating it.`);
          const newSystemStatus: CustomStatus = {
            id: expectedId,
            name: defaultStatusData.name,
            color: defaultStatusData.color,
            isSystemStatus: true,
            isVisible: true,
          };
          const docRef = doc(db, STATUSES_COLLECTION, expectedId);
          batch.set(docRef, newSystemStatus);
          statuses.push(newSystemStatus);
          newStatusesAddedToBatch = true;
        }
      }
      
      // Special check for 'ready-for-design' because it's critical
      const readyForDesignExists = statuses.some(s => s.id === READY_FOR_DESIGN_STATUS_ID);
      if (!readyForDesignExists) {
          console.warn(`getStatuses: CRITICAL system status with ID '${READY_FOR_DESIGN_STATUS_ID}' was missing. Attempting to re-create it.`);
          const rfdDefaultData = defaultStatusesData.find(s => s.name === 'Ready for Design');
          if (rfdDefaultData) {
            const newRfdStatus: CustomStatus = {
              id: READY_FOR_DESIGN_STATUS_ID,
              name: rfdDefaultData.name,
              color: rfdDefaultData.color,
              isSystemStatus: true,
              isVisible: true,
            };
            const docRef = doc(db, STATUSES_COLLECTION, READY_FOR_DESIGN_STATUS_ID);
            batch.set(docRef, newRfdStatus);
            statuses.push(newRfdStatus);
            newStatusesAddedToBatch = true;
          }
      }


      if (newStatusesAddedToBatch) {
        try {
          await batch.commit();
          console.log('getStatuses: Missing default system statuses were re-seeded.');
        } catch (commitError) {
          console.error('getStatuses: Error committing batch for re-seeding missing system statuses:', commitError);
          // If re-seeding fails, we might still want to return what we have, though it might be incomplete.
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
      return { id: docSnap.id, ...docSnap.data(), isVisible: docSnap.data().isVisible !== false } as CustomStatus;
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

export const addStatus = async (name: string, color: string, isVisible: boolean): Promise<CustomStatus | null> => {
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

export async function updateStatus(id: string, name: string, color: string, isVisible: boolean, actingUserRole?: UserRole): Promise<boolean> {
  console.log(`status-service/updateStatus: Attempting to update status. ID: '${id}', New Name: '${name}', New Color: '${color}', New Visibility: ${isVisible}, Acting Role: ${actingUserRole}`);
  try {
    const statusDocRef = doc(db, STATUSES_COLLECTION, id);
    const statusSnapshot = await getDoc(statusDocRef);

    if (!statusSnapshot.exists()) {
      console.error(`status-service/updateStatus: Status with ID "${id}" not found for update.`);
      throw new Error(`Status with ID "${id}" not found for update.`);
    }
    const existingStatus = { id: statusSnapshot.id, ...statusSnapshot.data() } as CustomStatus;
    console.log('status-service/updateStatus: Existing status data:', JSON.stringify(existingStatus));

    const updates: Partial<CustomStatus> = {};
    let changed = false;
    
    if (name !== existingStatus.name) {
      if (existingStatus.isSystemStatus && actingUserRole !== 'SYSTEM_ADMIN') {
        console.warn(`status-service/updateStatus: Attempt to change name of system status ID '${id}' by non-SYSTEM_ADMIN role '${actingUserRole}' denied.`);
        throw new Error("System status names can only be changed by a System Administrator.");
      }
      updates.name = name;
      changed = true;
    }
    if (color !== existingStatus.color) {
        updates.color = color;
        changed = true;
    }
    if (isVisible !== (existingStatus.isVisible !== false)) { // existingStatus.isVisible could be undefined, treat as true
        updates.isVisible = isVisible;
        changed = true;
    }
    
    if (!changed) {
        console.log('status-service/updateStatus: No actual changes to name, color, or visibility. Skipping update.');
        return true;
    }

    console.log('status-service/updateStatus: Applying updates to Firestore:', JSON.stringify(updates), 'to document ID:', id);
    await updateDoc(statusDocRef, updates);
    console.log('status-service/updateStatus: Update successful for ID:', id);
    return true;
  } catch (error) {
    console.error(`status-service/updateStatus: Error updating status ID '${id}':`, error);
    if (error instanceof Error) throw error; // Re-throw to be caught by server action
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
