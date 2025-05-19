
"use server";

import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const GLOBAL_SETTINGS_COLLECTION = 'globalSettings';
const MAIN_SETTINGS_DOC_ID = 'main'; 

export interface GlobalSalesTargets {
  globalMonthlyOrderTarget: number;
  globalWeeklyOrderTarget: number;
  crmCompletionStatusIds?: string[]; // Array of CustomStatus IDs
}

const DEFAULT_GLOBAL_TARGETS: GlobalSalesTargets = {
  globalMonthlyOrderTarget: 0,
  globalWeeklyOrderTarget: 0,
  crmCompletionStatusIds: [], // Default to empty array
};

// Gets global settings from Firestore
export async function getGlobalSettings(): Promise<GlobalSalesTargets> {
  try {
    const settingsDocRef = doc(db, GLOBAL_SETTINGS_COLLECTION, MAIN_SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        globalMonthlyOrderTarget: data.globalMonthlyOrderTarget ?? DEFAULT_GLOBAL_TARGETS.globalMonthlyOrderTarget,
        globalWeeklyOrderTarget: data.globalWeeklyOrderTarget ?? DEFAULT_GLOBAL_TARGETS.globalWeeklyOrderTarget,
        crmCompletionStatusIds: data.crmCompletionStatusIds ?? DEFAULT_GLOBAL_TARGETS.crmCompletionStatusIds,
      };
    } else {
      console.log("Global settings document not found, returning defaults. Creating document with defaults.");
      // Create the document with defaults if it doesn't exist
      await setDoc(settingsDocRef, DEFAULT_GLOBAL_TARGETS);
      return DEFAULT_GLOBAL_TARGETS;
    }
  } catch (error) {
    console.error("Error fetching global settings:", error);
    return DEFAULT_GLOBAL_TARGETS; 
  }
}

// Updates a specific global sales target in Firestore
export async function updateGlobalSalesTarget(
  targetType: 'monthly' | 'weekly',
  newTarget: number
): Promise<boolean> {
  try {
    const settingsDocRef = doc(db, GLOBAL_SETTINGS_COLLECTION, MAIN_SETTINGS_DOC_ID);
    const fieldToUpdate = targetType === 'monthly' ? 'globalMonthlyOrderTarget' : 'globalWeeklyOrderTarget';
    
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      await updateDoc(settingsDocRef, { [fieldToUpdate]: newTarget });
    } else {
      const initialData: Partial<GlobalSalesTargets> = { ...DEFAULT_GLOBAL_TARGETS };
      if (targetType === 'monthly') {
        initialData.globalMonthlyOrderTarget = newTarget;
      } else {
        initialData.globalWeeklyOrderTarget = newTarget;
      }
      await setDoc(settingsDocRef, initialData);
    }
    return true;
  } catch (error) {
    console.error(`Error updating global ${targetType} sales target:`, error);
    return false;
  }
}

// Sets the CRM completion status IDs
export async function setCrmCompletionStatusIds(statusIds: string[]): Promise<boolean> {
  try {
    const settingsDocRef = doc(db, GLOBAL_SETTINGS_COLLECTION, MAIN_SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      await updateDoc(settingsDocRef, { crmCompletionStatusIds: statusIds });
    } else {
      // If the document doesn't exist, create it with these IDs and other defaults
      const initialData: GlobalSalesTargets = { 
        ...DEFAULT_GLOBAL_TARGETS, 
        crmCompletionStatusIds: statusIds 
      };
      await setDoc(settingsDocRef, initialData);
    }
    return true;
  } catch (error) {
    console.error("Error setting CRM completion status IDs:", error);
    return false;
  }
}

// Gets only the CRM completion status IDs (convenience function)
export async function getCrmCompletionStatusIds(): Promise<string[]> {
  const settings = await getGlobalSettings();
  return settings.crmCompletionStatusIds ?? [];
}
