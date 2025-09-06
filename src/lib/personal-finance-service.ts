

import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import type { Transaction, TransactionType, PersonalNote } from '@/types';

const TRANSACTIONS_COLLECTION = 'personalTransactions';
const NOTES_COLLECTION = 'personalUserNotes';

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
    documentUrl?: string | null;
  }
): Promise<Transaction | null> {
  if (!userId) {
    console.error("addTransaction: userId is required.");
    return null;
  }
  try {
    await ensureCollectionExistsV3(TRANSACTIONS_COLLECTION);
    const dataWithUser = {
      ...transactionData,
      userId,
      createdAt: new Date().toISOString()
    };
    const newDoc = await fetchFromApiV3(`collections/${TRANSACTIONS_COLLECTION}/documents`, {
        method: 'POST',
        body: JSON.stringify({ data: dataWithUser }),
    });

    return { id: newDoc.id, ...newDoc.data } as Transaction;
  } catch (error) {
    console.error("Error adding transaction via API v3:", error);
    return null;
  }
}

export async function getTransactionsForUser(userId: string): Promise<Transaction[]> {
  if (!userId) return [];
  try {
    await ensureCollectionExistsV3(TRANSACTIONS_COLLECTION);
    const response = await fetchFromApiV3(`collections/${TRANSACTIONS_COLLECTION}/documents?filters[userId][is]=${userId}&orderBy=date&direction=desc&limit=9999`);
    if (response && Array.isArray(response.documents)) {
        return response.documents.map((doc: { id: string, data: any }) => ({ id: doc.id, ...doc.data } as Transaction));
    }
    return [];
  } catch (error) {
    console.error("Error fetching user transactions via API v3:", error);
    return [];
  }
}

export async function getAllTransactions(): Promise<Transaction[]> {
  try {
    await ensureCollectionExistsV3(TRANSACTIONS_COLLECTION);
    const response = await fetchFromApiV3(`collections/${TRANSACTIONS_COLLECTION}/documents?orderBy=date&direction=desc&limit=9999`);
    if (response && Array.isArray(response.documents)) {
        return response.documents.map((doc: { id: string, data: any }) => ({ id: doc.id, ...doc.data } as Transaction));
    }
    return [];
  } catch (error) {
    console.error("Error fetching all transactions via API v3:", error);
    return [];
  }
}

export async function getTransactionById(transactionId: string): Promise<Transaction | null> {
  if (!transactionId) return null;
  try {
    const doc = await fetchFromApiV3(`collections/${TRANSACTIONS_COLLECTION}/documents/${transactionId}`);
    return { id: doc.id, ...doc.data } as Transaction;
  } catch (error) {
    console.error(`Error fetching transaction ${transactionId} via API v3:`, error);
    return null;
  }
}

export async function updateTransaction(
  transactionId: string,
  updates: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>
): Promise<boolean> {
  try {
    const existingDoc = await fetchFromApiV3(`collections/${TRANSACTIONS_COLLECTION}/documents/${transactionId}`);
    const updatedData = { ...existingDoc.data, ...updates };

    const payload = { data: updatedData };
    await fetchFromApiV3(`collections/${TRANSACTIONS_COLLECTION}/documents/${transactionId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
    return true;
  } catch (error) {
    console.error("Error updating transaction via API v3:", error);
    return false;
  }
}

export async function deleteTransaction(transactionId: string): Promise<boolean> {
  try {
    await fetchFromApiV3(`collections/${TRANSACTIONS_COLLECTION}/documents/${transactionId}`, {
        method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error("Error deleting transaction via API v3:", error);
    return false;
  }
}

export async function addPersonalNote(
  noteData: Omit<PersonalNote, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PersonalNote | null> {
  if (!noteData.userId || !noteData.title?.trim()) {
    console.error("User ID and title are required for notes.");
    return null;
  }
  try {
    await ensureCollectionExistsV3(NOTES_COLLECTION);
    const now = new Date().toISOString();
    const dataToSave = {
      ...noteData,
      createdAt: now,
      updatedAt: now,
    };
    const newDoc = await fetchFromApiV3(`collections/${NOTES_COLLECTION}/documents`, {
        method: 'POST',
        body: JSON.stringify({ data: dataToSave }),
    });
    return { id: newDoc.id, ...newDoc.data } as PersonalNote;
  } catch (error) {
    console.error("Error adding personal note via API v3:", error);
    return null;
  }
}

export async function getPersonalNotesForUser(userId: string): Promise<PersonalNote[]> {
  if (!userId) return [];
  try {
    await ensureCollectionExistsV3(NOTES_COLLECTION);
    const response = await fetchFromApiV3(`collections/${NOTES_COLLECTION}/documents?filters[userId][is]=${userId}&orderBy=updatedAt&direction=desc&limit=9999`);
    if (response && Array.isArray(response.documents)) {
      return response.documents.map((doc: { id: string, data: any }) => ({ id: doc.id, ...doc.data } as PersonalNote));
    }
    return [];
  } catch (error) {
    console.error("Error fetching personal notes via API v3:", error);
    return [];
  }
}

export async function updatePersonalNote(
  noteId: string,
  updates: Partial<Omit<PersonalNote, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<boolean> {
  if (!updates.title?.trim()) {
    console.error("Note title cannot be empty.");
    return false;
  }
  try {
    const existingDoc = await fetchFromApiV3(`collections/${NOTES_COLLECTION}/documents/${noteId}`);
    const updatedData = {
      ...existingDoc.data,
      ...updates,
      title: updates.title.trim(),
      content: updates.content?.trim() || "",
      updatedAt: new Date().toISOString(),
    };
    await fetchFromApiV3(`collections/${NOTES_COLLECTION}/documents/${noteId}`, {
        method: 'PUT',
        body: JSON.stringify({ data: updatedData })
    });
    return true;
  } catch (error) {
    console.error("Error updating personal note via API v3:", error);
    return false;
  }
}

export async function deletePersonalNote(noteId: string, userIdVerifying: string): Promise<boolean> {
  try {
    // Ownership check can be done here if needed
    // For now, assuming deletion is allowed if the action is called.
    await fetchFromApiV3(`collections/${NOTES_COLLECTION}/documents/${noteId}`, {
        method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error("Error deleting personal note via API v3:", error);
    return false;
  }
}
