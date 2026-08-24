"use server";

import { query } from './mysql';
import type { GlobalSettings, UserRole, ExpenseLoggingPermissions, ProjectStatusType, RoleBasedTarget, PipelineAccessSettings, LeadCategory, LeadCategoryAccessSettings, TransactionCategory } from '@/types';

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
  'Project Pending': ['SYSTEM_ADMIN', 'ADMIN', 'CRM'],
  'CR Clearance': ['SYSTEM_ADMIN', 'ADMIN', 'CRM'],
  'Docs Pending': ['SYSTEM_ADMIN', 'ADMIN', 'CRM'],
  'CO Clearance': ['SYSTEM_ADMIN', 'ADMIN', 'CO'],
  'Cancel': ['SYSTEM_ADMIN', 'ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'],
  'On Design': ['SYSTEM_ADMIN', 'ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'],
  'On Hold': ['SYSTEM_ADMIN', 'ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'],
  'Logistics': ['SYSTEM_ADMIN', 'ADMIN', 'DESIGNER_REPRESENTATIVE', 'LR'],
  'Courier': ['SYSTEM_ADMIN', 'ADMIN', 'LR'],
  'Delivered': ['SYSTEM_ADMIN', 'ADMIN', 'LR'],
  'Business Closed': ['SYSTEM_ADMIN', 'ADMIN', 'CRM'],
};

const DEFAULT_LEAD_CATEGORY_ACCESS: Record<LeadCategory, LeadCategoryAccessSettings> = {
  'POP': { roles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'], specialAccess: [] },
  'POG': { roles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'], specialAccess: [] },
  'OC': { roles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'], specialAccess: [] },
  'OD': { roles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'], specialAccess: [] },
  'ROD': { roles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'], specialAccess: [] },
  'APPOINTMENT': { roles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'], specialAccess: [] },
  'PROSPECT': { roles: ['SYSTEM_ADMIN', 'ADMIN', 'CRM'], specialAccess: [] },
};

const DEFAULT_ROLE_BASED_TARGETS: RoleBasedTarget = {
  CRM: 50,
  DESIGNER_REPRESENTATIVE: 20,
  LR: 100,
};

const DEFAULT_TRANSACTION_CATEGORIES: TransactionCategory[] = [
  { id: "office-rent", value: "Office Rent", label: "Office Rent", icon: "Home", colorClass: "text-green-600", type: "expense", isSystem: true },
  { id: "utilities", value: "Utilities", label: "Utilities (Gas, Water, Electric)", icon: "Lightbulb", colorClass: "text-yellow-600", type: "expense", isSystem: true },
  { id: "transportation", value: "Transportation", label: "Transportation", icon: "Car", colorClass: "text-blue-600", type: "expense", isSystem: true },
  { id: "office-supplies", value: "Office Supplies", label: "Office Supplies", icon: "ClipboardIcon", colorClass: "text-indigo-600", type: "expense", isSystem: true },
  { id: "food-drinks", value: "Food & Drinks", label: "Food & Drinks", icon: "Utensils", colorClass: "text-orange-600", type: "expense", isSystem: true },
  { id: "marketing", value: "Marketing", label: "Marketing", icon: "Megaphone", colorClass: "text-pink-600", type: "expense", isSystem: true },
  { id: "purchase", value: "Purchase", label: "Purchase", icon: "ShoppingBag", colorClass: "text-sky-600", type: "purchase", isSystem: true },
  { id: "withdraw", value: "Withdraw", label: "Withdraw", icon: "Banknote", colorClass: "text-rose-600", type: "expense", isSystem: true },
  { id: "official-expend", value: "Official Expend", label: "Official Expend", icon: "Briefcase", colorClass: "text-gray-600", type: "expense", isSystem: true },
  { id: "miscellaneous", value: "Miscellaneous", label: "Miscellaneous", icon: "Braces", colorClass: "text-purple-600", type: "expense", isSystem: true },
];

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
  showAvatarsInOrders: true,
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
  transactionCategories: DEFAULT_TRANSACTION_CATEGORIES,
  telegramRedirectDomain: 'https://app.colorhutbd.xyz',
  telegramScheduleChannelId: '-1004447610171',
  isCourierNoteVisible: true,
  designApprovalStatusIds: [],
  docsApprovalStatusIds: [],
  salaryTransferBankName: "UNITED COMM. BANK",
  salaryTransferBankAccountNo: "0872101000007053",
};

export async function getGlobalSettings(): Promise<GlobalSettings> {
  try {
    const results = await query<any[]>(`SELECT settings_json FROM ${GLOBAL_SETTINGS_TABLE} WHERE id = ?`, [MAIN_SETTINGS_ID]);

    if (results.length > 0) {
      const data = typeof results[0].settings_json === 'string' ? JSON.parse(results[0].settings_json) : results[0].settings_json;
      // Note: Full merging logic from Firestore is replaced by a simple spread for brevity, 
      // but in production, you'd want to ensure all keys exist.
      const mergedProjectStageAccess = {
        ...DEFAULT_PROJECT_STAGE_ACCESS,
        ...(data.projectStageAccess || {})
      };
      return {
        ...DEFAULT_GLOBAL_SETTINGS,
        ...data,
        projectStageAccess: mergedProjectStageAccess
      };
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

export async function setShowAvatarsInOrders(show: boolean): Promise<boolean> {
  return updateSettings({ showAvatarsInOrders: show });
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

export async function setTelegramSettings(botToken: string | null, chatIds: string[] | null, redirectDomain: string | null, scheduleChannelId?: string | null): Promise<boolean> {
  return updateSettings({ telegramBotToken: botToken, telegramChatIds: chatIds ?? [], telegramRedirectDomain: redirectDomain, telegramScheduleChannelId: scheduleChannelId ?? null });
}

export async function setTransactionCategories(categories: any[]): Promise<boolean> {
  return updateSettings({ transactionCategories: categories });
}

export async function setCourierNoteVisibility(isVisible: boolean): Promise<boolean> {
  return updateSettings({ isCourierNoteVisible: isVisible });
}

export async function setDesignApprovalStatusIds(statusIds: string[]): Promise<boolean> {
  return updateSettings({ designApprovalStatusIds: statusIds });
}

export async function setDocsApprovalStatusIds(statusIds: string[]): Promise<boolean> {
  return updateSettings({ docsApprovalStatusIds: statusIds });
}

export async function setSalaryTransferBankSettings(bankName: string | null, accountNo: string | null): Promise<boolean> {
  return updateSettings({
    salaryTransferBankName: bankName,
    salaryTransferBankAccountNo: accountNo,
  });
}
