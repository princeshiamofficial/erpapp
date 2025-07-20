
import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import type { Lead } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const LEADS_COLLECTION = 'leads';

// Get all leads
export const getLeads = async (): Promise<Lead[]> => {
  const leadsCol = collection(db, LEADS_COLLECTION);
  const q = query(leadsCol, orderBy("date", "desc"));
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as Lead));
  } catch (error) {
    console.error("Error fetching leads:", error);
    return [];
  }
};

// Add a new lead
export const addLead = async (leadData: Omit<Lead, 'id'>): Promise<Lead | null> => {
  try {
    const newDocRef = doc(collection(db, LEADS_COLLECTION));
    const newLead: Lead = {
      ...leadData,
      id: newDocRef.id,
      schedule: leadData.schedule || null,
    };
    await setDoc(newDocRef, newLead);
    return newLead;
  } catch (error) {
    console.error("Error adding lead:", error);
    return null;
  }
};

// Update a lead
export const updateLead = async (leadId: string, updates: Partial<Omit<Lead, 'id'>>): Promise<boolean> => {
  try {
    const leadDocRef = doc(db, LEADS_COLLECTION, leadId);
    await updateDoc(leadDocRef, { ...updates, schedule: updates.schedule || null });
    return true;
  } catch (error) {
    console.error(`Error updating lead ${leadId}:`, error);
    return false;
  }
};

// Delete a lead
export const deleteLead = async (leadId: string): Promise<boolean> => {
  try {
    const leadDocRef = doc(db, LEADS_COLLECTION, leadId);
    await deleteDoc(leadDocRef);
    return true;
  } catch (error) {
    console.error(`Error deleting lead ${leadId}:`, error);
    return false;
  }
};
