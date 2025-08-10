
"use server";

import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import type { GlobalSettings, UserRole, ExpenseLoggingPermissions, ProjectStatusType } from '@/types';

const GLOBAL_SETTINGS_COLLECTION = 'globalSettings';
const MAIN_SETTINGS_DOC_ID = 'main';

const DEFAULT_TOAST_SOUND_URL = 'https://audio-previews.elements.envatousercontent.com/files/225140761/preview.mp3';
const DEFAULT_LEADERBOARD_BACKGROUND_URL = 'https://i.ibb.co/PGBMbxBc/360-F-338486227-q-Qit-Uvh3n-ILq-Yiu-QOUGxdfindo-NMbtp-H.jpg';

const DEFAULT_EXPENSE_LOGGING_PERMISSIONS: ExpenseLoggingPermissions = {
  mode: "all", // By default, all non-System Admins can log expenses
  allowedRoles: [],
  allowedUserIds: []
};

const DEFAULT_PROJECT_STAGE_ACCESS: Record<ProjectStatusType, UserRole[]> = {
  'CR Clearance': ['SYSTEM_ADMIN', 'ADMIN', 'CRM'],
  'Cancel': ['SYSTEM_ADMIN', 'ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'],
  'On Design': ['SYSTEM_ADMIN', 'ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'],
  'On Hold': ['SYSTEM_ADMIN', 'ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'],
  'Logistics': ['SYSTEM_ADMIN', 'ADMIN', 'DESIGNER_REPRESENTATIVE', 'LR'],
  'Courier': ['SYSTEM_ADMIN', 'ADMIN', 'LR'],
  'Delivered': ['SYSTEM_ADMIN', 'ADMIN', 'LR'],
};

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  globalMonthlyOrderTarget: 0,
  globalWeeklyOrderTarget: 0,
  crmCompletionStatusIds: [],
  areCommentsVisibleOnPublicPage: true,
  rolesAllowedToEditOrders: ['SYSTEM_ADMIN', 'ADMIN'],
  rolesAllowedToDeleteOrders: ['SYSTEM_ADMIN'],
  rolesAllowedToViewFinancials: ['SYSTEM_ADMIN', 'ADMIN'],
  toastSoundUrl: DEFAULT_TOAST_SOUND_URL,
  leaderboardBackgroundImageUrl: DEFAULT_LEADERBOARD_BACKGROUND_URL,
  expenseLoggingPermissions: DEFAULT_EXPENSE_LOGGING_PERMISSIONS,
  projectStageAccess: DEFAULT_PROJECT_STAGE_ACCESS,
  maintenanceMode: false,
  maintenanceMessage: "The application is currently down for maintenance. We'll be back shortly!",
  drAssignmentNotificationTitle: 'New Design Assigned By %assignerName%',
  drAssignmentNotificationBody: 'You have been assigned to a new design order: %orderId%.',
  reportProductFilters: ['Design Charge', 'Menu Book', 'Menu Card', 'Pizza Box', 'X-Banner', 'Business Card', 'Visiting Card'],
};

// Gets global settings from Firestore
export async function getGlobalSettings(): Promise<GlobalSettings> {
  try {
    const settingsDocRef = doc(db, GLOBAL_SETTINGS_COLLECTION, MAIN_SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const expensePerms = data.expenseLoggingPermissions || {};
      const fullExpensePerms: ExpenseLoggingPermissions = {
        mode: expensePerms.mode ?? DEFAULT_EXPENSE_LOGGING_PERMISSIONS.mode,
        allowedRoles: expensePerms.allowedRoles ?? DEFAULT_EXPENSE_LOGGING_PERMISSIONS.allowedRoles,
        allowedUserIds: expensePerms.allowedUserIds ?? DEFAULT_EXPENSE_LOGGING_PERMISSIONS.allowedUserIds,
      };

      const projectStageAccess = data.projectStageAccess || {};


      return {
        globalMonthlyOrderTarget: data.globalMonthlyOrderTarget ?? DEFAULT_GLOBAL_SETTINGS.globalMonthlyOrderTarget,
        globalWeeklyOrderTarget: data.globalWeeklyOrderTarget ?? DEFAULT_GLOBAL_SETTINGS.globalWeeklyOrderTarget,
        crmCompletionStatusIds: data.crmCompletionStatusIds ?? DEFAULT_GLOBAL_SETTINGS.crmCompletionStatusIds,
        areCommentsVisibleOnPublicPage: data.areCommentsVisibleOnPublicPage ?? DEFAULT_GLOBAL_SETTINGS.areCommentsVisibleOnPublicPage,
        rolesAllowedToEditOrders: data.rolesAllowedToEditOrders ?? DEFAULT_GLOBAL_SETTINGS.rolesAllowedToEditOrders,
        rolesAllowedToDeleteOrders: data.rolesAllowedToDeleteOrders ?? DEFAULT_GLOBAL_SETTINGS.rolesAllowedToDeleteOrders,
        rolesAllowedToViewFinancials: data.rolesAllowedToViewFinancials ?? DEFAULT_GLOBAL_SETTINGS.rolesAllowedToViewFinancials,
        toastSoundUrl: data.toastSoundUrl === undefined ? DEFAULT_GLOBAL_SETTINGS.toastSoundUrl : data.toastSoundUrl,
        leaderboardBackgroundImageUrl: data.leaderboardBackgroundImageUrl === undefined ? DEFAULT_GLOBAL_SETTINGS.leaderboardBackgroundImageUrl : data.leaderboardBackgroundImageUrl,
        expenseLoggingPermissions: fullExpensePerms,
        projectStageAccess: { ...DEFAULT_PROJECT_STAGE_ACCESS, ...projectStageAccess },
        maintenanceMode: data.maintenanceMode ?? DEFAULT_GLOBAL_SETTINGS.maintenanceMode,
        maintenanceMessage: data.maintenanceMessage ?? DEFAULT_GLOBAL_SETTINGS.maintenanceMessage,
        drAssignmentNotificationTitle: data.drAssignmentNotificationTitle ?? DEFAULT_GLOBAL_SETTINGS.drAssignmentNotificationTitle,
        drAssignmentNotificationBody: data.drAssignmentNotificationBody ?? DEFAULT_GLOBAL_SETTINGS.drAssignmentNotificationBody,
        reportProductFilters: data.reportProductFilters ?? DEFAULT_GLOBAL_SETTINGS.reportProductFilters,
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

// Sets the roles allowed to delete orders
export async function setRolesAllowedToDeleteOrders(roles: UserRole[]): Promise<boolean> {
  try {
    const settingsDocRef = doc(db, GLOBAL_SETTINGS_COLLECTION, MAIN_SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      await updateDoc(settingsDocRef, { rolesAllowedToDeleteOrders: roles });
    } else {
      const initialData: GlobalSettings = {
        ...DEFAULT_GLOBAL_SETTINGS,
        rolesAllowedToDeleteOrders: roles
      };
      await setDoc(settingsDocRef, initialData);
    }
    return true;
  } catch (error) {
    console.error("Error setting roles allowed to delete orders:", error);
    return false;
  }
}

// Sets the roles allowed to view financial details
export async function setRolesAllowedToViewFinancials(roles: UserRole[]): Promise<boolean> {
  try {
    const settingsDocRef = doc(db, GLOBAL_SETTINGS_COLLECTION, MAIN_SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      await updateDoc(settingsDocRef, { rolesAllowedToViewFinancials: roles });
    } else {
      const initialData: GlobalSettings = {
        ...DEFAULT_GLOBAL_SETTINGS,
        rolesAllowedToViewFinancials: roles
      };
      await setDoc(settingsDocRef, initialData);
    }
    return true;
  } catch (error) {
    console.error("Error setting roles allowed to view financials:", error);
    return false;
  }
}


// Sets the toast sound URL
export async function setToastSoundUrl(soundUrl: string | null): Promise<boolean> {
  try {
    const settingsDocRef = doc(db, GLOBAL_SETTINGS_COLLECTION, MAIN_SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      await updateDoc(settingsDocRef, { toastSoundUrl: soundUrl });
    } else {
      const initialData: GlobalSettings = {
        ...DEFAULT_GLOBAL_SETTINGS,
        toastSoundUrl: soundUrl
      };
      await setDoc(settingsDocRef, initialData);
    }
    return true;
  } catch (error) {
    console.error("Error setting toast sound URL:", error);
    return false;
  }
}

// Sets the leaderboard background image URL
export async function setLeaderboardBackgroundImageUrl(imageUrl: string | null): Promise<boolean> {
  try {
    const settingsDocRef = doc(db, GLOBAL_SETTINGS_COLLECTION, MAIN_SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      await updateDoc(settingsDocRef, { leaderboardBackgroundImageUrl: imageUrl });
    } else {
      const initialData: GlobalSettings = {
        ...DEFAULT_GLOBAL_SETTINGS,
        leaderboardBackgroundImageUrl: imageUrl
      };
      await setDoc(settingsDocRef, initialData);
    }
    return true;
  } catch (error) {
    console.error("Error setting leaderboard background image URL:", error);
    return false;
  }
}

// Sets the expense logging permissions
export async function setExpenseLoggingPermissions(permissions: ExpenseLoggingPermissions): Promise<boolean> {
  try {
    const settingsDocRef = doc(db, GLOBAL_SETTINGS_COLLECTION, MAIN_SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsDocRef);
    const dataToSet: ExpenseLoggingPermissions = {
        mode: permissions.mode,
        allowedRoles: permissions.mode === 'specificRoles' ? (permissions.allowedRoles || []) : [],
        allowedUserIds: permissions.mode === 'specificUsers' ? (permissions.allowedUserIds || []) : [],
    };

    if (docSnap.exists()) {
      await updateDoc(settingsDocRef, { expenseLoggingPermissions: dataToSet });
    } else {
      const initialData: GlobalSettings = {
        ...DEFAULT_GLOBAL_SETTINGS,
        expenseLoggingPermissions: dataToSet,
      };
      await setDoc(settingsDocRef, initialData);
    }
    return true;
  } catch (error) {
    console.error("Error setting expense logging permissions:", error);
    return false;
  }
}

export async function setProjectStageAccess(permissions: Record<ProjectStatusType, UserRole[]>): Promise<boolean> {
  try {
    const settingsDocRef = doc(db, GLOBAL_SETTINGS_COLLECTION, MAIN_SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      await updateDoc(settingsDocRef, { projectStageAccess: permissions });
    } else {
      const initialData: GlobalSettings = {
        ...DEFAULT_GLOBAL_SETTINGS,
        projectStageAccess: permissions,
      };
      await setDoc(settingsDocRef, initialData);
    }
    return true;
  } catch (error) {
    console.error("Error setting project stage access permissions:", error);
    return false;
  }
}


export async function setMaintenanceMode(
  enabled: boolean,
  message: string | null
): Promise<boolean> {
  try {
    const settingsDocRef = doc(db, GLOBAL_SETTINGS_COLLECTION, MAIN_SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsDocRef);
    const updates = {
      maintenanceMode: enabled,
      maintenanceMessage: message ?? DEFAULT_GLOBAL_SETTINGS.maintenanceMessage,
    };

    if (docSnap.exists()) {
      await updateDoc(settingsDocRef, updates);
    } else {
      await setDoc(settingsDocRef, { ...DEFAULT_GLOBAL_SETTINGS, ...updates });
    }
    return true;
  } catch (error) {
    console.error("Error setting maintenance mode:", error);
    return false;
  }
}

// Sets the notification templates for DR assignment
export async function setDrAssignmentNotificationTemplates(
  title: string | null,
  body: string | null
): Promise<boolean> {
  try {
    const settingsDocRef = doc(db, GLOBAL_SETTINGS_COLLECTION, MAIN_SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsDocRef);
    const updates: Partial<GlobalSettings> = {};
    if (title !== null) {
      updates.drAssignmentNotificationTitle = title;
    }
    if (body !== null) {
      updates.drAssignmentNotificationBody = body;
    }

    if (Object.keys(updates).length > 0) {
      if (docSnap.exists()) {
        await updateDoc(settingsDocRef, updates);
      } else {
        await setDoc(settingsDocRef, { ...DEFAULT_GLOBAL_SETTINGS, ...updates });
      }
    }
    return true;
  } catch (error) {
    console.error("Error setting DR assignment notification templates:", error);
    return false;
  }
}

// New function to set the report product filters
export async function setReportProductFilters(filters: string[]): Promise<boolean> {
  try {
    const settingsDocRef = doc(db, GLOBAL_SETTINGS_COLLECTION, MAIN_SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      await updateDoc(settingsDocRef, { reportProductFilters: filters });
    } else {
      const initialData: GlobalSettings = {
        ...DEFAULT_GLOBAL_SETTINGS,
        reportProductFilters: filters,
      };
      await setDoc(settingsDocRef, initialData);
    }
    return true;
  } catch (error) {
    console.error("Error setting report product filters:", error);
    return false;
  }
}
