
import type { DistrictDataEntry } from '@/types';

// These values are based on the lead-service.ts file.
const API_URL = "https://colorhutbd.xyz/firestore/api/index.php";
const API_KEY = "44dc62ef42385a594d319d2c4261914655453b46640d23d9f13ac9a21f7357de";
const COLLECTION_NAME = 'districtData'; // The collection to store manual district data

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
        const errorText = await response.text();
        let errorData = { message: `API request failed with status ${response.status}. Response: ${errorText}` };
        try {
            // Try to parse as JSON, but if it fails, use the raw text.
            const parsedJson = JSON.parse(errorText);
            errorData.message = parsedJson.message || errorData.message;
        } catch (e) {
            // Not a JSON response, the raw text is the best we have.
        }
        console.error("API Error Response:", errorData.message);
        throw new Error(errorData.message);
    }

    return response.json();
}

const ensureCollectionExists = async () => {
    try {
        await fetchFromApi(`collections/${COLLECTION_NAME}`);
    } catch (error) {
        if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
            console.log(`Collection '${COLLECTION_NAME}' not found. Attempting to create it...`);
            try {
                await fetchFromApi('collections', {
                    method: 'POST',
                    body: JSON.stringify({ name: COLLECTION_NAME }),
                });
                console.log(`Collection '${COLLECTION_NAME}' created successfully.`);
            } catch (creationError) {
                console.error(`Failed to create collection '${COLLECTION_NAME}':`, creationError);
                throw new Error(`Could not create required collection '${COLLECTION_NAME}'.`);
            }
        } else {
            throw error;
        }
    }
};

// Get all manually added district data entries
export const getManualDistrictData = async (): Promise<DistrictDataEntry[]> => {
  try {
    await ensureCollectionExists();
    const response = await fetchFromApi(`collections/${COLLECTION_NAME}/documents?limit=500`);
    if (response && Array.isArray(response.documents)) {
        return response.documents.map((doc: { id: string, data: any }) => ({
            id: doc.id,
            ...doc.data
        } as DistrictDataEntry));
    }
    return [];
  } catch (error) {
    console.error("Error fetching manual district data via API:", error);
    return [];
  }
};

// Add a new manual district data entry
export const addManualDistrictData = async (data: Omit<DistrictDataEntry, 'id'>): Promise<DistrictDataEntry | null> => {
  try {
    await ensureCollectionExists();
    const payload = { data };
    const newDoc = await fetchFromApi(`collections/${COLLECTION_NAME}/documents`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    return {
        id: newDoc.id,
        ...newDoc.data
    } as DistrictDataEntry;
  } catch (error) {
    console.error("Error adding manual district data via API:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};
