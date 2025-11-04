

import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import type { Transaction, TransactionType, PersonalNote } from '@/types';
import { format, parseISO } from 'date-fns';

const getFinanceCollectionName = (date: Date) => `finance-${format(date, 'MM-yyyy')}`;

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
    const transactionDate = parseISO(transactionData.date);
    const collectionName = getFinanceCollectionName(transactionDate);
    await ensureCollectionExistsV3(collectionName);
    
    const dataWithUser = {
      ...transactionData,
      userId,
      createdAt: new Date().toISOString()
    };
    const newDoc = await fetchFromApiV3(`collections/${collectionName}/documents`, {
        method: 'POST',
        body: JSON.stringify({ data: dataWithUser }),
    });

    return { id: newDoc.id, ...newDoc.data } as Transaction;
  } catch (error) {
    console.error("Error adding transaction via API v3:", error);
    return null;
  }
}

async function fetchTransactionsFromMonths(userId: string | null, monthsToFetch: Date[]): Promise<Transaction[]> {
    const allTransactions: Transaction[] = [];

    for (const month of monthsToFetch) {
        const collectionName = getFinanceCollectionName(month);
        try {
            await ensureCollectionExistsV3(collectionName);
            
            let endpoint = `collections/${collectionName}/documents?limit=9999&orderBy=date&direction=desc`;
            if (userId) {
                // The V3 API helper doesn't support filters this way. We'll filter client-side.
            }
            const response = await fetchFromApiV3(endpoint);

            if (response && Array.isArray(response.documents)) {
                const transactionsFromMonth = response.documents
                    .map((doc: { id: string, data: any }) => ({ id: doc.id, ...doc.data } as Transaction))
                    .filter(t => userId ? t.userId === userId : true);
                
                allTransactions.push(...transactionsFromMonth);
            }
        } catch (error) {
            if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
                // It's okay if a month's collection doesn't exist yet.
                continue;
            }
            console.error(`Error fetching transactions from ${collectionName}:`, error);
        }
    }
    return allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const getMonthsToFetch = (): Date[] => {
    const months: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 24; i++) { // Fetch last 24 months of data
        months.push(new Date(today.getFullYear(), today.getMonth() - i, 1));
    }
    return months;
};


export async function getTransactionsForUser(userId: string): Promise<Transaction[]> {
  if (!userId) return [];
  const months = getMonthsToFetch();
  return fetchTransactionsFromMonths(userId, months);
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const months = getMonthsToFetch();
  return fetchTransactionsFromMonths(null, months);
}

export async function getTransactionById(transactionId: string): Promise<Transaction | null> {
  if (!transactionId) return null;
  
  // This is a limitation: we don't know the date from the ID alone.
  // We'll have to search recent months.
  const months = getMonthsToFetch();
  for (const month of months) {
      const collectionName = getFinanceCollectionName(month);
      try {
          const doc = await fetchFromApiV3(`collections/${collectionName}/documents/${transactionId}`);
          if (doc && doc.data) {
              return { id: doc.id, ...doc.data } as Transaction;
          }
      } catch (error) {
           if (error instanceof Error && !error.message.toLowerCase().includes('not found')) {
             console.error(`Error searching for transaction ${transactionId} in ${collectionName}:`, error);
           }
      }
  }
  console.error(`Transaction ${transactionId} not found in any of the searched months.`);
  return null;
}

export async function updateTransaction(
  transactionId: string,
  updates: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>
): Promise<boolean> {
  const existingDoc = await getTransactionById(transactionId);
  if (!existingDoc) {
      throw new Error(`Transaction with ID ${transactionId} not found for update.`);
  }

  const transactionDate = parseISO(updates.date || existingDoc.date);
  const collectionName = getFinanceCollectionName(transactionDate);
  
  try {
    const updatedData = { ...existingDoc, ...updates };
    delete (updatedData as any).id; // Ensure ID is not in the data payload for update

    const payload = { data: updatedData };
    await fetchFromApiV3(`collections/${collectionName}/documents/${transactionId}`, {
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
  const existingDoc = await getTransactionById(transactionId);
  if (!existingDoc) {
    console.warn(`Transaction ${transactionId} not found for deletion. Assuming already deleted.`);
    return true;
  }
  const transactionDate = parseISO(existingDoc.date);
  const collectionName = getFinanceCollectionName(transactionDate);
  try {
    await fetchFromApiV3(`collections/${collectionName}/documents/${transactionId}`, {
        method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error("Error deleting transaction via API v3:", error);
    return false;
  }
}

// NOTE: Personal Notes are not date-based, so they remain in a single collection per user.
// To avoid complexity, their service functions are kept as is.

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
    // Optional: Verify if the user owns the note before deleting, if needed.
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
