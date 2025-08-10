

import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, orderBy, writeBatch, where } from 'firebase/firestore';
import type { ServiceModelItem, ServiceLaminationItem, ServicePaymentMethodItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const MODELS_COLLECTION = 'serviceModels';
const LAMINATIONS_COLLECTION = 'serviceLaminations';
const PAYMENT_METHODS_COLLECTION = 'servicePaymentMethods';

// Default options with prices for models
const defaultModelsData: Array<Omit<ServiceModelItem, 'id'>> = [
  { name: "Standard Gloss", buyingPrice: 5.00, sellingPrice: 10.00, imageUrl: 'https://placehold.co/100x100.png', isReadyMade: false, stockCount: 0 },
  { name: "Premium Matte", buyingPrice: 8.00, sellingPrice: 15.00, imageUrl: 'https://placehold.co/100x100.png', isReadyMade: true, stockCount: 150 },
  { name: "Eco-Friendly Recycled", buyingPrice: 7.00, sellingPrice: 12.50, imageUrl: 'https://placehold.co/100x100.png', isReadyMade: false, stockCount: 0 },
  { name: "Luxury Silk", buyingPrice: 10.00, sellingPrice: 18.75, imageUrl: 'https://placehold.co/100x100.png', isReadyMade: true, stockCount: 75 }
];
const defaultLaminationsData: string[] = ["None", "Glossy", "Matte", "Soft Touch", "Anti-Scuff Matte"];
const defaultPaymentMethodsData: string[] = ["Cash", "Card", "Bank Transfer", "Mobile Banking", "Cheque", "Other"];

// --- Model Functions ---

const seedDefaultModels = async (): Promise<ServiceModelItem[]> => {
  const modelsRef = collection(db, MODELS_COLLECTION);
  const batch = writeBatch(db);
  const createdModels: ServiceModelItem[] = [];

  defaultModelsData.forEach(modelData => {
    const id = uuidv4();
    const newModel: ServiceModelItem = { 
      id, 
      name: modelData.name, 
      buyingPrice: modelData.buyingPrice ?? 0,
      sellingPrice: modelData.sellingPrice ?? 0,
      imageUrl: modelData.imageUrl ?? null,
      isReadyMade: modelData.isReadyMade ?? false,
      stockCount: modelData.stockCount ?? 0,
    };
    const docRef = doc(modelsRef, id);
    batch.set(docRef, newModel);
    createdModels.push(newModel);
  });

  try {
    await batch.commit();
    console.log('Default service models (with stock tracking) seeded in Firestore.');
    return createdModels;
  } catch (error) {
    console.error("Error seeding default service models:", error);
    return [];
  }
};

export const getModels = async (): Promise<ServiceModelItem[]> => {
  const modelsCol = collection(db, MODELS_COLLECTION);
  const q = query(modelsCol, orderBy("name", "asc"));
  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.log("No service models found, seeding defaults.");
      return await seedDefaultModels();
    }
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return { 
        id: docSnap.id, 
        name: data.name,
        buyingPrice: data.buyingPrice === undefined ? 0 : data.buyingPrice,
        sellingPrice: data.sellingPrice === undefined ? 0 : data.sellingPrice,
        imageUrl: data.imageUrl || null,
        isReadyMade: data.isReadyMade === undefined ? false : data.isReadyMade,
        stockCount: data.stockCount === undefined ? 0 : data.stockCount,
      } as ServiceModelItem;
    });
  } catch (error) {
    console.error("Error fetching service models:", error);
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
    const modelsCol = collection(db, MODELS_COLLECTION);
    const q = query(modelsCol, where("name", "==", name.trim()));
    const existing = await getDocs(q);
    if (!existing.empty && existing.docs.some(doc => doc.data().name.toLowerCase() === name.trim().toLowerCase())) {
      throw new Error(`Model with name "${name.trim()}" already exists.`);
    }

    const id = uuidv4();
    const newModel: ServiceModelItem = { 
      id, 
      name: name.trim(), 
      buyingPrice: numBuyingPrice, 
      sellingPrice: numSellingPrice, 
      imageUrl: imageUrl || null,
      isReadyMade: isReadyMade || false,
      stockCount: finalStockCount,
    };
    await setDoc(doc(modelsCol, id), newModel);
    return newModel;
  } catch (error) {
    console.error("Error adding service model:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateModel = async (id: string, name: string, buyingPrice?: number, sellingPrice?: number, imageUrl?: string | null, isReadyMade?: boolean, stockCount?: number): Promise<boolean> => {
  if (!name.trim()) {
    throw new Error("Model name cannot be empty.");
  }
  const numBuyingPrice = buyingPrice === undefined || isNaN(Number(buyingPrice)) ? 0 : Number(buyingPrice);
  const numSellingPrice = sellingPrice === undefined || isNaN(Number(sellingPrice)) ? 0 : Number(sellingPrice);
  const finalStockCount = (isReadyMade && stockCount !== undefined) ? stockCount : 0;

  try {
    const modelsCol = collection(db, MODELS_COLLECTION);
    const q = query(modelsCol, where("name", "==", name.trim()));
    const existing = await getDocs(q);
    if (!existing.empty && existing.docs.some(doc => doc.id !== id && doc.data().name.toLowerCase() === name.trim().toLowerCase())) {
      throw new Error(`Another model with name "${name.trim()}" already exists.`);
    }

    const modelDoc = doc(db, MODELS_COLLECTION, id);
    const updates = {
      name: name.trim(),
      buyingPrice: numBuyingPrice,
      sellingPrice: numSellingPrice,
      imageUrl: imageUrl || null,
      isReadyMade: isReadyMade || false,
      stockCount: finalStockCount,
    };
    await updateDoc(modelDoc, updates);
    return true;
  } catch (error) {
    console.error("Error updating service model:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};

export const deleteModel = async (id: string): Promise<boolean> => {
  try {
    const modelDoc = doc(db, MODELS_COLLECTION, id);
    await deleteDoc(modelDoc);
    return true;
  } catch (error) {
    console.error("Error deleting service model:", error);
    if (error instanceof Error) throw error; 
    return false;
  }
};

// --- Lamination Functions ---

const seedDefaultLaminations = async (): Promise<ServiceLaminationItem[]> => {
  const laminationsRef = collection(db, LAMINATIONS_COLLECTION);
  const batch = writeBatch(db);
  const createdLaminations: ServiceLaminationItem[] = [];

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
