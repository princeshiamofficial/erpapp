import type { Lead, LeadCategory, LeadStatusType } from '@/types';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import { format, subMonths, parseISO } from 'date-fns';

const COLLECTION_NAME = 'leads';

// Get all leads
export const getLeads = async (): Promise<Lead[]> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME);
    const response = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents?limit=4444`);
    if (response && Array.isArray(response.documents)) {
        const leads = response.documents.map((doc: { id: string, data: any }) => ({
            id: doc.id,
            ...doc.data
        } as Lead));
        return leads.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return [];
  } catch (error) {
    console.error(`Error fetching leads from ${COLLECTION_NAME} via API v3:`, error);
    return [];
  }
};


// Get a single lead by ID
export const getLeadById = async (leadId: string): Promise<Lead | null> => {
    if (!leadId) return null;
    try {
        const doc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${leadId}`);
        if (doc && doc.data) {
            return { id: doc.id, ...doc.data } as Lead;
        }
    } catch (error) {
        if (!(error instanceof Error && error.message.toLowerCase().includes('not found'))) {
          console.warn(`Error getting lead ${leadId} in ${COLLECTION_NAME}:`, error);
        }
    }
    console.warn(`Lead with ID ${leadId} not found.`);
    return null;
};


// Add a new lead
export const addLead = async (leadData: Omit<Lead, 'id'>): Promise<Lead | null> => {
  try {
    await ensureCollectionExistsV3(COLLECTION_NAME); 

    const dataWithStatus = {
        ...leadData,
        status: 'New Lead' as LeadStatusType,
        customerType: leadData.customerType || null,
    };
    const payload = { data: dataWithStatus };
    const newDoc = await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    return { id: newDoc.id, ...newDoc.data } as Lead;
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
    
    const finalData = { ...existingLead, ...updates, id: undefined };
    delete finalData.id;

    await fetchFromApiV3(`collections/${COLLECTION_NAME}/documents/${leadId}`, {
        method: 'PUT',
        body: JSON.stringify({ data: finalData })
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
