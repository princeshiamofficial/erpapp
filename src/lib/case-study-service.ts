

import type { CaseStudyMessage } from '@/types';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

const getCollectionNameForTeam = (team: 'CR' | 'DR' | 'LR'): string => {
  switch (team) {
    case 'CR': return 'CRcase';
    case 'DR': return 'DRcase';
    case 'LR': return 'LRcase';
    default: throw new Error(`Invalid team provided: ${team}`);
  }
};

export const getMessages = async (team: 'CR' | 'DR' | 'LR'): Promise<CaseStudyMessage[]> => {
  const collectionName = getCollectionNameForTeam(team);
  try {
    await ensureCollectionExistsV3(collectionName);
    const response = await fetchFromApiV3(`collections/${collectionName}/documents?limit=9999&orderBy=timestamp&direction=asc`);
    if (response && Array.isArray(response.documents)) {
      return response.documents.map((doc: { id: string, data: any }) => ({
        id: doc.id,
        ...doc.data,
      } as CaseStudyMessage));
    }
    return [];
  } catch (error) {
    console.error(`Error fetching messages for ${team} from ${collectionName} via API v3:`, error);
    return [];
  }
};

export const addMessage = async (team: 'CR' | 'DR' | 'LR', messageData: Omit<CaseStudyMessage, 'id' | 'timestamp'>): Promise<CaseStudyMessage | null> => {
  const collectionName = getCollectionNameForTeam(team);
  try {
    await ensureCollectionExistsV3(collectionName);
    const dataWithTimestamp = {
      ...messageData,
      timestamp: new Date().toISOString(),
    };
    const payload = { data: dataWithTimestamp };
    const newDoc = await fetchFromApiV3(`collections/${collectionName}/documents`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { id: newDoc.id, ...newDoc.data };
  } catch (error) {
    console.error(`Error adding message to ${collectionName} via API v3:`, error);
    if (error instanceof Error) throw error;
    return null;
  }
};
