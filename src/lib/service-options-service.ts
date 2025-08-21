

import { db } from './firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, writeBatch, where, runTransaction, getDoc, setDoc } from 'firebase/firestore';
import type { ServiceModelItem, ServiceLaminationItem, ServicePaymentMethodItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { fetchFromApi, ensureCollectionExists } from './api-helper';


const MODELS_COLLECTION = 'serviceModels';
const LAMINATIONS_COLLECTION = 'serviceLaminations';
const PAYMENT_METHODS_COLLECTION = 'servicePaymentMethods';


// --- Model Functions ---

export const getModels = async (): Promise<ServiceModelItem[]> => {
  try {
    await ensureCollectionExists(MODELS_COLLECTION);
    const response = await fetchFromApi(`collections/${MODELS_COLLECTION}/documents?limit=500&orderBy=name&direction=asc`);
    if (response && Array.isArray(response.documents)) {
        return response.documents.map((doc: { id: string, data: any }) => ({
            id: doc.id,
            ...doc.data
        } as ServiceModelItem));
    }
    return [];
  } catch (error) {
    console.error("Error fetching service models via API:", error);
    return [];
  }
};

export const addModel = async (name: string, buyingPrice?: number, sellingPrice?: number, imageUrl?: string | null, isReadyMade?: boolean, stockCount?: number): Promise<ServiceModelItem | null> => {
  if (!name.trim()) {
    throw new Error("Model name cannot be empty.");
  }
  const numBuyingPrice = buyingPrice === undefined || isNaN(Number(buyingPrice)) ? 0 : Number(buyingPrice);
  const numSellingPrice = sellingPrice === undefined || isNaN(Number(sellingPrice)) ? 0 : Number(sellingPrice);
  const finalStockCount = (isReadyMade && stockCount !== undefined) ? stockCount : 0;

  try {
    await ensureCollectionExists(MODELS_COLLECTION);
    const newModelData: Omit<ServiceModelItem, 'id'> = { 
      name: name.trim(), 
      buyingPrice: numBuyingPrice, 
      sellingPrice: numSellingPrice, 
      imageUrl: imageUrl || null,
      isReadyMade: isReadyMade || false,
      stockCount: finalStockCount,
    };

    const newDoc = await fetchFromApi(`collections/${MODELS_COLLECTION}/documents`, {
        method: 'POST',
        body: JSON.stringify({ data: newModelData }),
    });

    return {
        id: newDoc.id,
        ...newDoc.data
    } as ServiceModelItem;
  } catch (error) {
    console.error("Error adding service model via API:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateModel = async (id: string, name: string, buyingPrice?: number, sellingPrice?: number, imageUrl?: string | null, isReadyMade?: boolean, stockCountChange?: number): Promise<boolean> => {
  if (!name.trim()) {
    throw new Error("Model name cannot be empty.");
  }
  
  try {
    const existingDoc = await fetchFromApi(`collections/${MODELS_COLLECTION}/documents/${id}`);
    if (!existingDoc || !existingDoc.data) {
        throw new Error("Document does not exist!");
    }

    const numBuyingPrice = buyingPrice === undefined || isNaN(Number(buyingPrice)) ? 0 : Number(buyingPrice);
    const numSellingPrice = sellingPrice === undefined || isNaN(Number(sellingPrice)) ? 0 : Number(sellingPrice);

    const currentStock = existingDoc.data.stockCount || 0;
    const stockToAdd = (isReadyMade && stockCountChange !== undefined) ? stockCountChange : 0;
    const finalStockCount = currentStock + stockToAdd;
    
    const updates = {
      name: name.trim(),
      buyingPrice: numBuyingPrice,
      sellingPrice: numSellingPrice,
      imageUrl: imageUrl === undefined ? existingDoc.data.imageUrl : imageUrl,
      isReadyMade: isReadyMade === undefined ? existingDoc.data.isReadyMade : isReadyMade,
      stockCount: finalStockCount,
    };
    
    const finalData = { ...existingDoc.data, ...updates };

    await fetchFromApi(`collections/${MODELS_COLLECTION}/documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ data: finalData })
    });
    return true;
  } catch (error) {
    console.error("Error updating service model via API:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};

export const updateModelStock = async (modelId: string, quantityChange: number): Promise<boolean> => {
    try {
        const doc = await fetchFromApi(`collections/${MODELS_COLLECTION}/documents/${modelId}`);
        if (!doc || !doc.data) {
            throw new Error("Model not found for stock update.");
        }
        const currentStock = doc.data.stockCount || 0;
        const newStock = currentStock + quantityChange;
        
        const finalData = { ...doc.data, stockCount: newStock };
        
        await fetchFromApi(`collections/${MODELS_COLLECTION}/documents/${modelId}`, {
            method: 'PUT',
            body: JSON.stringify({ data: finalData })
        });
        return true;
    } catch (error) {
        console.error(`Error updating stock for model ${modelId} via API:`, error);
        return false;
    }
};

export const deleteModel = async (id: string): Promise<boolean> => {
  try {
    await fetchFromApi(`collections/${MODELS_COLLECTION}/documents/${id}`, {
        method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error("Error deleting service model via API:", error);
    if (error instanceof Error) throw error; 
    return false;
  }
};


// --- Lamination Functions ---

const seedDefaultLaminations = async (): Promise<ServiceLaminationItem[]> => {
  await ensureCollectionExists(LAMINATIONS_COLLECTION);
  const createdLaminations: ServiceLaminationItem[] = [];
  const defaultLaminationsData: string[] = ["None", "Glossy", "Matte", "Soft Touch", "Anti-Scuff Matte"];

  for (const name of defaultLaminationsData) {
    const id = uuidv4();
    const newLamination: Omit<ServiceLaminationItem, 'id'> = { name };
    try {
        const newDoc = await fetchFromApi(`collections/${LAMINATIONS_COLLECTION}/documents`, {
            method: 'POST',
            body: JSON.stringify({ id, data: newLamination }),
        });
        createdLaminations.push({ id, ...newDoc.data });
    } catch (error) {
        console.error(`Error seeding lamination "${name}" via API:`, error);
    }
  }
  console.log('Default service laminations seeded via API.');
  return createdLaminations;
};

export const getLaminations = async (): Promise<ServiceLaminationItem[]> => {
  try {
    await ensureCollectionExists(LAMINATIONS_COLLECTION);
    const response = await fetchFromApi(`collections/${LAMINATIONS_COLLECTION}/documents?limit=100&orderBy=name&direction=asc`);
    if (response && Array.isArray(response.documents)) {
      if (response.documents.length === 0) {
        console.log("No service laminations found, seeding defaults via API.");
        return await seedDefaultLaminations();
      }
      return response.documents.map((doc: { id: string; data: any }) => ({
        id: doc.id,
        ...doc.data,
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching service laminations via API:", error);
    return [];
  }
};

export const addLamination = async (name: string): Promise<ServiceLaminationItem | null> => {
  if (!name.trim()) {
    throw new Error("Lamination name cannot be empty.");
  }
  try {
    const newLaminationData: Omit<ServiceLaminationItem, 'id'> = { name: name.trim() };
    const newDoc = await fetchFromApi(`collections/${LAMINATIONS_COLLECTION}/documents`, {
      method: 'POST',
      body: JSON.stringify({ data: newLaminationData }),
    });
    return { id: newDoc.id, ...newDoc.data };
  } catch (error) {
    console.error("Error adding service lamination via API:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateLamination = async (id: string, name: string): Promise<boolean> => {
  if (!name.trim()) {
    throw new Error("Lamination name cannot be empty.");
  }
  try {
    const existingDoc = await fetchFromApi(`collections/${LAMINATIONS_COLLECTION}/documents/${id}`);
    await fetchFromApi(`collections/${LAMINATIONS_COLLECTION}/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ data: { ...existingDoc.data, name: name.trim() } }),
    });
    return true;
  } catch (error) {
    console.error("Error updating service lamination via API:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};

export const deleteLamination = async (id: string): Promise<boolean> => {
  try {
    await fetchFromApi(`collections/${LAMINATIONS_COLLECTION}/documents/${id}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    console.error("Error deleting service lamination via API:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};


// --- Payment Method Functions ---

const seedDefaultPaymentMethods = async (): Promise<ServicePaymentMethodItem[]> => {
  await ensureCollectionExists(PAYMENT_METHODS_COLLECTION);
  const createdItems: ServicePaymentMethodItem[] = [];
  const defaultPaymentMethodsData: string[] = ["Cash", "Card", "Bank Transfer", "Mobile Banking", "Cheque", "Other"];

  for (const name of defaultPaymentMethodsData) {
    const id = uuidv4();
    const newItem: Omit<ServicePaymentMethodItem, 'id'> = { name };
    try {
      const newDoc = await fetchFromApi(`collections/${PAYMENT_METHODS_COLLECTION}/documents`, {
        method: 'POST',
        body: JSON.stringify({ id, data: newItem }),
      });
      createdItems.push({ id, ...newDoc.data });
    } catch (error) {
      console.error(`Error seeding payment method "${name}" via API:`, error);
    }
  }
  console.log('Default payment methods seeded via API.');
  return createdItems;
};


export const getPaymentMethods = async (): Promise<ServicePaymentMethodItem[]> => {
  try {
    await ensureCollectionExists(PAYMENT_METHODS_COLLECTION);
    const response = await fetchFromApi(`collections/${PAYMENT_METHODS_COLLECTION}/documents?limit=100&orderBy=name&direction=asc`);
    if (response && Array.isArray(response.documents)) {
        if (response.documents.length === 0) {
            console.log("No payment methods found, seeding defaults via API.");
            return await seedDefaultPaymentMethods();
        }
        return response.documents.map((doc: { id: string; data: any }) => ({
            id: doc.id,
            ...doc.data,
        }));
    }
    return [];
  } catch (error) {
      console.error("Error fetching payment methods via API:", error);
      return [];
  }
};


export const addPaymentMethod = async (name: string): Promise<ServicePaymentMethodItem | null> => {
  if (!name.trim()) {
    throw new Error("Payment method name cannot be empty.");
  }
  try {
    const newItemData: Omit<ServicePaymentMethodItem, 'id'> = { name: name.trim() };
    const newDoc = await fetchFromApi(`collections/${PAYMENT_METHODS_COLLECTION}/documents`, {
      method: 'POST',
      body: JSON.stringify({ data: newItemData }),
    });
    return { id: newDoc.id, ...newDoc.data };
  } catch (error) {
    console.error("Error adding payment method via API:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updatePaymentMethod = async (id: string, name: string): Promise<boolean> => {
  if (!name.trim()) {
    throw new Error("Payment method name cannot be empty.");
  }
  try {
    const existingDoc = await fetchFromApi(`collections/${PAYMENT_METHODS_COLLECTION}/documents/${id}`);
    await fetchFromApi(`collections/${PAYMENT_METHODS_COLLECTION}/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ data: { ...existingDoc.data, name: name.trim() } }),
    });
    return true;
  } catch (error) {
    console.error("Error updating payment method via API:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};

export const deletePaymentMethod = async (id: string): Promise<boolean> => {
  try {
    await fetchFromApi(`collections/${PAYMENT_METHODS_COLLECTION}/documents/${id}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    console.error("Error deleting payment method via API:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};
