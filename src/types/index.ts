
export type UserRole = "ADMIN" | "CRM" | "DESIGNER_REPRESENTATIVE" | "SYSTEM_ADMIN" | "VENDOR";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyName?: string | null;
  password?: string;
  avatarUrl?: string | null;
  monthlyOrderTarget?: number | null;
  weeklyOrderTarget?: number | null;
  isBanned?: boolean;
  fcmToken?: string | null;
}

export interface CustomStatus {
  id: string;
  name: string;
  color: string;
  isSystemStatus?: boolean;
  isVisible?: boolean;
  allowedRoles?: UserRole[];
}

export interface OrderLogEntry {
  id: string;
  timestamp: string; // ISO string
  status: string; //  ID of a CustomStatus
  changedByUserId: string;
  changedByUserName: string;
  notes?: string;
}

export interface OrderItem {
  id: string; // Unique ID for this specific item in the order
  model: string;
  quantity: number;
  lamination: string;
  unitPrice: number;
  lineItemTotalPrice: number;
}

export interface AdvancePaymentRecord {
  id: string; // Unique ID for this payment record
  amount: number;
  date: string; // ISO string when the payment was recorded
  paymentMethod?: string | null;
  notes?: string | null;
  recordedByUserId: string;
  recordedByUserName: string;
}

export interface TrackingLink {
  id: string;
  companyName: string;
  address: string;
  phoneNumber: string;
  orderItems: OrderItem[];
  /** @deprecated Use advancePayments array instead. This field might hold a legacy total or be null. */
  advancePayment?: number | null;
  specialClientDiscount?: number | null;
  /** @deprecated Payment method is now part of each AdvancePaymentRecord. This might hold legacy data. */
  paymentMethod?: string | null;
  orderNotes?: string | null;
  crmUserId: string;
  crmUserName: string;
  designerRepresentativeId?: string | null;
  designerRepresentativeName?: string | null;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string for last edit of order details
  updatedByUserId?: string;
  updatedByUserName?: string;
  isPublic: boolean;
  currentStatus: string; // ID of a CustomStatus
  statusHistory: OrderLogEntry[];
  comments: Comment[];
  viewCount?: number;
  advancePayments?: AdvancePaymentRecord[]; // New field for payment history
}

export interface Comment {
  id: string;
  userId?: string | null;
  userName: string;
  userRole?: UserRole | 'Client';
  text: string;
  timestamp: string; // ISO string
  isInternal: boolean;
  replies?: Comment[];
  likes?: {
    count: number;
    reactedBy: string[];
  };
}

export interface ServiceModelItem {
  id: string;
  name: string;
  buyingPrice?: number;
  sellingPrice?: number;
}

export interface ServiceLaminationItem {
  id: string;
  name: string;
}

export interface ServicePaymentMethodItem {
  id: string;
  name: string;
}

export type ExpenseLoggingMode = "all" | "none" | "specificRoles" | "specificUsers";

export interface ExpenseLoggingPermissions {
  mode: ExpenseLoggingMode;
  allowedRoles: UserRole[];
  allowedUserIds: string[];
}

export interface GlobalSettings {
  globalMonthlyOrderTarget: number;
  globalWeeklyOrderTarget: number;
  crmCompletionStatusIds?: string[];
  areCommentsVisibleOnPublicPage?: boolean;
  rolesAllowedToEditOrders?: UserRole[];
  toastSoundUrl?: string | null;
  leaderboardBackgroundImageUrl?: string | null;
  leaderboardThemeSettings?: LeaderboardThemeSettings | null;
  expenseLoggingPermissions?: ExpenseLoggingPermissions;
}

export interface LeaderboardThemeSettings {
  backgroundMainStart?: string;
  backgroundMainEnd?: string;
  podiumBackground?: string;
  textLight?: string;
  listAreaBackground?: string;
  listItemBackground?: string;
  listItemBackgroundDark?: string;
  listText?: string;
  listTextDark?: string;
  goldColor?: string;
  rankBadgeBackground?: string;
  rankBadgeText?: string;
  arrowUpColor?: string;
  arrowDownColor?: string;
  subtleBorderColor?: string;
}

export interface RevenueEntry {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO string
  userId: string;
}

export interface ExpenseEntry {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO string
  userId: string;
}

export interface Appointment {
  id: string;
  title: string;
  date: string; // ISO string for full datetime
  description?: string;
  userId: string;
}

export type TransactionType = 'income' | 'expense' | 'purchase';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  category: string;
  description?: string | null;
  date: string; // ISO string
  createdAt: string; // ISO string
  sentToUserId?: string | null;
  sentToUserName?: string | null;
  receivedFromUserId?: string | null;
  receivedFromUserName?: string | null;
  documentUrl?: string | null; // Added documentUrl for attachments
}

export interface PersonalNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export type ProjectStatusType = 'CR Clearance' | 'Cancel' | 'On Design' | 'On Hold' | 'Logistics' | 'Courier' | 'Delivered';

export interface Project {
  id: string;
  projectIdDisplay: string;
  name: string;
  status: ProjectStatusType;
  endDate: string;
  assigneeName: string; // This is the CRM.
  assigneeInitials?: string;
  assigneeAvatarUrl?: string | null;
  categoryTag: string;
  createdAt?: string;
  updatedAt?: string;

  crClearanceAt?: string;
  cancelAt?: string;
  onDesignAt?: string;
  onHoldAt?: string;
  logisticsAt?: string;
  courierAt?: string;
  deliveredAt?: string;

  designerRepresentativeId?: string | null;
  designerRepresentativeName?: string | null;
  designerRepresentativeAvatarUrl?: string | null;
}
