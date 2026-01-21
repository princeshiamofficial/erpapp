import type { Lead, LeadCategory, LeadStatusType } from '@/types';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import { format, subMonths, parseISO } from 'date-fns';

const getLeadCollectionName = (date: Date): string => `leads-${format(date, 'MM-yyyy')}`;

const getMonthsToFetch = (count: number = 24): Date[] => {
    const months: Date[] = [];
    const today = new Date();
    for (let i = 0; i < count; i++) {
        months.push(subMonths(today, i));
    }
    return months;
};

// Get all leads from the last 24 months
export const getLeads = async (): Promise<Lead[]> => {
  const months = getMonthsToFetch();
  const allLeads: Lead[] = [];

  for (const month of months) {
    const collectionName = getLeadCollectionName(month);
    try {
      // API will return an empty list or error if it doesn't exist, which we handle.
      const response = await fetchFromApiV3(`collections/${collectionName}/documents?limit=4000`);
      if (response && Array.isArray(response.documents)) {
        const leadsFromMonth = response.documents.map((doc: { id: string, data: any }) => ({
            id: doc.id,
            ...doc.data
        } as Lead));
        allLeads.push(...leadsFromMonth);
      }
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
        // This is expected if a month's collection has no leads. Continue to the next month.
        continue;
      }
      console.error(`Error fetching leads from ${collectionName} via API v3:`, error);
    }
  }
  
  // Sort all collected leads by date descending
  return allLeads.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};


// Get a single lead by ID by searching recent collections
export const getLeadById = async (leadId: string): Promise<Lead | null> => {
    if (!leadId) return null;
    const months = getMonthsToFetch();

    for (const month of months) {
        const collectionName = getLeadCollectionName(month);
        try {
            const doc = await fetchFromApiV3(`collections/${collectionName}/documents/${leadId}`);
            if (doc && doc.data) {
                return { id: doc.id, ...doc.data } as Lead;
            }
        } catch (error) {
            if (!(error instanceof Error && error.message.toLowerCase().includes('not found'))) {
              console.warn(`Error searching for lead ${leadId} in ${collectionName}:`, error);
            }
        }
    }

    console.warn(`Lead with ID ${leadId} not found in any of the last 24 monthly collections.`);
    return null;
};


// Add a new lead to the appropriate monthly collection
export const addLead = async (leadData: Omit<Lead, 'id'>): Promise<Lead | null> => {
  try {
    const leadDate = parseISO(leadData.date);
    const collectionName = getLeadCollectionName(leadDate);
    await ensureCollectionExistsV3(collectionName); 

    const dataWithStatus = {
        ...leadData,
        status: 'New Lead' as LeadStatusType,
        customerType: leadData.customerType || null,
    };
    const payload = { data: dataWithStatus };
    const newDoc = await fetchFromApiV3(`collections/${collectionName}/documents`, {
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

// Update a lead, handling potential moves between collections if the date changes month/year
export const updateLead = async (leadId: string, updates: Partial<Omit<Lead, 'id'>>): Promise<boolean> => {
  try {
    const existingLead = await getLeadById(leadId);
    if (!existingLead) {
        throw new Error("Lead to update not found.");
    }
    
    const originalDate = parseISO(existingLead.date);
    const newDate = updates.date ? parseISO(updates.date) : originalDate;

    const originalCollection = getLeadCollectionName(originalDate);
    const newCollection = getLeadCollectionName(newDate);

    const finalData = { ...existingLead, ...updates, id: undefined };
    delete finalData.id;

    if (originalCollection === newCollection) {
        // Simple update in the same collection
        await fetchFromApiV3(`collections/${originalCollection}/documents/${leadId}`, {
            method: 'PUT',
            body: JSON.stringify({ data: finalData })
        });
    } else {
        // It's a move. Create in new, delete from old.
        await ensureCollectionExistsV3(newCollection);
        // Create with the same ID in the new collection
        await fetchFromApiV3(`collections/${newCollection}/documents/${leadId}`, {
            method: 'PUT',
            body: JSON.stringify({ data: finalData })
        });
        // Delete from the old collection
        await fetchFromApiV3(`collections/${originalCollection}/documents/${leadId}`, {
            method: 'DELETE'
        });
    }
    return true;
  } catch (error) {
    console.error(`Error updating lead ${leadId} via API v3:`, error);
    return false;
  }
};

// Delete a lead by finding it first
export const deleteLead = async (leadId: string): Promise<boolean> => {
  try {
    const leadToDelete = await getLeadById(leadId);
    if (!leadToDelete) {
        console.warn(`Lead ${leadId} not found for deletion. Assuming already deleted.`);
        return true; // If not found, it's effectively deleted.
    }
    const collectionName = getLeadCollectionName(parseISO(leadToDelete.date));
    await fetchFromApiV3(`collections/${collectionName}/documents/${leadId}`, {
        method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error(`Error deleting lead ${leadId} via API v3:`, error);
    return false;
  }
};