

import type { Gift, User } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import { format } from 'date-fns';

const GIFTS_COLLECTION = 'clientGifts';

export const getGifts = async (): Promise<Gift[]> => {
  try {
    await ensureCollectionExistsV3(GIFTS_COLLECTION);
    const response = await fetchFromApiV3(`collections/${GIFTS_COLLECTION}/documents?limit=4444&orderBy=createdAt&direction=desc`);
    if (response && Array.isArray(response.documents)) {
        return response.documents.map((doc: { id: string, data: any }) => ({
            id: doc.id,
            ...doc.data
        } as Gift));
    }
    return [];
  } catch (error) {
    console.error("Error fetching gifts via API v3:", error);
    return [];
  }
};

export const getGiftById = async (id: string): Promise<Gift | null> => {
    if (!id) return null;
    try {
        const response = await fetchFromApiV3(`collections/${GIFTS_COLLECTION}/documents/${id}`);
        return { id: response.id, ...response.data } as Gift;
    } catch (error) {
        console.error(`Error fetching gift by ID ${id} via API v3:`, error);
        return null;
    }
};

export const addGift = async (giftData: Omit<Gift, 'id' | 'giftIdDisplay' | 'createdAt' | 'updatedAt' | 'giftItemName'>, currentUser: User): Promise<Gift | null> => {
  try {
    await ensureCollectionExistsV3(GIFTS_COLLECTION);
    
    const allGifts = await getGifts();
    const giftPrefix = `GFT-`;
    let maxId = 0;
    allGifts.forEach(gift => {
        if (gift.giftIdDisplay && gift.giftIdDisplay.startsWith(giftPrefix)) {
            const numPart = parseInt(gift.giftIdDisplay.substring(giftPrefix.length), 10);
            if (!isNaN(numPart) && numPart > maxId) {
                maxId = numPart;
            }
        }
    });
    const newSequence = maxId + 1;
    const giftIdDisplay = `${giftPrefix}${String(newSequence).padStart(4, '0')}`;

    const now = new Date().toISOString();
    const newGiftData: Omit<Gift, 'id'> = {
        ...(giftData as Omit<Gift, 'id' | 'giftIdDisplay' | 'createdAt' | 'updatedAt'>), // Type assertion to satisfy compiler
        giftIdDisplay,
        givenByUserId: currentUser.id,
        givenByUserName: currentUser.name,
        createdAt: now,
        updatedAt: now,
        giftItemName: giftData.giftItemNames.join(', '), // Keep a string version for compatibility
    };
    
    const newDoc = await fetchFromApiV3(`collections/${GIFTS_COLLECTION}/documents`, {
        method: 'POST',
        body: JSON.stringify({ data: newGiftData }),
    });

    return {
        id: newDoc.id,
        ...newDoc.data
    } as Gift;
  } catch (error) {
    console.error("Error adding gift via API v3:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateGift = async (id: string, updates: Partial<Omit<Gift, 'id' | 'createdAt'>>, currentUser: User): Promise<boolean> => {
  try {
    const existingGift = await getGiftById(id);
    if (!existingGift) {
        throw new Error(`Gift with ID ${id} not found.`);
    }

    const finalUpdates = { ...updates };
    // If giftItemNames is updated, also update the compatibility field giftItemName
    if (updates.giftItemNames) {
        finalUpdates.giftItemName = updates.giftItemNames.join(', ');
    }

    const finalData = {
        ...existingGift,
        ...finalUpdates,
        updatedAt: new Date().toISOString(),
        id: undefined, // Don't try to write the id field back into the data object
    };
    delete finalData.id;

    await fetchFromApiV3(`collections/${GIFTS_COLLECTION}/documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ data: finalData })
    });
    return true;
  } catch (error) {
    console.error(`Error updating gift ${id} via API v3:`, error);
    return false;
  }
};

export const deleteGift = async (id: string): Promise<boolean> => {
  try {
    await fetchFromApiV3(`collections/${GIFTS_COLLECTION}/documents/${id}`, {
        method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error(`Error deleting gift ${id} via API v3:`, error);
    return false;
  }
};
