
"use server";

import type { User } from '@/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { fetchFromApi } from '@/lib/api-helper';

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
          // The API expects the data under a 'data' key and the id at the top level
          id: doc.id,
          data: doc.data
        };
        
        // Use a PUT request with the original ID to preserve it.
        // This makes it an upsert operation.
        await fetchFromApi(`collections/${collectionId}/documents/${doc.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        migratedCount++;
      } catch (apiError) {
        const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown API error';
        console.error(`Failed to migrate document ${doc.id} in collection ${collectionId}:`, errorMessage);
        // Optionally, continue migrating other documents or stop on first error
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
