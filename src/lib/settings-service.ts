
"use server";

import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { GlobalSettings, UserRole } from '@/types';

const GLOBAL_SETTINGS_COLLECTION = 'globalSettings';
const MAIN_SETTINGS_DOC_ID = 'main';

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  globalMonthlyOrderTarget: 0,
  globalWeeklyOrderTarget: 0,
  crmCompletionStatusIds: [],
  areCommentsVisibleOnPublicPage: true,
  rolesAllowedToEditOrders: ['SYSTEM_ADMIN', 'ADMIN'], // Default: Admins and System Admins can edit
};

// Gets global settings from Firestore
export async function getGlobalSettings(): Promise<GlobalSettings> {
  try {
    const settingsDocRef = doc(db, GLOBAL_SETTINGS_COLLECTION, MAIN_SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        globalMonthlyOrderTarget: data.globalMonthlyOrderTarget ?? DEFAULT_GLOBAL_SETTINGS.globalMonthlyOrderTarget,
        globalWeeklyOrderTarget: data.globalWeeklyOrderTarget ?? DEFAULT_GLOBAL_SETTINGS.globalWeeklyOrderTarget,
        crmCompletionStatusIds: data.crmCompletionStatusIds ?? DEFAULT_GLOBAL_SETTINGS.crmCompletionStatusIds,
        areCommentsVisibleOnPublicPage: data.areCommentsVisibleOnPublicPage ?? DEFAULT_GLOBAL_SETTINGS.areCommentsVisibleOnPublicPage,
        rolesAllowedToEditOrders: data.rolesAllowedToEditOrders ?? DEFAULT_GLOBAL_SETTINGS.rolesAllowedToEditOrders,
      };
    } else {
      console.log("Global settings document not found, returning defaults. Creating document with defaults.");
      await setDoc(settingsDocRef, DEFAULT_GLOBAL_SETTINGS);
      return DEFAULT_GLOBAL_SETTINGS;
    }
  } catch (error) {
    console.error("Error fetching global settings:", error);
    return DEFAULT_GLOBAL_SETTINGS;
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
      const initialData: Partial<GlobalSettings> = { ...DEFAULT_GLOBAL_SETTINGS };
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
      const initialData: GlobalSettings = {
        ...DEFAULT_GLOBAL_SETTINGS,
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

// Sets the public comments visibility
export async function setCommentsVisibility(isVisible: boolean): Promise<boolean> {
  try {
    const settingsDocRef = doc(db, GLOBAL_SETTINGS_COLLECTION, MAIN_SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      await updateDoc(settingsDocRef, { areCommentsVisibleOnPublicPage: isVisible });
    } else {
      const initialData: GlobalSettings = {
        ...DEFAULT_GLOBAL_SETTINGS,
        areCommentsVisibleOnPublicPage: isVisible
      };
      await setDoc(settingsDocRef, initialData);
    }
    return true;
  } catch (error) {
    console.error("Error setting comments visibility:", error);
    return false;
  }
}

// Sets the roles allowed to edit orders
export async function setRolesAllowedToEditOrders(roles: UserRole[]): Promise<boolean> {
  try {
    const settingsDocRef = doc(db, GLOBAL_SETTINGS_COLLECTION, MAIN_SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      await updateDoc(settingsDocRef, { rolesAllowedToEditOrders: roles });
    } else {
      const initialData: GlobalSettings = {
        ...DEFAULT_GLOBAL_SETTINGS,
        rolesAllowedToEditOrders: roles
      };
      await setDoc(settingsDocRef, initialData);
    }
    return true;
  } catch (error) {
    console.error("Error setting roles allowed to edit orders:", error);
    return false;
  }
}
