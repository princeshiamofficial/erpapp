
import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, orderBy, writeBatch, where } from 'firebase/firestore';
import type { ServiceModelItem, ServiceLaminationItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const MODELS_COLLECTION = 'serviceModels';
const LAMINATIONS_COLLECTION = 'serviceLaminations';

// Default options
const defaultModels: string[] = ["Standard Gloss", "Premium Matte", "Eco-Friendly Recycled", "Luxury Silk"];
const defaultLaminations: string[] = ["None", "Glossy", "Matte", "Soft Touch", "Anti-Scuff Matte"];

// --- Model Functions ---

const seedDefaultModels = async (): Promise<ServiceModelItem[]> => {
  const modelsRef = collection(db, MODELS_COLLECTION);
  const batch = writeBatch(db);
  const createdModels: ServiceModelItem[] = [];

  defaultModels.forEach(name => {
    const id = uuidv4();
    const newModel: ServiceModelItem = { id, name };
    const docRef = doc(modelsRef, id);
    batch.set(docRef, newModel);
    createdModels.push(newModel);
  });

  try {
    await batch.commit();
    console.log('Default service models seeded in Firestore.');
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
    return snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as ServiceModelItem));
  } catch (error) {
    console.error("Error fetching service models:", error);
    return [];
  }
};

export const addModel = async (name: string): Promise<ServiceModelItem | null> => {
  if (!name.trim()) {
    throw new Error("Model name cannot be empty.");
  }
  try {
    const modelsCol = collection(db, MODELS_COLLECTION);
    // Check if model with the same name already exists (case-insensitive check for better UX)
    const q = query(modelsCol, where("name", "==", name.trim())); // Firestore queries are case-sensitive by default
    const existing = await getDocs(q);
    if (!existing.empty && existing.docs.some(doc => doc.data().name.toLowerCase() === name.trim().toLowerCase())) {
      throw new Error(`Model with name "${name.trim()}" already exists.`);
    }

    const id = uuidv4();
    const newModel: ServiceModelItem = { id, name: name.trim() };
    await setDoc(doc(modelsCol, id), newModel);
    return newModel;
  } catch (error) {
    console.error("Error adding service model:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateModel = async (id: string, name: string): Promise<boolean> => {
  if (!name.trim()) {
    throw new Error("Model name cannot be empty.");
  }
  try {
    // Optional: Check if another model with the new name already exists (excluding the current one)
    const modelsCol = collection(db, MODELS_COLLECTION);
    const q = query(modelsCol, where("name", "==", name.trim()));
    const existing = await getDocs(q);
    if (!existing.empty && existing.docs.some(doc => doc.id !== id && doc.data().name.toLowerCase() === name.trim().toLowerCase())) {
      throw new Error(`Another model with name "${name.trim()}" already exists.`);
    }

    const modelDoc = doc(db, MODELS_COLLECTION, id);
    await updateDoc(modelDoc, { name: name.trim() });
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
    return false;
  }
};

// --- Lamination Functions ---

const seedDefaultLaminations = async (): Promise<ServiceLaminationItem[]> => {
  const laminationsRef = collection(db, LAMINATIONS_COLLECTION);
  const batch = writeBatch(db);
  const createdLaminations: ServiceLaminationItem[] = [];

  defaultLaminations.forEach(name => {
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
    return false;
  }
};
