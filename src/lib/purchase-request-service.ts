

import type { PurchaseRequest } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

const COLLECTION_NAME = 'purchaseRequests';


export const getPurchaseRequests = async (): Promise<PurchaseRequest[]> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=200`);
    if (response && Array.isArray(response.documents)) {
        const requests = response.documents.map((doc: { id: string, data: any }) => ({
            id: doc.id,
            ...doc.data
        } as PurchaseRequest));
        // Sort by human-readable ID descending as the primary sort key
        return requests.sort((a, b) => {
            const idA = a.requestId ? parseInt(a.requestId.split('-')[1] || '0', 10) : 0;
            const idB = b.requestId ? parseInt(b.requestId.split('-')[1] || '0', 10) : 0;
            if (idB !== idA) return idB - idA;
            // Fallback to creation date if IDs are the same or malformed
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });
    }
    return [];
  } catch (error) {
    console.error("Error fetching purchase requests via API v3:", error);
    return [];
  }
};

export const getPurchaseRequestById = async (requestId: string): Promise<PurchaseRequest | null> => {
    if (!requestId) return null;
    try {
        const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${requestId}`);
        return { id: response.id, ...response.data } as PurchaseRequest;
    } catch (error) {
        console.error(`Error fetching purchase request by ID ${requestId} via API v3:`, error);
        return null;
    }
};

export const addPurchaseRequest = async (requestData: Omit<PurchaseRequest, 'id' | 'requestId' | 'createdAt' | 'updatedAt'>): Promise<PurchaseRequest | null> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    
    const allRequests = await getPurchaseRequests();
    let maxId = 0;
    allRequests.forEach(req => {
        if (req.requestId && req.requestId.startsWith('PR-')) {
            const numPart = parseInt(req.requestId.split('-')[1], 10);
            if (!isNaN(numPart) && numPart > maxId) {
                maxId = numPart;
            }
        }
    });
    const newRequestId = `PR-${String(maxId + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const newRequestData = {
        ...requestData,
        requestId: newRequestId,
        createdAt: now,
        updatedAt: now,
    };

    const newDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents`, {
        method: 'POST',
        body: JSON.stringify({ data: newRequestData }),
    });

    return {
        id: newDoc.id,
        ...newDoc.data
    } as PurchaseRequest;
  } catch (error) {
    console.error("Error adding purchase request via API v3:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updatePurchaseRequest = async (requestId: string, updates: Partial<Omit<PurchaseRequest, 'id'>>): Promise<boolean> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    
    const existingRequest = await getPurchaseRequestById(requestId);
    if (!existingRequest) {
        throw new Error("Purchase request not found.");
    }
    
    const finalUpdates = {
        ...updates,
        createdAt: existingRequest.createdAt, // Preserve original creation date
        updatedAt: new Date().toISOString()
    };
    
    const payload = {
        data: finalUpdates
    };
    
    await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
    return true;
  } catch (error) {
    console.error(`Error updating purchase request ${requestId} via API v3:`, error);
    return false;
  }
};

export const deletePurchaseRequest = async (requestId: string): Promise<boolean> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${requestId}`, {
        method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error(`Error deleting purchase request ${requestId} via API v3:`, error);
    return false;
  }
};
