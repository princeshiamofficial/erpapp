
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

export const getFeedbackForOrder = async (orderId: string): Promise<Feedback[]> => {
  if (!orderId) return [];
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    // V3 API search is broad, so we fetch and filter. A more specific API endpoint would be better.
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=9999`);
    if (response && Array.isArray(response.documents)) {
      return response.documents
        .map((doc: { id: string, data: any }) => ({ id: doc.id, ...doc.data } as Feedback))
        .filter((feedback: Feedback) => feedback.orderId === orderId);
    }
    return [];
  } catch (error) {
    console.error(`Error fetching feedback for order ${orderId} via API v3:`, error);
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

export async function deleteFeedbackAction(feedbackId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${feedbackId}`, {
        method: 'DELETE'
    });
    return { success: true };
  } catch (error) {
    console.error(`Error deleting feedback ${feedbackId} via API v3:`, error);
    if (error instanceof Error) {
        return { success: false, error: error.message };
    }
    return { success: false, error: 'An unknown error occurred during deletion.' };
  }
}
