
"use server";

import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import type { Feedback } from '@/types';

const COLLECTION_NAME = 'feedback';

export const getFeedback = async (): Promise<Feedback[]> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=9999&orderBy=submittedAt&direction=desc`);
    if (response && Array.isArray(response.documents)) {
        return response.documents.map((doc: { id: string, data: any }) => ({
            id: doc.id,
            ...doc.data
        } as Feedback));
    }
    return [];
  } catch (error) {
    console.error("Error fetching feedback via API v3:", error);
    return [];
  }
};

export const addFeedback = async (feedbackData: Omit<Feedback, 'id'>): Promise<boolean> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const payload = { data: feedbackData };
    await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return true;
  } catch (error) {
    console.error("Error adding feedback via API v3:", error);
    return false;
  }
};
