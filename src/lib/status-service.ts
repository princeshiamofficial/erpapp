
import { db } from './firebase';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, getDoc, query, where, writeBatch, setDoc } from 'firebase/firestore';
import type { CustomStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const STATUSES_COLLECTION = 'customOrderStatuses';

const defaultStatusesData: Omit<CustomStatus, 'id' | 'isSystemStatus'>[] = [
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

/**
 * Seeds the Firestore database with default custom order statuses if they don't already exist.
 * This function is suitable for server-side execution (e.g., during deployment scripts or initial setup).
 * @returns {Promise<CustomStatus[]>} A promise that resolves with an array of the seeded statuses.
 */
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

/**
 * Fetches all custom order statuses from Firestore.
 * This function is suitable for server-side execution (e.g., in Server Components or API routes).
 * @returns {Promise<CustomStatus[]>} A promise that resolves with an array of custom statuses.
 */
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
    console.error("Error fetching statuses from Firestore:", error);
    return [];
  }
};

/**
 * Fetches a single custom order status by its ID from Firestore.
 * This function is suitable for server-side execution.
 * @param {string} id - The ID of the status to fetch.
 * @returns {Promise<CustomStatus | undefined>} A promise that resolves with the status object or undefined if not found or on error.
 */
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

/**
 * Fetches all custom order status names from Firestore.
 * This function is suitable for server-side execution.
 * @returns {Promise<string[]>} A promise that resolves with an array of status names.
 */
export const getAllStatusNames = async (): Promise<string[]> => {
  try {
    const statuses = await getStatuses();
    return statuses.map(status => status.name);
  } catch (error) {
    console.error("Error fetching all status names:", error);
    return [];
  }
};

/**
 * Fetches the name of a single custom order status by its ID from Firestore.
 * This function is suitable for server-side execution.
 * @param {string} id - The ID of the status.
 * @returns {Promise<string | null>} A promise that resolves with the status name or null if not found or on error.
 */
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


/**
 * Adds a new custom order status to Firestore.
 * Suitable for server-side execution (e.g., via Server Actions).
 * @param {string} name - The name of the new status.
 * @param {string} color - The color for the new status.
 * @returns {Promise<CustomStatus | null>} A promise that resolves with the new status object or null on error.
 */
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

/**
 * Updates an existing custom order status in Firestore.
 * Suitable for server-side execution.
 * @param {string} id - The ID of the status to update.
 * @param {string} name - The new name for the status (only if not a system status).
 * @param {string} color - The new color for the status.
 * @returns {Promise<boolean>} A promise that resolves with true on success, false on failure.
 */
export const updateStatus = async (id: string, name: string, color: string): Promise<boolean> => {
  try {
    const statusDocRef = doc(db, STATUSES_COLLECTION, id);
    const statusSnapshot = await getDoc(statusDocRef);
    if (!statusSnapshot.exists()) {
        throw new Error(`Status with ID "${id}" not found for update.`);
    }
    const existingStatus = statusSnapshot.data() as CustomStatus;

    const updates: Partial<CustomStatus> = { color }; // Color can always be updated
    if (!existingStatus.isSystemStatus) {
      // Only allow name update for non-system statuses
      if (name !== existingStatus.name) {
        // Check if the new name already exists (excluding the current document)
        const q = query(collection(db, STATUSES_COLLECTION), where("name", "==", name));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty && querySnapshot.docs.some(doc => doc.id !== id)) {
          throw new Error(`Another status with the name "${name}" already exists.`);
        }
        updates.name = name;
      }
    } else if (name !== existingStatus.name) {
        // If it's a system status and name is attempted to be changed, prevent
        console.warn(`Attempted to change name of system status ${id}. Only color can be updated.`);
        // No error thrown here, just won't update the name
    }
    await updateDoc(statusDocRef, updates);
    return true;
  } catch (error) {
    console.error("Error updating status in Firestore:", error);
    if (error instanceof Error) throw error; // Re-throw specific errors for Server Action to catch
    return false;
  }
};

/**
 * Deletes a custom order status from Firestore.
 * Suitable for server-side execution.
 * @param {string} id - The ID of the status to delete.
 * @returns {Promise<boolean>} A promise that resolves with true on success, false on failure.
 */
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
    if (error instanceof Error) throw error; // Re-throw specific errors for Server Action to catch
    return false;
  }
};

/**
 * Calculates a contrasting text color (black or white) for a given background hex color.
 * @param {string} hexColor - The background color in hex format (e.g., "#RRGGBB").
 * @returns {string} "#000000" (black) or "#FFFFFF" (white).
 */
export const getContrastTextColor = (hexColor: string): string => {
  if (!hexColor || typeof hexColor !== 'string' || hexColor.length < 4) return '#000000';
  try {
    let rStr = '0', gStr = '0', bStr = '0';
    if (hexColor.length === 4) { // Short hex #RGB
      rStr = hexColor[1] + hexColor[1];
      gStr = hexColor[2] + hexColor[2];
      bStr = hexColor[3] + hexColor[3];
    } else if (hexColor.length === 7) { // Full hex #RRGGBB
      rStr = hexColor.slice(1, 3);
      gStr = hexColor.slice(3, 5);
      bStr = hexColor.slice(5, 7);
    } else {
        return '#000000'; // Invalid length
    }
    
    const r = parseInt(rStr, 16);
    const g = parseInt(gStr, 16);
    const b = parseInt(bStr, 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) return '#000000';
    
    // Formula for perceived brightness (YIQ)
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000000' : '#FFFFFF';
  } catch (e) {
    console.error("Error parsing hexColor for contrast:", hexColor, e);
    return '#000000';
  }
};
