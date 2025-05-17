
export type UserRole = "ADMIN" | "CRM" | "DESIGNER_REPRESENTATIVE" | "SYSTEM_ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyName?: string;
  password?: string; // Added for login, should not be stored long-term in client state after auth
  avatarUrl?: string; // Added for profile picture
  monthlyOrderTarget?: number;
  weeklyOrderTarget?: number;
}

export type OrderStatus =
  | "IDEA_SUBMITTED"
  | "DESIGN_IN_PROGRESS"
  | "PENDING_CLIENT_APPROVAL"
  | "CHANGES_REQUESTED"
  | "APPROVED_FOR_PRODUCTION"
  | "READY_FOR_DESIGN" // New status
  | "IN_PRODUCTION"
  | "QUALITY_CHECK"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "ON_HOLD";

export interface OrderLogEntry {
  id: string;
  timestamp: string; // ISO string
  status: OrderStatus;
  changedByUserId: string;
  changedByUserName: string;
  notes?: string;
}

// This type represents an Order and its associated Tracking Link information
export interface TrackingLink {
  id: string; // Unique, unguessable order ID
  customerName: string;
  companyName: string;
  address: string; // Added as per requirement for CRM input
  crmUserId: string;
  crmUserName: string;
  createdAt: string; // ISO string
  isPublic: boolean;
  currentStatus: OrderStatus;
  statusHistory: OrderLogEntry[];
  comments: Comment[]; // Public comments associated with this order/link
  // designerRepresentativeId?: string; // Optional: If a specific DR is assigned
}

export interface Comment {
  id: string;
  // trackingLinkId: string; // Comments are now part of TrackingLink.comments
  userId?: string;
  userName: string; // Can be customer name, or internal user name
  text: string;
  timestamp: string; // ISO string
  isInternal: boolean; // Differentiates public client comments from internal team comments
}
