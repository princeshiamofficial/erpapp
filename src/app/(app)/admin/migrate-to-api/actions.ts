
"use server";

import type { User } from '@/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { fetchFromApi, ensureCollectionExists } from '@/lib/api-helper';

export type CollectionId = 
  | 'customOrderStatuses'
  | 'employees'
  | 'globalSettings'
  | 'leads'
  | 'orders'
  | 'personalTransactions'
  | 'projects'
  | 'purchaseRequests'
  | 'serviceLaminations'
  | 'serviceModels'
  | 'servicePaymentMethods'
  | 'users';


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
    await ensureCollectionExists(collectionId);

    const sourceCollectionRef = collection(db, collectionId);
    const q = query(sourceCollectionRef);
    const snapshot = await getDocs(q);
    
    const sourceDocs = snapshot.docs;

    const readCount = sourceDocs.length;
    if (readCount === 0) {
      return { success: true, collectionId, readCount: 0, migratedCount: 0, error: "No documents to migrate." };
    }

    let migratedCount = 0;
    for (const doc of sourceDocs) {
      try {
        // Correctly construct the payload with the original ID preserved
        const dataToMigrate = {
            ...doc.data(),
            firestoreId: doc.id // Save the original Firestore ID into a new field
        };
        
        const payload = {
          data: dataToMigrate
        };
        
        await fetchFromApi(`collections/${collectionId}/documents`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        migratedCount++;
      } catch (apiError) {
        const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown API error';
        console.error(`Failed to migrate document with original ID ${doc.id} in collection ${collectionId}:`, errorMessage);
        return { success: false, collectionId, readCount, migratedCount, error: `Failed on doc (original ID ${doc.id}): ${errorMessage}` };
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
