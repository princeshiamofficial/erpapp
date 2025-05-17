
"use server";

import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const GLOBAL_SETTINGS_COLLECTION = 'globalSettings';
const MAIN_SETTINGS_DOC_ID = 'main'; // Using a single document for all global settings

export interface GlobalSalesTargets {
  globalMonthlyOrderTarget: number;
  globalWeeklyOrderTarget: number;
}

const DEFAULT_GLOBAL_TARGETS: GlobalSalesTargets = {
  globalMonthlyOrderTarget: 0,
  globalWeeklyOrderTarget: 0,
};

// Gets global sales targets from Firestore
export async function getGlobalSalesTargets(): Promise<GlobalSalesTargets> {
  try {
    const settingsDocRef = doc(db, GLOBAL_SETTINGS_COLLECTION, MAIN_SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        globalMonthlyOrderTarget: data.globalMonthlyOrderTarget ?? DEFAULT_GLOBAL_TARGETS.globalMonthlyOrderTarget,
        globalWeeklyOrderTarget: data.globalWeeklyOrderTarget ?? DEFAULT_GLOBAL_TARGETS.globalWeeklyOrderTarget,
      };
    } else {
      // If document doesn't exist, return defaults (and consider creating it with defaults)
      console.log("Global settings document not found, returning defaults. Consider seeding this document.");
      return DEFAULT_GLOBAL_TARGETS;
    }
  } catch (error) {
    console.error("Error fetching global sales targets:", error);
    return DEFAULT_GLOBAL_TARGETS; // Return defaults on error
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
      // If the document doesn't exist, create it with the new target and other defaults
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
