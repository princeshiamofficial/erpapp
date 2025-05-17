
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
}

export interface CustomStatus {
  id: string;
  name: string;
  color: string;
  isSystemStatus?: boolean; 
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
  phoneNumber?: string | null; // Allow null
  service?: string | null; // Allow null
  crmUserId: string;
  crmUserName: string;
  designerRepresentativeId?: string | null; // Allow null
  designerRepresentativeName?: string | null; // Allow null
  createdAt: string; // ISO string
  isPublic: boolean;
  currentStatus: string; // ID of a CustomStatus
  statusHistory: OrderLogEntry[];
  comments: Comment[];
}

export interface Comment {
  id: string;
  userId?: string; // Optional: ID of the user who made the comment if they are an app user
  userName: string; // Name of the person who commented (can be client name or app user name)
  text: string;
  timestamp: string; // ISO string
  isInternal: boolean; // True if comment is only for internal team members
}

    