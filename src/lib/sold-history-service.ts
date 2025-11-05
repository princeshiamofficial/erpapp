
"use server";

import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

const COLLECTION_NAME = 'soldhistory';

export const getSoldHistory = async (): Promise<any[]> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=9999`);
    if (response && Array.isArray(response.documents)) {
      return response.documents.map((doc: { id: string, data: any }) => ({
        id: doc.id,
        ...doc.data
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching sold history via API v3:", error);
    return [];
  }
};
