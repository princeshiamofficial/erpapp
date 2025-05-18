
import { db } from './firebase';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, getDoc, query, where, writeBatch, setDoc } from 'firebase/firestore';
import type { CustomStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const STATUSES_COLLECTION = 'customOrderStatuses';
const READY_FOR_DESIGN_STATUS_ID = 'ready-for-design';

const defaultStatusesData: Omit<CustomStatus, 'id' | 'isSystemStatus'>[] = [
  { name: 'Order Submitted', color: '#8B5CF6' },
  { name: 'Design in Progress', color: '#3B82F6' },
  { name: 'Pending Client Approval', color: '#F59E0B' },
  { name: 'Changes Requested', color: '#EF4444' },
  { name: 'Approved for Production', color: '#10B981' },
  { name: 'Ready for Design', color: '#14B8A6' }, // This corresponds to READY_FOR_DESIGN_STATUS_ID
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
      statuses = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as CustomStatus));
    }

    // Ensure 'ready-for-design' status exists, create it if missing (resilience measure)
    let rfdStatus = statuses.find(s => s.id === READY_FOR_DESIGN_STATUS_ID);
    if (!rfdStatus) {
      console.warn(`getStatuses: Critical status '${READY_FOR_DESIGN_STATUS_ID}' not found in fetched list. Attempting to verify/re-create.`);
      const rfdDocRef = doc(db, STATUSES_COLLECTION, READY_FOR_DESIGN_STATUS_ID);
      const rfdDocSnap = await getDoc(rfdDocRef);
      if (!rfdDocSnap.exists()) {
        console.log(`getStatuses: Document for '${READY_FOR_DESIGN_STATUS_ID}' does not exist. Re-creating it.`);
        const readyForDesignDefaultData = defaultStatusesData.find(d => d.name === 'Ready for Design');
        if (readyForDesignDefaultData) {
          const newRfdStatus: CustomStatus = {
            id: READY_FOR_DESIGN_STATUS_ID,
            name: readyForDesignDefaultData.name,
            color: readyForDesignDefaultData.color,
            isSystemStatus: true,
          };
          await setDoc(rfdDocRef, newRfdStatus);
          statuses.push(newRfdStatus); // Add to current list
          console.log(`getStatuses: Successfully re-created status '${READY_FOR_DESIGN_STATUS_ID}'.`);
        } else {
          console.error(`getStatuses: Could not find default data for 'Ready for Design' to re-create it.`);
        }
      } else {
         // Document exists but wasn't in the initial getDocs snapshot - unusual, but add it.
        console.log(`getStatuses: Document for '${READY_FOR_DESIGN_STATUS_ID}' found by direct get. Adding to list.`);
        const existingRfdData = {id: rfdDocSnap.id, ...rfdDocSnap.data()} as CustomStatus;
        // Avoid duplicates if it was somehow missed by getDocs but present
        if(!statuses.some(s => s.id === existingRfdData.id)) {
            statuses.push(existingRfdData);
        }
      }
    }
    
    console.log("getStatuses: Returning status IDs:", statuses.map(s => s.id).join(', '));
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
      return { id: docSnap.id, ...docSnap.data() } as CustomStatus;
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

export const addStatus = async (name: string, color: string): Promise<CustomStatus | null> => {
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
      isSystemStatus: false
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

export const updateStatus = async (id: string, name: string, color: string): Promise<boolean> => {
  console.log(`status-service/updateStatus: Attempting to update status. ID: '${id}', New Name: '${name}', New Color: '${color}'`);
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
    if (color !== existingStatus.color) {
        updates.color = color;
        changed = true;
    }
    if (name !== existingStatus.name) {
        updates.name = name;
        changed = true;
    }
    
    if (!changed) {
        console.log('status-service/updateStatus: No actual changes to name or color. Skipping update.');
        return true;
    }

    console.log('status-service/updateStatus: Applying updates to Firestore:', JSON.stringify(updates), 'to document ID:', id);
    await updateDoc(statusDocRef, updates);
    console.log('status-service/updateStatus: Update successful for ID:', id);
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
