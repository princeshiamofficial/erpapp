
export type UserRole = "ADMIN" | "CRM" | "DESIGNER_REPRESENTATIVE" | "SYSTEM_ADMIN";

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
  fcmToken?: string | null; // Added FCM token field
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
  unitPrice: number; // This will be derived from model's sellingPrice
  lineItemTotalPrice: number;
}

export interface TrackingLink {
  id: string;
  // customerName is effectively companyName for B2B or contact person if needed elsewhere
  companyName: string; // Will store "Company ID • Company Name"
  address: string;
  phoneNumber: string;
  orderItems: OrderItem[];
  advancePayment?: number | null;
  paymentMethod?: string | null;
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
    reactedBy: string[]; // Array of user IDs or client-generated IDs
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

// For settings-service
export interface GlobalSettings {
  globalMonthlyOrderTarget: number;
  globalWeeklyOrderTarget: number;
  crmCompletionStatusIds?: string[];
  areCommentsVisibleOnPublicPage?: boolean;
  rolesAllowedToEditOrders?: UserRole[];
}

// --- ERP & Finance Manager Specific Types ---
export interface RevenueEntry {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO string
  userId: string; // Associate with the user who logged it for the ERP
}

export interface ExpenseEntry {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO string
  userId: string; // Associate with the user who logged it for the ERP
}

export interface Appointment {
  id: string;
  title: string;
  date: string; // ISO string for full datetime
  description?: string;
  userId: string; // User this appointment belongs to, or a general ID if for the business
}

export type TransactionType = 'income' | 'expense' | 'purchase';

export interface Transaction {
  id: string;
  userId: string; // ID of the user this transaction belongs to
  type: TransactionType;
  amount: number;
  category: string; // User-defined category
  description?: string;
  date: string; // ISO string
  createdAt: string; // ISO string
}

export interface PersonalNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// --- Project Management Types ---
export type ProjectStatusType = 'CR Clearance' | 'CR Cancel' | 'On Design' | 'On Hold' | 'Logistics' | 'Courier';


export interface Project {
  id: string; // Firestore document ID
  projectIdDisplay: string;
  name: string;
  status: ProjectStatusType;
  endDate: string; // Stored as ISO string (e.g., "2025-06-06T00:00:00.000Z") or formatted "MM/DD/YYYY"
  assigneeName: string;
  assigneeInitials?: string;
  categoryTag: string;
  createdAt?: string; // ISO string
  updatedAt?: string; // ISO string
  // Fields for filtering if not derived client-side
  // categoryFilterKey?: string; 
  // endDateFilterKey?: string; 
}
