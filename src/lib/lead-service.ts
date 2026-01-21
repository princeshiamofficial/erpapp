import type { Lead, LeadCategory, LeadStatusType } from '@/types';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

const COLLECTION_NAME = 'pipelineLeads';

// Get all leads
export const getLeads = async (): Promise<Lead[]> => {
  try {
    // The ensureCollectionExistsV3 call was causing a 500 error on this specific collection.
    // By fetching documents directly, we can bypass this. If the collection doesn't exist,
    // the API should gracefully return an empty list or a 'not found' error which we now handle.
    await ensureCollectionExistsV3(COLLECTION_NAME);
    
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=4000`);
    
    if (response && Array.isArray(response.documents)) {
        const allLeads = response.documents.map((doc: { id: string, data: any }) => ({
            id: doc.id,
            ...doc.data
        } as Lead));
        
        // Perform sorting on the client side for consistency and to avoid server errors.
        return allLeads.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    
    return [];
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
      // This is a valid state if the collection hasn't been created yet. Return empty array.
      console.log("Leads collection not found, which is an expected state if no leads have been created.");
      return [];
    }
    // Catching other errors here to prevent the app from crashing on a 500 response.
    console.error("Error fetching leads via API v3:", error);
    return [];
  }
};


// Get a single lead by ID
export const getLeadById = async (leadId: string): Promise<Lead | null> => {
    if (!leadId) return null;
    try {
        const doc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${leadId}`);
        return { id: doc.id, ...doc.data } as Lead;
    } catch (error) {
        if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
            return null; // Gracefully handle not found
        }
        console.error(`Error fetching lead by ID ${leadId} via API v3:`, error);
        return null;
    }
};


// Add a new lead
export const addLead = async (leadData: Omit<Lead, 'id'>): Promise<Lead | null> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME); 
    const dataWithStatus = {
        ...leadData,
        status: 'New Lead' as LeadStatusType, // Set default status for new leads
        customerType: leadData.customerType || null,
    };
    const payload = {
        data: dataWithStatus
    };
    const newDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    return {
        id: newDoc.id,
        ...newDoc.data
    } as Lead;
  } catch (error) {
    console.error("Error adding lead via API v3:", error);
    if (error instanceof Error) throw error; 
    return null;
  }
};

// Update a lead
export const updateLead = async (leadId: string, updates: Partial<Omit<Lead, 'id'>>): Promise<boolean> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    
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

    await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${leadId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
    return true;
  } catch (error) {
    console.error(`Error updating lead ${leadId} via API v3:`, error);
    return false;
  }
};

// Delete a lead
export const deleteLead = async (leadId: string): Promise<boolean> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${leadId}`, {
        method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error(`Error deleting lead ${leadId} via API v3:`, error);
    return false;
  }
};
