
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
