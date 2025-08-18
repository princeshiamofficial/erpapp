
"use server";

import type { User } from '@/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { fetchFromApi, ensureCollectionExists } from '@/lib/api-helper';

export type CollectionId = 
  | 'employees'
  | 'globalSettings'
  | 'leads'
  | 'orders'
  | 'personalTransactions'
  | 'personalUserNotes'
  | 'projects'
  | 'purchaseRequests'
  | 'serviceLaminations'
  | 'serviceModels'
  | 'servicePaymentMethods'
  | 'customOrderStatuses';

export interface MigrationResult {
  success: boolean;
  collectionId: CollectionId;
  readCount: number;
  migratedCount: number;
  error?: string;
}

export async function migrateCollectionAction(
  collectionId: CollectionId,
  actingUser: User
): Promise<MigrationResult> {
  if (actingUser.role !== 'SYSTEM_ADMIN') {
    return { success: false, collectionId, readCount: 0, migratedCount: 0, error: 'Permission denied.' };
  }

  try {
    // 0. Ensure the collection exists in the API database before trying to write to it
    await ensureCollectionExists(collectionId);

    // 1. Read all documents from the source Firestore collection
    const sourceCollectionRef = collection(db, collectionId);
    const q = query(sourceCollectionRef);
    const snapshot = await getDocs(q);
    const sourceDocs = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));

    const readCount = sourceDocs.length;
    if (readCount === 0) {
      return { success: true, collectionId, readCount: 0, migratedCount: 0 };
    }

    // 2. Write each document to the new API database
    let migratedCount = 0;
    for (const doc of sourceDocs) {
      try {
        const payload = {
          data: doc.data
        };
        
        // POST to the collection endpoint to let the API generate a new document ID.
        // This is the key change to fix the issue where custom IDs are not allowed.
        await fetchFromApi(`collections/${collectionId}/documents`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        migratedCount++;
      } catch (apiError) {
        const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown API error';
        console.error(`Failed to migrate document from old ID ${doc.id} in collection ${collectionId}:`, errorMessage);
        // Stop on first error to prevent flooding with failures
        return { success: false, collectionId, readCount, migratedCount, error: `Failed on doc (old ID ${doc.id}): ${errorMessage}` };
      }
    }
    
    if (migratedCount < readCount) {
        return { success: false, collectionId, readCount, migratedCount, error: `Partial success. Migrated ${migratedCount} of ${readCount} documents.` };
    }

    return { success: true, collectionId, readCount, migratedCount };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during migration.";
    console.error(`Migration failed for collection ${collectionId}:`, error);
    return { success: false, collectionId, readCount: 0, migratedCount: 0, error: errorMessage };
  }
}
