
export type UserRole = "ADMIN" | "CRM" | "DESIGNER_REPRESENTATIVE" | "SYSTEM_ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyName?: string | null; // Allow null
  password?: string; 
  avatarUrl?: string | null; // Allow null
  monthlyOrderTarget?: number | null; // Allow null
  weeklyOrderTarget?: number | null; // Allow null
  isBanned?: boolean; // New field for ban status
}

export interface CustomStatus {
  id: string;
  name: string;
  color: string;
  isSystemStatus?: boolean; 
  isVisible?: boolean;
}

export interface OrderLogEntry {
  id: string;
  timestamp: string; // ISO string
  status: string; //  ID of a CustomStatus
  changedByUserId: string;
  changedByUserName: string;
  notes?: string;
}

export interface TrackingLink {
  id: string; 
  customerName: string; // This is now effectively the contact person name
  companyName: string;
  address: string;
  phoneNumber?: string | null; // Allow null
  service?: string | null; // Allow null - Will be phased out by new fields
  model?: string | null; // New field
  quantity?: number | null; // New field
  lamination?: string | null; // New field
  crmUserId: string;
  crmUserName: string;
  designerRepresentativeId?: string | null; // Allow null
  designerRepresentativeName?: string | null; // Allow null
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
  text: string;
  timestamp: string; // ISO string
  isInternal: boolean; 
}

    