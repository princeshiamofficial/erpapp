

"use server";

import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import type { UserRole } from '@/types';

const COLLECTION_NAME = 'dialogue'; // Changed from 'faqs'

export interface Faq {
  id: string;
  question: string;
  answer: string;
  role: UserRole | 'ALL';
  createdAt: string; // ISO string
}

export const getFaqs = async (): Promise<Faq[]> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=4444&orderBy=createdAt&direction=desc`);
    if (response && Array.isArray(response.documents)) {
      return response.documents.map((doc: { id: string, data: any }) => ({
        id: doc.id,
        ...doc.data
      } as Faq));
    }
    return [];
  } catch (error) {
    console.error("Error fetching FAQs via API v3:", error);
    return [];
  }
};

export const addFaq = async (faqData: Omit<Faq, 'id' | 'createdAt'>): Promise<Faq | null> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const dataWithTimestamp = {
        ...faqData,
        createdAt: new Date().toISOString(),
    };
    const newDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents`, {
        method: 'POST',
        body: JSON.stringify({ data: dataWithTimestamp }),
    });

    return {
        id: newDoc.id,
        ...newDoc.data
    } as Faq;
  } catch (error) {
    console.error("Error adding FAQ via API v3:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateFaq = async (faqId: string, updates: Partial<Omit<Faq, 'id' | 'createdAt'>>): Promise<boolean> => {
  try {
    const existingDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${faqId}`);
    if (!existingDoc) {
      throw new Error("FAQ not found for update.");
    }
    const finalData = { ...existingDoc.data, ...updates };

    await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${faqId}`, {
        method: 'PUT',
        body: JSON.stringify({ data: finalData })
    });
    return true;
  } catch (error) {
    console.error(`Error updating FAQ ${faqId} via API v3:`, error);
    return false;
  }
};


export const deleteFaq = async (faqId: string): Promise<boolean> => {
  try {
    await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${faqId}`, {
        method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error(`Error deleting FAQ ${faqId} via API v3:`, error);
    return false;
  }
};
