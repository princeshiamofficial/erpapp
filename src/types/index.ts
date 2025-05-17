
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

// OrderStatus union type is removed. Statuses are now represented by CustomStatus.id (string).

export interface CustomStatus {
  id: string;
  name: string;
  color: string;
  isSystemStatus?: boolean; // True if it's a default status that can't be deleted/renamed easily
}

export interface OrderLogEntry {
  id: string;
  timestamp: string; // ISO string
  status: string; // Now stores the ID of a CustomStatus
  changedByUserId: string;
  changedByUserName: string;
  notes?: string;
}

// This type represents an Order and its associated Tracking Link information
export interface TrackingLink {
  id: string; // Unique, unguessable order ID (Firestore document ID)
  customerName: string;
  companyName: string;
  address: string; 
  phoneNumber?: string; 
  service?: string; 
  crmUserId: string;
  crmUserName: string;
  designerRepresentativeId?: string; 
  designerRepresentativeName?: string;
  createdAt: string; // ISO string
  isPublic: boolean;
  currentStatus: string; // Now stores the ID of a CustomStatus
  statusHistory: OrderLogEntry[];
  comments: Comment[]; 
}

export interface Comment {
  id: string;
  userId?: string;
  userName: string; 
  text: string;
  timestamp: string; // ISO string
  isInternal: boolean; 
}
