
import { db } from './firebase';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, getDoc, query, where, writeBatch, setDoc } from 'firebase/firestore';
import type { CustomStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const STATUSES_COLLECTION = 'customOrderStatuses';

const defaultStatusesData: Omit<CustomStatus, 'id' | 'isSystemStatus'>[] = [
  { name: 'Order Submitted', color: '#8B5CF6' }, // Purple // MODIFIED
  { name: 'Design in Progress', color: '#3B82F6' }, // Blue
  { name: 'Pending Client Approval', color: '#F59E0B' }, // Amber
  { name: 'Changes Requested', color: '#EF4444' }, // Red
  { name: 'Approved for Production', color: '#10B981' }, // Emerald
  { name: 'Ready for Design', color: '#14B8A6' }, // Teal
  { name: 'In Production', color: '#0EA5E9' }, // Sky
  { name: 'Quality Check', color: '#F97316' }, // Orange
  { name: 'Shipped', color: '#22C55E' }, // Green
  { name: 'Delivered', color: '#65A30D' }, // Lime
  { name: 'Cancelled', color: '#71717A' }, // Zinc
  { name: 'On Hold', color: '#A1A1AA' }, // Stone
];

export const seedDefaultStatuses = async (): Promise<CustomStatus[]> => {
  const statusesRef = collection(db, STATUSES_COLLECTION);
  const batch = writeBatch(db);
  const createdStatuses: CustomStatus[] = [];

  defaultStatusesData.forEach(statusData => {
    const id = statusData.name.toLowerCase().replace(/\s+/g, '-'); // Generate ID from name
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
  } catch (error) {
     console.error("Error seeding default statuses:", error);
     return [];
  }
  return createdStatuses;
};

export const getStatuses = async (): Promise<CustomStatus[]> => {
  const statusesCol = collection(db, STATUSES_COLLECTION);
  try {
    const snapshot = await getDocs(statusesCol);
    if (snapshot.empty) {
      console.log("No statuses found in Firestore, attempting to seed default statuses.");
      return await seedDefaultStatuses();
    }
    const statuses = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as CustomStatus));
    return statuses.sort((a, b) => {
      if (a.isSystemStatus && !b.isSystemStatus) return -1;
      if (!a.isSystemStatus && b.isSystemStatus) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error("Error fetching statuses:", error);
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
    console.warn(`Status with ID "${id}" not found.`);
    return undefined;
  } catch (error) {
    console.error("Error fetching status by ID:", error);
    return undefined;
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
        throw error; // Re-throw specific known errors
    }
    return null; // Return null for other errors
  }
};

export const updateStatus = async (id: string, name: string, color: string): Promise<boolean> => {
  try {
    const statusDoc = doc(db, STATUSES_COLLECTION, id);
    const statusSnapshot = await getDoc(statusDoc);
    if (!statusSnapshot.exists()) {
        throw new Error(`Status with ID "${id}" not found for update.`);
    }
    const existingStatus = statusSnapshot.data() as CustomStatus;

    const updates: { name?: string; color: string } = { color };
    if (!existingStatus.isSystemStatus) {
      updates.name = name; // Only allow name update for non-system statuses
    } else if (name !== existingStatus.name) {
        // If it's a system status and name is attempted to be changed, prevent and optionally warn/throw
        console.warn(`Attempted to change name of system status ${id}. Only color can be updated.`);
        // Or throw new Error("System status names cannot be changed.");
    }
    await updateDoc(statusDoc, updates);
    return true;
  } catch (error) {
    console.error("Error updating status in Firestore:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};

export const deleteStatus = async (id: string): Promise<boolean> => {
  try {
    const statusDoc = doc(db, STATUSES_COLLECTION, id);
    const statusSnapshot = await getDoc(statusDoc);
    if (!statusSnapshot.exists()) {
      throw new Error(`Status with ID "${id}" not found for deletion.`);
    }
    const statusData = statusSnapshot.data() as CustomStatus;
    if (statusData.isSystemStatus) {
      throw new Error("System statuses cannot be deleted.");
    }
    await deleteDoc(statusDoc);
    return true;
  } catch (error) {
    console.error("Error deleting status from Firestore:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};

export const getContrastTextColor = (hexColor: string): string => {
  if (!hexColor || typeof hexColor !== 'string' || hexColor.length < 4) return '#000000'; // Handle invalid or short hex
  try {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return '#000000'; // Handle parsing errors
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000000' : '#FFFFFF';
  } catch (e) {
    console.error("Error parsing hexColor for contrast:", hexColor, e);
    return '#000000'; // Fallback on parsing error
  }
};
