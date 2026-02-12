"use server";

import { query } from './mysql';
import type { GlobalSettings, UserRole, ExpenseLoggingPermissions, ProjectStatusType, RoleBasedTarget, PipelineAccessSettings, LeadCategory, LeadCategoryAccessSettings } from '@/types';

const GLOBAL_SETTINGS_TABLE = 'global_settings';
const MAIN_SETTINGS_ID = 'main';

const DEFAULT_TOAST_SOUND_URL = 'https://audio-previews.elements.envatousercontent.com/files/225140761/preview.mp3';
const DEFAULT_LEADERBOARD_BACKGROUND_URL = 'https://i.ibb.co/PGBMbxBc/360-F-338486227-q-Qit-Uvh3n-ILq-Yiu-QOUGxdfindo-NMbtp-H.jpg';

const DEFAULT_EXPENSE_LOGGING_PERMISSIONS: ExpenseLoggingPermissions = {
  mode: "all",
  allowedRoles: [],
  allowedUserIds: []
};

const DEFAULT_PROJECT_STAGE_ACCESS: Record<ProjectStatusType, UserRole[]> = {
  'CR Clearance': ['SYSTEM_ADMIN', 'ADMIN', 'CRM'],
  'CO Clearance': ['SYSTEM_ADMIN', 'ADMIN', 'CO'],
  'Cancel': ['SYSTEM_ADMIN', 'ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'],
  'On Design': ['SYSTEM_ADMIN', 'ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'],
  'On Hold': ['SYSTEM_ADMIN', 'ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'],
  'Logistics': ['SYSTEM_ADMIN', 'ADMIN', 'DESIGNER_REPRESENTATIVE', 'LR'],
  'Courier': ['SYSTEM_ADMIN', 'ADMIN', 'LR'],
  'Delivered': ['SYSTEM_ADMIN', 'ADMIN', 'LR'],
};

const DEFAULT_LEAD_CATEGORY_ACCESS: Record<LeadCategory, LeadCategoryAccessSettings> = {
  'POP': { roles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'], specialAccess: [] },
  'POG': { roles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'], specialAccess: [] },
  'OC': { roles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'], specialAccess: [] },
  'OD': { roles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'], specialAccess: [] },
  'ROD': { roles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'], specialAccess: [] },
};

const DEFAULT_ROLE_BASED_TARGETS: RoleBasedTarget = {
  CRM: 50,
  DESIGNER_REPRESENTATIVE: 20,
  LR: 100,
};

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  globalMonthlyOrderTarget: 0,
  globalWeeklyOrderTarget: 0,
  crmCompletionStatusIds: [],
  areCommentsVisibleOnPublicPage: true,
  rolesAllowedToEditOrders: ['SYSTEM_ADMIN', 'ADMIN'],
  rolesAllowedToDeleteOrders: ['SYSTEM_ADMIN'],
  rolesAllowedToViewFinancials: ['SYSTEM_ADMIN', 'ADMIN'],
  isPaymentValidationEnabled: true,
  isLeaderboardRestrictedToAdmin: false,
  toastSoundUrl: DEFAULT_TOAST_SOUND_URL,
  leaderboardBackgroundImageUrl: DEFAULT_LEADERBOARD_BACKGROUND_URL,
  expenseLoggingPermissions: DEFAULT_EXPENSE_LOGGING_PERMISSIONS,
  projectStageAccess: DEFAULT_PROJECT_STAGE_ACCESS,
  leadCategoryAccess: DEFAULT_LEAD_CATEGORY_ACCESS,
  maintenanceMode: false,
  maintenanceMessage: "The application is currently down for maintenance. We'll be back shortly!",
  drAssignmentNotificationTitle: 'New Design Assigned By %assignerName%',
  drAssignmentNotificationBody: 'You have been assigned to a new design order: %orderId%.',
  reportProductFilters: ['Design Charge', 'Menu Book', 'Menu Card', 'Pizza Box', 'X-Banner', 'Business Card', 'Visiting Card'],
  roleBasedTargets: DEFAULT_ROLE_BASED_TARGETS,
  pipelineAccess: { canViewAllLeads: [] },
};

export async function getGlobalSettings(): Promise<GlobalSettings> {
  try {
    const results = await query<any[]>(`SELECT settings_json FROM ${GLOBAL_SETTINGS_TABLE} WHERE id = ?`, [MAIN_SETTINGS_ID]);

    if (results.length > 0) {
      const data = typeof results[0].settings_json === 'string' ? JSON.parse(results[0].settings_json) : results[0].settings_json;
      // Note: Full merging logic from Firestore is replaced by a simple spread for brevity, 
      // but in production, you'd want to ensure all keys exist.
      return { ...DEFAULT_GLOBAL_SETTINGS, ...data };
    } else {
      await query(`INSERT INTO ${GLOBAL_SETTINGS_TABLE} (id, settings_json) VALUES (?, ?)`, [MAIN_SETTINGS_ID, JSON.stringify(DEFAULT_GLOBAL_SETTINGS)]);
      return DEFAULT_GLOBAL_SETTINGS;
    }
  } catch (error) {
    console.error("Error fetching global settings from MySQL:", error);
    return DEFAULT_GLOBAL_SETTINGS;
  }
}

async function updateSettings(updates: Partial<GlobalSettings>): Promise<boolean> {
  try {
    const current = await getGlobalSettings();
    const updated = { ...current, ...updates };
    await query(`UPDATE ${GLOBAL_SETTINGS_TABLE} SET settings_json = ? WHERE id = ?`, [JSON.stringify(updated), MAIN_SETTINGS_ID]);
    return true;
  } catch (error) {
    console.error("Error updating global settings in MySQL:", error);
    return false;
  }
}

export async function updateGlobalSalesTarget(targetType: 'monthly' | 'weekly', newTarget: number): Promise<boolean> {
  const fieldToUpdate = targetType === 'monthly' ? 'globalMonthlyOrderTarget' : 'globalWeeklyOrderTarget';
  return updateSettings({ [fieldToUpdate]: newTarget });
}

export async function setCrmCompletionStatusIds(statusIds: string[]): Promise<boolean> {
  return updateSettings({ crmCompletionStatusIds: statusIds });
}

export async function getCrmCompletionStatusIds(): Promise<string[]> {
  const settings = await getGlobalSettings();
  return settings.crmCompletionStatusIds ?? [];
}

export async function setCommentsVisibility(isVisible: boolean): Promise<boolean> {
  return updateSettings({ areCommentsVisibleOnPublicPage: isVisible });
}

export async function setRolesAllowedToEditOrders(roles: UserRole[]): Promise<boolean> {
  return updateSettings({ rolesAllowedToEditOrders: roles });
}

export async function setRolesAllowedToDeleteOrders(roles: UserRole[]): Promise<boolean> {
  return updateSettings({ rolesAllowedToDeleteOrders: roles });
}

export async function setRolesAllowedToViewFinancials(roles: UserRole[]): Promise<boolean> {
  return updateSettings({ rolesAllowedToViewFinancials: roles });
}

export async function setPaymentValidationStatus(enabled: boolean): Promise<boolean> {
  return updateSettings({ isPaymentValidationEnabled: enabled });
}

export async function setLeaderboardRestriction(restricted: boolean): Promise<boolean> {
  return updateSettings({ isLeaderboardRestrictedToAdmin: restricted });
}

export async function setPipelineAccess(permissions: PipelineAccessSettings): Promise<boolean> {
  return updateSettings({ pipelineAccess: permissions });
}

export async function setToastSoundUrl(soundUrl: string | null): Promise<boolean> {
  return updateSettings({ toastSoundUrl: soundUrl });
}

export async function setLeaderboardBackgroundImageUrl(imageUrl: string | null): Promise<boolean> {
  return updateSettings({ leaderboardBackgroundImageUrl: imageUrl });
}

export async function setExpenseLoggingPermissions(permissions: ExpenseLoggingPermissions): Promise<boolean> {
  return updateSettings({ expenseLoggingPermissions: permissions });
}

export async function setProjectStageAccess(permissions: Record<ProjectStatusType, UserRole[]>): Promise<boolean> {
  return updateSettings({ projectStageAccess: permissions });
}

export async function setLeadCategoryAccess(permissions: Record<LeadCategory, LeadCategoryAccessSettings>): Promise<boolean> {
  return updateSettings({ leadCategoryAccess: permissions });
}

export async function setMaintenanceMode(enabled: boolean, message: string | null): Promise<boolean> {
  return updateSettings({ maintenanceMode: enabled, maintenanceMessage: message });
}

export async function setDrAssignmentNotificationTemplates(title: string | null, body: string | null): Promise<boolean> {
  const updates: any = {};
  if (title !== null) updates.drAssignmentNotificationTitle = title;
  if (body !== null) updates.drAssignmentNotificationBody = body;
  return updateSettings(updates);
}

export async function setReportProductFilters(filters: string[]): Promise<boolean> {
  return updateSettings({ reportProductFilters: filters });
}

export async function setRoleBasedTargets(targets: RoleBasedTarget): Promise<boolean> {
  return updateSettings({ roleBasedTargets: targets });
}

export async function setTelegramSettings(botToken: string | null, chatIds: string[] | null): Promise<boolean> {
  return updateSettings({ telegramBotToken: botToken, telegramChatIds: chatIds ?? [] });
}
