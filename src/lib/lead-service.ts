
import type { Lead } from '@/types';
import { fetchFromApi, ensureCollectionExists } from './api-helper';

const COLLECTION_NAME = 'leads';

// Get all leads with pagination handling
export const getLeads = async (): Promise<Lead[]> => {
  try {
    await ensureCollectionExists(COLLECTION_NAME);
    
    const allLeads: Lead[] = [];
    let offset = 0;
    const limit = 500; // Fetch in batches of 500
    let hasMore = true;

    while (hasMore) {
      const response = await fetchFromApi(`collections/${COLLECTION_NAME}/documents?limit=${limit}&offset=${offset}&orderBy=date&direction=desc`);
      
      if (response && Array.isArray(response.documents)) {
        const leadsFromPage = response.documents.map((doc: { id: string, data: any }) => ({
            id: doc.id,
            ...doc.data
        } as Lead));
        allLeads.push(...leadsFromPage);
        
        hasMore = response.pagination?.has_more ?? false;
        offset += limit;
      } else {
        hasMore = false;
      }
    }
    
    return allLeads;
  } catch (error) {
    console.error("Error fetching leads via API with pagination:", error);
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
    await ensureCollectionExists(COLLECTION_NAME); 
    const dataWithStatus = {
        ...leadData,
        status: 'New Lead', // Set default status for new leads
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
    await ensureCollectionExists(COLLECTION_NAME);
    
    const existingLead = await getLeadById(leadId);
    if (!existingLead) {
        throw new Error("Lead to update not found.");
    }
    
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
    await ensureCollectionExists(COLLECTION_NAME);
    await fetchFromApi(`collections/${COLLECTION_NAME}/documents/${leadId}`, {
        method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error(`Error deleting lead ${leadId} via API:`, error);
    return false;
  }
};
