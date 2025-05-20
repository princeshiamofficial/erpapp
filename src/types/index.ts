
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
  sheet?: number | null;
  price?: number | null; // This is likely the total price for this line item
}

export interface TrackingLink {
  id: string;
  // customerName: string; // To be removed or kept if different from company contact
  companyName: string;
  address: string;
  phoneNumber: string;
  orderItems: OrderItem[];
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
    reactedBy: string[];
  };
}

export interface ServiceModelItem {
  id: string;
  name: string;
  price?: number; // Price for this model
}

export interface ServiceLaminationItem {
  id: string;
  name: string;
}

// For settings-service
export interface GlobalSettings {
  globalMonthlyOrderTarget: number;
  globalWeeklyOrderTarget: number;
  crmCompletionStatusIds?: string[];
  areCommentsVisibleOnPublicPage?: boolean;
}
