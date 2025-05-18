
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
  customerName: string; 
  companyName: string;
  address: string;
  phoneNumber: string; 
  model: string; 
  quantity: number; 
  lamination: string; 
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
  text: string;
  timestamp: string; // ISO string
  isInternal: boolean; 
}

export interface ServiceModelItem {
  id: string;
  name: string;
}

export interface ServiceLaminationItem {
  id: string;
  name: string;
}
    