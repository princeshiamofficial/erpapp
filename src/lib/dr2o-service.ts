

import type { Dr2oEntry, UserRole } from '@/types';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

const getCollectionNameForTeam = (team: 'CR' | 'DR' | 'LR'): string => {
    switch (team) {
        case 'CR': return 'CRworkflow';
        case 'DR': return 'DRworkflow';
        case 'LR': return 'LRworkflow';
        default: return 'workflow'; // Fallback
    }
}

export const getDr2oEntries = async (team: 'CR' | 'DR' | 'LR' = 'CR'): Promise<Dr2oEntry[]> => {
  const collectionName = getCollectionNameForTeam(team);
  try {
    await ensureCollectionExistsV3(collectionName);
    const response = await fetchFromApiV3(`collections/${collectionName}/documents?limit=9999`);
    if (response && Array.isArray(response.documents)) {
      return response.documents.map((doc: { id: string, data: any }) => ({
        id: doc.id,
        ...doc.data,
      }));
    }
    return [];
  } catch (error) {
    console.error(`Error fetching DR 2.O entries for ${team} from ${collectionName} via API v3:`, error);
    return [];
  }
};

export const addDr2oEntry = async (entryData: Omit<Dr2oEntry, 'id'>, team: 'CR' | 'DR' | 'LR' = 'CR'): Promise<Dr2oEntry | null> => {
  const collectionName = getCollectionNameForTeam(team);
  try {
    await ensureCollectionExistsV3(collectionName);
    const payload = { data: entryData };
    const newDoc = await fetchFromApiV3(`collections/${collectionName}/documents`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return { id: newDoc.id, ...newDoc.data };
  } catch (error) {
    console.error(`Error adding DR 2.O entry to ${collectionName} via API v3:`, error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateDr2oEntry = async (id: string, updates: Partial<Dr2oEntry>, team: 'CR' | 'DR' | 'LR' = 'CR'): Promise<boolean> => {
  const collectionName = getCollectionNameForTeam(team);
  try {
    await ensureCollectionExistsV3(collectionName);
    const existingDoc = await fetchFromApiV3(`collections/${collectionName}/documents/${id}`);
    const finalData = { ...existingDoc.data, ...updates };

    await fetchFromApiV3(`collections/${collectionName}/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ data: finalData }),
    });
    return true;
  } catch (error) {
    console.error(`Error updating DR 2.O entry ${id} in ${collectionName} via API v3:`, error);
    return false;
  }
};

export const deleteDr2oEntry = async (id: string, team: 'CR' | 'DR' | 'LR'): Promise<boolean> => {
  const collectionName = getCollectionNameForTeam(team);
  try {
    await fetchFromApiV3(`collections/${collectionName}/documents/${id}`, {
      method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error(`Error deleting entry ${id} from ${collectionName} via API v3:`, error);
    return false;
  }
};
