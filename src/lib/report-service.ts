
import type { TrackingLink } from '@/types';

// These values would typically come from environment variables
const API_URL = "https://colorhutbd.xyz/firestore/api/index.php";
const API_KEY = "44dc62ef42385a594d319d2c4261914655453b46640d23d9f13ac9a21f7357de";
const ORDERS_COLLECTION_NAME = 'orders';

export interface ReportData {
  title: string;
  customContent: string | null;
  generatedAt: string;
  orders: TrackingLink[];
}

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

const ensureOrdersCollectionExists = async () => {
    try {
        await fetchFromApi(`collections/${ORDERS_COLLECTION_NAME}`);
    } catch (error) {
        if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
            console.log(`Collection '${ORDERS_COLLECTION_NAME}' not found. Attempting to create it...`);
            try {
                await fetchFromApi('collections', {
                    method: 'POST',
                    body: JSON.stringify({ name: ORDERS_COLLECTION_NAME }),
                });
                console.log(`Collection '${ORDERS_COLLECTION_NAME}' created successfully.`);
            } catch (creationError) {
                console.error(`Failed to create collection '${ORDERS_COLLECTION_NAME}':`, creationError);
                throw new Error(`Could not create required collection '${ORDERS_COLLECTION_NAME}'.`);
            }
        } else {
            throw error;
        }
    }
};

interface GetOrdersOptions {
  limit?: number;
  orderBy?: string;
  direction?: 'asc' | 'desc';
}

export const getOrdersForReport = async (options: GetOrdersOptions = {}): Promise<TrackingLink[]> => {
  const { limit = 50, orderBy = 'createdAt', direction = 'desc' } = options;
  try {
    await ensureOrdersCollectionExists();
    const response = await fetchFromApi(`collections/${ORDERS_COLLECTION_NAME}/documents?limit=${limit}&orderBy=${orderBy}&direction=${direction}`);
    
    if (response && Array.isArray(response.documents)) {
        return response.documents.map((doc: { id: string, data: any }) => ({
            id: doc.id,
            ...doc.data
        } as TrackingLink));
    }
    return [];
  } catch (error) {
    console.error("Error fetching orders for report via API:", error);
    return [];
  }
};

export const addTask = async (taskData: Omit<TrackingLink, 'id'>): Promise<TrackingLink | null> => {
  try {
    await ensureOrdersCollectionExists();
    // In this context, a "task" is an "order". We use the same collection.
    // The ID generation logic would be similar to addOrder in order-service.ts
    // For simplicity here, we'll let the API assign an ID.
    const newDoc = await fetchFromApi(`collections/${ORDERS_COLLECTION_NAME}/documents`, {
        method: 'POST',
        body: JSON.stringify({ data: taskData }),
    });

    return {
        id: newDoc.id,
        ...newDoc.data
    } as TrackingLink;
  } catch (error) {
    console.error("Error adding task (order) via API:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const getTaskById = async (taskId: string): Promise<TrackingLink | null> => {
    if (!taskId) return null;
    try {
        const response = await fetchFromApi(`collections/${ORDERS_COLLECTION_NAME}/documents/${taskId}`);
        return { id: response.id, ...response.data } as TrackingLink;
    } catch (error) {
        console.error(`Error fetching task (order) by ID ${taskId} via API:`, error);
        return null;
    }
};

export const updateTask = async (taskId: string, updates: Partial<Omit<TrackingLink, 'id'>>): Promise<boolean> => {
    try {
        await ensureOrdersCollectionExists();
        
        // Fetch the existing document first to ensure we don't overwrite data.
        const existingTask = await getTaskById(taskId);
        if (!existingTask) {
            throw new Error(`Task with ID ${taskId} not found.`);
        }
        
        // Merge the updates with the existing data.
        const finalData = {
            ...existingTask,
            ...updates,
            id: undefined, // Don't write the id field back into the data object
        };
        delete finalData.id;

        await fetchFromApi(`collections/${ORDERS_COLLECTION_NAME}/documents/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify({ data: finalData })
        });
        return true;
    } catch (error) {
        console.error(`Error updating task (order) ${taskId} via API:`, error);
        return false;
    }
};

export const deleteDoc = async (orderId: string): Promise<boolean> => {
  try {
    await ensureOrdersCollectionExists();
    await fetchFromApi(`collections/${ORDERS_COLLECTION_NAME}/documents/${orderId}`, {
        method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error(`Error deleting document ${orderId} via API:`, error);
    return false;
  }
};
