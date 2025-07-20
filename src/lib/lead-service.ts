
import type { Lead } from '@/types';

// These would be set in your environment variables (e.g., .env.local)
const API_URL = process.env.NEXT_PUBLIC_LEADS_API_URL;
const API_KEY = process.env.NEXT_PUBLIC_LEADS_API_KEY;
const COLLECTION_NAME = 'leads'; // The collection to store leads in

async function fetchFromApi(endpoint: string, options: RequestInit = {}) {
    if (!API_URL || !API_KEY) {
        throw new Error("API URL or API Key is not configured in environment variables.");
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

// Get all leads
export const getLeads = async (): Promise<Lead[]> => {
  try {
    const response = await fetchFromApi(`collections/${COLLECTION_NAME}/documents?limit=200`);
    if (response && Array.isArray(response.documents)) {
        // The API returns documents as { id: '...', data: { ... } }
        // We need to transform it into our Lead type { id: '...', ...data }
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

// Add a new lead
export const addLead = async (leadData: Omit<Lead, 'id'>): Promise<Lead | null> => {
  try {
    // The API expects the lead data to be nested under a "data" key.
    // The API will auto-generate an ID if we don't provide one.
    const payload = {
        data: leadData
    };
    const newDoc = await fetchFromApi(`collections/${COLLECTION_NAME}/documents`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    // The API returns the created document, so we transform it to our Lead type
    return {
        id: newDoc.id,
        ...newDoc.data
    } as Lead;
  } catch (error) {
    console.error("Error adding lead via API:", error);
    return null;
  }
};

// Update a lead
export const updateLead = async (leadId: string, updates: Partial<Omit<Lead, 'id'>>): Promise<boolean> => {
  try {
    // The API expects the updated data to be nested under a "data" key.
    const payload = {
        data: updates
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
    await fetchFromApi(`collections/${COLLECTION_NAME}/documents/${leadId}`, {
        method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error(`Error deleting lead ${leadId} via API:`, error);
    return false;
  }
};

