
import { db } from './firebase';
import { collection, getDocs, doc, addDoc, updateDoc, deleteDoc, getDoc, query, where, writeBatch } from 'firebase/firestore';
import type { CustomStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const STATUSES_COLLECTION = 'customOrderStatuses';

const defaultStatusesData: Omit<CustomStatus, 'id' | 'isSystemStatus'>[] = [
  { name: 'Idea Submitted', color: '#8B5CF6' }, // Purple
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
    const id = statusData.name.toLowerCase().replace(/\s+/g, '_'); // Generate ID from name
    const newStatus: CustomStatus = {
      ...statusData,
      id,
      isSystemStatus: true, // Mark default statuses as system statuses
    };
    const docRef = doc(statusesRef, id);
    batch.set(docRef, newStatus);
    createdStatuses.push(newStatus);
  });

  await batch.commit();
  console.log('Default statuses seeded in Firestore.');
  return createdStatuses;
};

export const getStatuses = async (): Promise<CustomStatus[]> => {
  const statusesCol = collection(db, STATUSES_COLLECTION);
  const snapshot = await getDocs(statusesCol);
  if (snapshot.empty) {
    console.log('No statuses found in Firestore, seeding default statuses.');
    return await seedDefaultStatuses();
  }
  const statuses = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as CustomStatus));
  return statuses.sort((a, b) => a.name.localeCompare(b.name)); // Sort for consistent display
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
    // Fallback for safety, maybe return a placeholder or a default "Unknown Status"
    // For now, return undefined.
    return undefined; 
  } catch (error) {
    console.error("Error fetching status by ID:", error);
    return undefined;
  }
};


export const addStatus = async (name: string, color: string): Promise<CustomStatus> => {
  const statusesCol = collection(db, STATUSES_COLLECTION);
  // Check if status name already exists (case-insensitive check can be added if needed)
  const q = query(statusesCol, where("name", "==", name));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    throw new Error(`Status with name "${name}" already exists.`);
  }

  const newStatusData = { name, color, id: uuidv4(), isSystemStatus: false };
  // Use the generated uuid as the document ID for consistency
  const docRef = doc(db, STATUSES_COLLECTION, newStatusData.id);
  await addDoc(statusesCol, newStatusData); // addDoc will generate its own ID, let's use setDoc with our ID
  // Corrected: use setDoc with the generated ID
  // await setDoc(docRef, newStatusData); // This was a bug, addDoc creates a new doc with auto ID. setDoc is correct.
  // Actually, addDoc is fine if we retrieve the created doc. But to use our own ID, setDoc is better.
  // Let's stick to addDoc and get the ID from the result for simplicity of this refactor stage.
  const addedDocRef = await addDoc(statusesCol, { name, color, isSystemStatus: false }); // Firestore will generate an ID
  return { id: addedDocRef.id, name, color, isSystemStatus: false };
};

export const updateStatus = async (id: string, name: string, color: string): Promise<boolean> => {
  try {
    const statusDoc = doc(db, STATUSES_COLLECTION, id);
    const statusSnapshot = await getDoc(statusDoc);
    if (!statusSnapshot.exists()) {
        throw new Error(`Status with ID "${id}" not found for update.`);
    }
    const existingStatus = statusSnapshot.data() as CustomStatus;
    if (existingStatus.isSystemStatus) {
        // Allow color changes for system statuses, but not name changes (or ID changes)
        await updateDoc(statusDoc, { color });
    } else {
        // For non-system statuses, allow name and color changes
        await updateDoc(statusDoc, { name, color });
    }
    return true;
  } catch (error) {
    console.error("Error updating status:", error);
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
    // TODO: Add check if status is in use by any order before deletion
    await deleteDoc(statusDoc);
    return true;
  } catch (error) {
    console.error("Error deleting status:", error);
    // Rethrow to allow UI to handle specific errors like "System status"
    if (error instanceof Error) throw error; 
    return false;
  }
};

// Helper function for badge text color
export const getContrastTextColor = (hexColor: string): string => {
  if (!hexColor) return '#000000'; // Default to black if no color
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000000' : '#FFFFFF'; // Return black for light backgrounds, white for dark
};
