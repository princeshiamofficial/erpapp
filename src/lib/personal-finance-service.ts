
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
  setDoc, // Added setDoc to imports
} from 'firebase/firestore';
import type { Transaction, TransactionType } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const TRANSACTIONS_COLLECTION = 'personalTransactions';

// Add a new transaction
export async function addTransaction(
  userId: string,
  transactionData: {
    type: TransactionType;
    amount: number;
    category: string;
    description?: string | null; // Allow null
    date: string; // Expect ISO string date from client
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

// Update a transaction
export async function updateTransaction(
  transactionId: string,
  updates: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>
): Promise<boolean> {
  try {
    const transactionDoc = doc(db, TRANSACTIONS_COLLECTION, transactionId);
    // Ensure description is explicitly set to null if empty string, otherwise keep as is
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

// --- Personal Notes Service (Basic implementation for now) ---
// This can be expanded later. For now, just structure placeholders.
// const NOTES_COLLECTION = 'personalNotes';
// export async function addNote(...) {}
// export async function getNotesForUser(...) {}
// export async function updateNote(...) {}
// export async function deleteNote(...) {}
