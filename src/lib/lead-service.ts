
import type { Lead } from '@/types';

// These values are now hardcoded as per your request.
const API_URL = "https://colorhutbd.xyz/firestore/api/index.php";
const API_KEY = "44dc62ef42385a594d319d2c4261914655453b46640d23d9f13ac9a21f7357de";
const COLLECTION_NAME = 'leads'; // The collection to store leads in

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

// New function to ensure the collection exists
const ensureCollectionExists = async () => {
    try {
        // First, try to get info about the collection. This is a lightweight check.
        await fetchFromApi(`collections/${COLLECTION_NAME}`);
    } catch (error) {
        // If the error indicates "not found", we create it.
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
            // Re-throw other errors (e.g., auth errors, server down)
            throw error;
        }
    }
};

// Get all leads
export const getLeads = async (): Promise<Lead[]> => {
  try {
    await ensureCollectionExists(); // Ensure collection exists before fetching
    const response = await fetchFromApi(`collections/${COLLECTION_NAME}/documents?limit=200`);
    if (response && Array.isArray(response.documents)) {
        return response.documents.map((doc: { id: string, data: any }) => ({
            id: doc.id,
            ...doc.data
        } as Lead));
    }
    return [];
  } catch (error) {
    console.error("Error fetching leads via API:", error);
    return [];
  }
};

// Get a single lead by ID
export const getLeadById = async (leadId: string): Promise<Lead | null> => {
    if (!leadId) return null;
    try {
        const doc = await fetchFromApi(`collections/${COLLECTION_NAME}/documents/${leadId}`);
        return { id: doc.id, ...doc.data } as Lead;
    } catch (error) {
        console.error(`Error fetching lead by ID ${leadId} via API:`, error);
        return null;
    }
};


// Add a new lead
export const addLead = async (leadData: Omit<Lead, 'id'>): Promise<Lead | null> => {
  try {
    await ensureCollectionExists(); // Ensure collection exists before adding
    const dataWithStatus = {
        ...leadData,
    };
    const payload = {
        data: dataWithStatus
    };
    const newDoc = await fetchFromApi(`collections/${COLLECTION_NAME}/documents`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    return {
        id: newDoc.id,
        ...newDoc.data
    } as Lead;
  } catch (error) {
    console.error("Error adding lead via API:", error);
    if (error instanceof Error) throw error; 
    return null;
  }
};

// Update a lead
export const updateLead = async (leadId: string, updates: Partial<Omit<Lead, 'id'>>): Promise<boolean> => {
  try {
    await ensureCollectionExists();
    
    // First, fetch the existing lead to preserve creator info
    const existingLead = await getLeadById(leadId);
    if (!existingLead) {
        throw new Error("Lead to update not found.");
    }
    
    // Merge updates with existing data
    const finalData = {
        ...existingLead,
        ...updates,
        id: undefined, // Don't try to write the id field back into the data object
    };
    delete finalData.id;

    const payload = {
        data: finalData
    };

    await fetchFromApi(`collections/${COLLECTION_NAME}/documents/${leadId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
    return true;
  } catch (error) {
    console.error(`Error updating lead ${leadId} via API:`, error);
    return false;
  }
};

// Delete a lead
export const deleteLead = async (leadId: string): Promise<boolean> => {
  try {
    await ensureCollectionExists(); // Ensure collection exists before deleting
    await fetchFromApi(`collections/${COLLECTION_NAME}/documents/${leadId}`, {
        method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error(`Error deleting lead ${leadId} via API:`, error);
    return false;
  }
};
