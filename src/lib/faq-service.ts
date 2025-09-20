
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
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=9999&orderBy=createdAt&direction=desc`);
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
