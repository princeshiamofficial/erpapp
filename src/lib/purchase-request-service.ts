
import type { PurchaseRequest } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const API_URL = "https://colorhutbd.xyz/firestore/api/index.php";
const API_KEY = "44dc62ef42385a594d319d2c4261914655453b46640d23d9f13ac9a21f7357de";
const COLLECTION_NAME = 'purchaseRequests';

async function fetchFromApi(endpoint: string, options: RequestInit = {}) {
    if (!API_URL || !API_KEY) {
        throw new Error("API URL or API Key is not configured.");
    }
    const headers = {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY,
        ...options.headers,
    };
    const response = await fetch(`${API_URL}/${endpoint}`, { ...options, headers });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to decode API error response.' }));
        console.error("API Error Response:", errorData);
        throw new Error(errorData.message || `API request failed with status ${response.status}`);
    }
    return response.json();
}

const ensureCollectionExists = async () => {
    try {
        await fetchFromApi(`collections/${COLLECTION_NAME}`);
    } catch (error) {
        if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
            await fetchFromApi('collections', {
                method: 'POST',
                body: JSON.stringify({ name: COLLECTION_NAME }),
            });
        } else {
            throw error;
        }
    }
};

export const getPurchaseRequests = async (): Promise<PurchaseRequest[]> => {
  try {
    await ensureCollectionExists();
    const response = await fetchFromApi(`collections/${COLLECTION_NAME}/documents?limit=200`);
    if (response && Array.isArray(response.documents)) {
        const requests = response.documents.map((doc: { id: string, data: any }) => ({
            id: doc.id,
            ...doc.data
        } as PurchaseRequest));
        return requests.sort((a, b) => {
            const idA = a.requestId ? parseInt(a.requestId.split('-')[1] || '0', 10) : 0;
            const idB = b.requestId ? parseInt(b.requestId.split('-')[1] || '0', 10) : 0;
            if (idB !== idA) return idB - idA;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }
    return [];
  } catch (error) {
    console.error("Error fetching purchase requests via API:", error);
    return [];
  }
};

export const getPurchaseRequestById = async (requestId: string): Promise<PurchaseRequest | null> => {
    if (!requestId) return null;
    try {
        const response = await fetchFromApi(`collections/${COLLECTION_NAME}/documents/${requestId}`);
        return { id: response.id, ...response.data } as PurchaseRequest;
    } catch (error) {
        console.error(`Error fetching purchase request by ID ${requestId} via API:`, error);
        return null;
    }
};

export const addPurchaseRequest = async (requestData: Omit<PurchaseRequest, 'id' | 'requestId'>): Promise<PurchaseRequest | null> => {
  try {
    await ensureCollectionExists();
    
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

    const newRequestData = {
        ...requestData,
        requestId: newRequestId,
    };

    const newDoc = await fetchFromApi(`collections/${COLLECTION_NAME}/documents`, {
        method: 'POST',
        body: JSON.stringify({ data: newRequestData }),
    });

    return {
        id: newDoc.id,
        ...newDoc.data
    } as PurchaseRequest;
  } catch (error) {
    console.error("Error adding purchase request via API:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updatePurchaseRequest = async (requestId: string, updates: Partial<Omit<PurchaseRequest, 'id'>>): Promise<boolean> => {
  try {
    await ensureCollectionExists();
    const payload = {
        data: updates
    };
    await fetchFromApi(`collections/${COLLECTION_NAME}/documents/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
    return true;
  } catch (error) {
    console.error(`Error updating purchase request ${requestId} via API:`, error);
    return false;
  }
};

export const deletePurchaseRequest = async (requestId: string): Promise<boolean> => {
  try {
    await ensureCollectionExists();
    await fetchFromApi(`collections/${COLLECTION_NAME}/documents/${requestId}`, {
        method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error(`Error deleting purchase request ${requestId} via API:`, error);
    return false;
  }
};
