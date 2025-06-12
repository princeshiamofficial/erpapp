
import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc as deleteFirestoreDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  writeBatch,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import type { Transaction, TransactionType, PersonalNote } from '@/types'; // Added PersonalNote
import { v4 as uuidv4 } from 'uuid';

const TRANSACTIONS_COLLECTION = 'personalTransactions';
const NOTES_COLLECTION = 'personalUserNotes'; // New collection for notes

// Add a new transaction
export async function addTransaction(
  userId: string,
  transactionData: {
    type: TransactionType;
    amount: number;
    category: string;
    description?: string | null;
    date: string;
    sentToUserId?: string | null;
    sentToUserName?: string | null;
    receivedFromUserId?: string | null;
    receivedFromUserName?: string | null;
  }
): Promise<Transaction | null> {
  if (!userId) {
    console.error("addTransaction: userId is required.");
    return null;
  }
  try {
    const newTransactionRef = doc(collection(db, TRANSACTIONS_COLLECTION));
    if (!newTransactionRef || !newTransactionRef.id) {
        console.error("addTransaction: Failed to generate a valid document reference for new transaction.");
        throw new Error("Failed to generate a valid document reference for new transaction.");
    }
    const newTransaction: Transaction = {
      id: newTransactionRef.id,
      userId,
      type: transactionData.type,
      amount: transactionData.amount,
      category: transactionData.category,
      description: transactionData.description || null,
      date: transactionData.date,
      createdAt: new Date().toISOString(),
      sentToUserId: transactionData.sentToUserId || null,
      sentToUserName: transactionData.sentToUserName || null,
      receivedFromUserId: transactionData.receivedFromUserId || null,
      receivedFromUserName: transactionData.receivedFromUserName || null,
    };
    await setDoc(newTransactionRef, newTransaction);
    return newTransaction;
  } catch (error) {
    console.error("Error adding transaction to Firestore:", error);
    if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
    } else {
        console.error("Non-Error object thrown:", error);
    }
    return null;
  }
}

// Get transactions for a specific user, ordered by date descending
export async function getTransactionsForUser(userId: string): Promise<Transaction[]> {
  if (!userId) {
    console.error("getTransactionsForUser: userId is required.");
    return [];
  }
  try {
    const transactionsCol = collection(db, TRANSACTIONS_COLLECTION);
    const q = query(transactionsCol, where("userId", "==", userId), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as Transaction));
  } catch (error) {
    console.error("Error fetching transactions for user:", error);
    return [];
  }
}

// Get all transactions (for System Admin), ordered by date descending
export async function getAllTransactions(): Promise<Transaction[]> {
  try {
    const transactionsCol = collection(db, TRANSACTIONS_COLLECTION);
    const q = query(transactionsCol, orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as Transaction));
  } catch (error) {
    console.error("Error fetching all transactions:", error);
    return [];
  }
}

// Get a single transaction by ID
export async function getTransactionById(transactionId: string): Promise<Transaction | null> {
  if (!transactionId) return null;
  const transactionDocRef = doc(db, TRANSACTIONS_COLLECTION, transactionId);
  try {
    const docSnap = await getDoc(transactionDocRef);
    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id } as Transaction;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching transaction by ID "${transactionId}":`, error);
    return null;
  }
}

// Update a transaction
export async function updateTransaction(
  transactionId: string,
  updates: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>
): Promise<boolean> {
  try {
    const transactionDoc = doc(db, TRANSACTIONS_COLLECTION, transactionId);
    const sanitizedUpdates = { ...updates };
    if (sanitizedUpdates.description === '') {
        sanitizedUpdates.description = null;
    }
    await updateDoc(transactionDoc, sanitizedUpdates);
    return true;
  } catch (error) {
    console.error("Error updating transaction:", error);
    return false;
  }
}

// Delete a transaction
export async function deleteTransaction(transactionId: string): Promise<boolean> {
  try {
    const transactionDoc = doc(db, TRANSACTIONS_COLLECTION, transactionId);
    await deleteFirestoreDoc(transactionDoc);
    return true;
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return false;
  }
}

// --- Personal Notes Functions ---

export async function addPersonalNote(
  noteData: Omit<PersonalNote, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PersonalNote | null> {
  if (!noteData.userId) {
    console.error("addPersonalNote: userId is required.");
    return null;
  }
  if (!noteData.title?.trim()) {
    console.error("addPersonalNote: title is required.");
    return null;
  }
  try {
    const newNoteRef = doc(collection(db, NOTES_COLLECTION));
    if (!newNoteRef || !newNoteRef.id) {
        console.error("addPersonalNote: Failed to generate a valid document reference for new note.");
        throw new Error("Failed to generate a valid document reference for new note.");
    }
    const now = new Date().toISOString();
    const newNote: PersonalNote = {
      id: newNoteRef.id,
      userId: noteData.userId,
      title: noteData.title.trim(),
      content: noteData.content?.trim() || "",
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(newNoteRef, newNote);
    return newNote;
  } catch (error) {
    console.error("Error adding personal note to Firestore:", error);
    return null;
  }
}

export async function getPersonalNotesForUser(userId: string): Promise<PersonalNote[]> {
  if (!userId) {
    console.error("getPersonalNotesForUser: userId is required.");
    return [];
  }
  try {
    const notesCol = collection(db, NOTES_COLLECTION);
    // Fetch notes and sort them by `updatedAt` in descending order in the application code.
    const q = query(notesCol, where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const notes = snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as PersonalNote));
    // Sort on the client-side (or server-side after fetching if this is a server action)
    return notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    console.error("Error fetching personal notes for user:", error);
    return [];
  }
}

export async function updatePersonalNote(
  noteId: string,
  updates: Partial<Omit<PersonalNote, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<boolean> {
  if (!updates.title?.trim()) {
    console.error("updatePersonalNote: title cannot be empty.");
    return false; // Or throw an error
  }
  try {
    const noteDocRef = doc(db, NOTES_COLLECTION, noteId);
    const dataToUpdate = {
      ...updates,
      title: updates.title.trim(),
      content: updates.content?.trim() || "",
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(noteDocRef, dataToUpdate);
    return true;
  } catch (error) {
    console.error("Error updating personal note:", error);
    return false;
  }
}

export async function deletePersonalNote(noteId: string, userIdVerifying: string): Promise<boolean> {
  try {
    const noteDocRef = doc(db, NOTES_COLLECTION, noteId);
    // Optional: Verify ownership before deleting if necessary, though server actions should handle this.
    // const noteDoc = await getDoc(noteDocRef);
    // if (noteDoc.exists() && noteDoc.data().userId === userIdVerifying) {
    await deleteFirestoreDoc(noteDocRef);
    return true;
    // }
    // return false; // If ownership check fails
  } catch (error) {
    console.error("Error deleting personal note:", error);
    return false;
  }
}

    