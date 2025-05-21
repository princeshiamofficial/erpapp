
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

export interface TrackingLink {
  id: string;
  customerName?: string | null; // This can be the contact person
  companyName: string;
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
  price?: number;
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
  isOrderEditingEnabled?: boolean; // true means CRM, DR, Admin can edit. System Admin always can.
}
