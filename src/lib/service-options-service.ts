

import { db } from './firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, writeBatch, where, runTransaction, getDoc } from 'firebase/firestore';
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
  const laminationsRef = collection(db, LAMINATIONS_COLLECTION);
  const batch = writeBatch(db);
  const createdLaminations: ServiceLaminationItem[] = [];
  const defaultLaminationsData: string[] = ["None", "Glossy", "Matte", "Soft Touch", "Anti-Scuff Matte"];

  defaultLaminationsData.forEach(name => {
    const id = uuidv4();
    const newLamination: ServiceLaminationItem = { id, name };
    const docRef = doc(laminationsRef, id);
    batch.set(docRef, newLamination);
    createdLaminations.push(newLamination);
  });

  try {
    await batch.commit();
    console.log('Default service laminations seeded in Firestore.');
    return createdLaminations;
  } catch (error) {
    console.error("Error seeding default service laminations:", error);
    return [];
  }
};

export const getLaminations = async (): Promise<ServiceLaminationItem[]> => {
  const laminationsCol = collection(db, LAMINATIONS_COLLECTION);
  const q = query(laminationsCol, orderBy("name", "asc"));
  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.log("No service laminations found, seeding defaults.");
      return await seedDefaultLaminations();
    }
    return snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as ServiceLaminationItem));
  } catch (error) {
    console.error("Error fetching service laminations:", error);
    return [];
  }
};

export const addLamination = async (name: string): Promise<ServiceLaminationItem | null> => {
   if (!name.trim()) {
    throw new Error("Lamination name cannot be empty.");
  }
  try {
    const laminationsCol = collection(db, LAMINATIONS_COLLECTION);
     const q = query(laminationsCol, where("name", "==", name.trim()));
    const existing = await getDocs(q);
    if (!existing.empty && existing.docs.some(doc => doc.data().name.toLowerCase() === name.trim().toLowerCase())) {
      throw new Error(`Lamination with name "${name.trim()}" already exists.`);
    }

    const id = uuidv4();
    const newLamination: ServiceLaminationItem = { id, name: name.trim() };
    await setDoc(doc(laminationsCol, id), newLamination);
    return newLamination;
  } catch (error) {
    console.error("Error adding service lamination:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateLamination = async (id: string, name: string): Promise<boolean> => {
  if (!name.trim()) {
    throw new Error("Lamination name cannot be empty.");
  }
  try {
    const laminationsCol = collection(db, LAMINATIONS_COLLECTION);
    const q = query(laminationsCol, where("name", "==", name.trim()));
    const existing = await getDocs(q);
    if (!existing.empty && existing.docs.some(doc => doc.id !== id && doc.data().name.toLowerCase() === name.trim().toLowerCase())) {
      throw new Error(`Another lamination with name "${name.trim()}" already exists.`);
    }
    const laminationDoc = doc(db, LAMINATIONS_COLLECTION, id);
    await updateDoc(laminationDoc, { name: name.trim() });
    return true;
  } catch (error) {
    console.error("Error updating service lamination:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};

export const deleteLamination = async (id: string): Promise<boolean> => {
  try {
    const laminationDoc = doc(db, LAMINATIONS_COLLECTION, id);
    await deleteDoc(laminationDoc);
    return true;
  } catch (error) {
    console.error("Error deleting service lamination:", error);
    if (error instanceof Error) throw error; 
    return false;
  }
};

// --- Payment Method Functions ---

const seedDefaultPaymentMethods = async (): Promise<ServicePaymentMethodItem[]> => {
  const paymentMethodsRef = collection(db, PAYMENT_METHODS_COLLECTION);
  const batch = writeBatch(db);
  const createdItems: ServicePaymentMethodItem[] = [];
  const defaultPaymentMethodsData: string[] = ["Cash", "Card", "Bank Transfer", "Mobile Banking", "Cheque", "Other"];

  defaultPaymentMethodsData.forEach(name => {
    const id = uuidv4();
    const newItem: ServicePaymentMethodItem = { id, name };
    const docRef = doc(paymentMethodsRef, id);
    batch.set(docRef, newItem);
    createdItems.push(newItem);
  });

  try {
    await batch.commit();
    console.log('Default payment methods seeded in Firestore.');
    return createdItems;
  } catch (error) {
    console.error("Error seeding default payment methods:", error);
    return [];
  }
};

export const getPaymentMethods = async (): Promise<ServicePaymentMethodItem[]> => {
  const itemsCol = collection(db, PAYMENT_METHODS_COLLECTION);
  const q = query(itemsCol, orderBy("name", "asc"));
  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.log("No payment methods found, seeding defaults.");
      return await seedDefaultPaymentMethods();
    }
    return snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as ServicePaymentMethodItem));
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return [];
  }
};

export const addPaymentMethod = async (name: string): Promise<ServicePaymentMethodItem | null> => {
  if (!name.trim()) {
    throw new Error("Payment method name cannot be empty.");
  }
  try {
    const itemsCol = collection(db, PAYMENT_METHODS_COLLECTION);
    const q = query(itemsCol, where("name", "==", name.trim()));
    const existing = await getDocs(q);
    if (!existing.empty && existing.docs.some(doc => doc.data().name.toLowerCase() === name.trim().toLowerCase())) {
      throw new Error(`Payment method with name "${name.trim()}" already exists.`);
    }

    const id = uuidv4();
    const newItem: ServicePaymentMethodItem = { id, name: name.trim() };
    await setDoc(doc(itemsCol, id), newItem);
    return newItem;
  } catch (error) {
    console.error("Error adding payment method:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updatePaymentMethod = async (id: string, name: string): Promise<boolean> => {
  if (!name.trim()) {
    throw new Error("Payment method name cannot be empty.");
  }
  try {
    const itemsCol = collection(db, PAYMENT_METHODS_COLLECTION);
    const q = query(itemsCol, where("name", "==", name.trim()));
    const existing = await getDocs(q);
    if (!existing.empty && existing.docs.some(doc => doc.id !== id && doc.data().name.toLowerCase() === name.trim().toLowerCase())) {
      throw new Error(`Another payment method with name "${name.trim()}" already exists.`);
    }
    const itemDoc = doc(db, PAYMENT_METHODS_COLLECTION, id);
    await updateDoc(itemDoc, { name: name.trim() });
    return true;
  } catch (error) {
    console.error("Error updating payment method:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};

export const deletePaymentMethod = async (id: string): Promise<boolean> => {
  try {
    const itemDoc = doc(db, PAYMENT_METHODS_COLLECTION, id);
    await deleteDoc(itemDoc);
    return true;
  } catch (error) {
    console.error("Error deleting payment method:", error);
    if (error instanceof Error) throw error; 
    return false;
  }
};