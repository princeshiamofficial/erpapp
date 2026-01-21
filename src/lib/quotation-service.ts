
import type { TrackingLink, Comment, OrderLogEntry, OrderItem, AdvancePaymentRecord } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getStatusById } from './status-service';
import { format, parseISO } from 'date-fns';
import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';

const QUOTATIONS_COLLECTION = 'quotations';

export const getQuotations = async (): Promise<TrackingLink[]> => {
  try {
    await ensureCollectionExistsV3(QUOTATIONS_COLLECTION);
    const response = await fetchFromApiV3(`collections/${QUOTATIONS_COLLECTION}/documents?limit=4444`);
    
    if (response && Array.isArray(response.documents)) {
        const quotations = response.documents.map((doc: { id: string, data: any }) => ({
            id: doc.id,
            ...doc.data
        } as TrackingLink));
        return quotations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    return [];
  } catch (error) {
    if (error instanceof Error) {
        console.error("Error fetching quotations from API v3:", error.message);
        throw new Error(`Failed to fetch quotations: ${error.message}`);
    } else {
        console.error("An unknown error occurred while fetching quotations from API v3:", error);
        throw new Error("An unknown error occurred while fetching quotations.");
    }
  }
};

export const getQuotationById = async (id: string): Promise<TrackingLink | undefined> => {
  if (!id) return undefined;
  try {
    const response = await fetchFromApiV3(`collections/${QUOTATIONS_COLLECTION}/documents/${id}`);
    if (response && response.data) {
        return { id: response.id, ...response.data } as TrackingLink;
    }
    return undefined;
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
      return undefined;
    }
    console.error("Error fetching quotation by ID from API v3:", error);
    return undefined;
  }
};

export const addQuotation = async (quotationData: {
  companyName: string;
  address: string;
  phoneNumber: string;
  orderItems: OrderItem[];
  advancePaymentAmount?: number | null;
  specialClientDiscount?: number | null;
  shippingCharge?: number | null; 
  advancePaymentMethod?: string | null;
  orderNotes?: string | null;
  initialStatusId: string;
  crmUserId: string;
  crmUserName: string;
  createdAt: string;
}): Promise<TrackingLink | null> => {
  const transactionTime = new Date().toISOString();

  try {
    await ensureCollectionExistsV3(QUOTATIONS_COLLECTION);
    let finalCreatedAt = quotationData.createdAt;
    try {
      finalCreatedAt = parseISO(quotationData.createdAt).toISOString();
    } catch (e) {
      finalCreatedAt = new Date().toISOString();
    }

    const quotationPrefix = 'QTN-';
    
    const allQuotationsResponse = await fetchFromApiV3(`collections/${QUOTATIONS_COLLECTION}/documents?limit=4444`);
    let newSequence = 1;
    if (allQuotationsResponse && Array.isArray(allQuotationsResponse.documents)) {
        const quotationIds = allQuotationsResponse.documents.map((doc: any) => doc.id);
        const maxId = quotationIds
            .filter((id: string) => id.startsWith(quotationPrefix))
            .map((id: string) => parseInt(id.substring(quotationPrefix.length), 10))
            .filter((num: number) => !isNaN(num))
            .reduce((max: number, current: number) => (current > max ? current : max), 0);
        newSequence = maxId + 1;
    }
    
    const quotationId = `${quotationPrefix}${String(newSequence).padStart(4, '0')}`;
    
    const initialLogEntry: OrderLogEntry = {
      id: uuidv4(), timestamp: finalCreatedAt, status: quotationData.initialStatusId,
      changedByUserId: quotationData.crmUserId, changedByUserName: quotationData.crmUserName, notes: "Quotation created.",
    };

    const initialAdvancePayments: AdvancePaymentRecord[] = [];
    if (quotationData.advancePaymentAmount && quotationData.advancePaymentAmount > 0) {
      initialAdvancePayments.push({
        id: uuidv4(), amount: quotationData.advancePaymentAmount, date: finalCreatedAt,
        paymentMethod: quotationData.advancePaymentMethod || "Unknown", notes: "Initial advance payment.",
        recordedByUserId: quotationData.crmUserId, recordedByUserName: quotationData.crmUserName,
      });
    }

    const newQuotationData: Omit<TrackingLink, 'id'> = {
      companyName: quotationData.companyName, address: quotationData.address, phoneNumber: quotationData.phoneNumber,
      orderItems: quotationData.orderItems, specialClientDiscount: quotationData.specialClientDiscount ?? null,
      shippingCharge: quotationData.shippingCharge ?? null, orderNotes: quotationData.orderNotes || null,
      crmUserId: quotationData.crmUserId, crmUserName: quotationData.crmUserName,
      designerRepresentativeId: null, designerRepresentativeName: null,
      assigneeAvatarUrl: null, 
      designerRepresentativeAvatarUrl: null,
      createdAt: finalCreatedAt, updatedAt: transactionTime,
      updatedByUserId: quotationData.crmUserId, updatedByUserName: quotationData.crmUserName,
      isPublic: false, currentStatus: quotationData.initialStatusId,
      statusHistory: [initialLogEntry], comments: [], viewCount: 0,
      advancePayments: initialAdvancePayments,
      packzyConsignmentId: null, packzyTrackingCode: null,
    };
    
    const payload = { id: quotationId, data: newQuotationData };
    
    await fetchFromApiV3(`collections/${QUOTATIONS_COLLECTION}/documents`, {
        method: 'POST', body: JSON.stringify(payload)
    });
    
    return { id: quotationId, ...newQuotationData };

  } catch (error: any) {
    console.error("Error adding quotation via API v3:", error.message ? error.message : error);
    return null;
  }
};

export const updateQuotation = async (id: string, updates: Partial<TrackingLink>): Promise<boolean> => {
  try {
    const existingQuotation = await getQuotationById(id);
    if (!existingQuotation) {
      throw new Error(`Quotation ${id} not found.`);
    }

    const finalData = { ...existingQuotation, ...updates };
    delete (finalData as any).id; 

    const payload = { data: finalData };
    await fetchFromApiV3(`collections/${QUOTATIONS_COLLECTION}/documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    });
    return true;
  } catch (error) {
    console.error(`Error updating quotation ${id} via API v3:`, error);
    return false;
  }
};

export const deleteQuotation = async (quotationId: string): Promise<boolean> => {
  try {
    await fetchFromApiV3(`collections/${QUOTATIONS_COLLECTION}/documents/${quotationId}`, { method: 'DELETE' });
    return true;
  } catch (error) {
    console.error(`Error deleting quotation ${quotationId} via API v3:`, error);
    return false;
  }
};
