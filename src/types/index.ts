export type UserRole = string;

export interface UserRoleDefinition {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  priority: number; // Added for ordering
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyName?: string | null;
  phone?: string | null;
  address?: string | null; // Added for Vendors
  category?: string | null;
  password?: string;
  avatarUrl?: string | null;
  monthlyOrderTarget?: number | null;
  weeklyOrderTarget?: number | null;
  isBanned?: boolean;
  fcmToken?: string | null;
  feedback?: Feedback[];
  isLeader?: boolean; // New field for CRM leaders
}

export interface SalaryIncrement {
  date: string; // ISO string
  previousSalary: number;
  newSalary: number;
  incrementAmount: number;
}

export interface LeaveRecord {
  id: string;
  date: string; // ISO string for when the leave was taken/recorded
  allDates?: string[]; // Multiple selected dates (ISO strings)
  days: number;
  reason: string;
  recordedByUserId: string;
  recordedByUserName: string;
}

export interface Payslip {
  id: string; // e.g., '2024-07-CRM-001'
  employeeId: string;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  fine: number;
  incentive: number;
  trainingFee?: number;
  advance?: number; // New field for salary advance
  providentFund: number; // New field to store PF amount
  payableAmount: number; // Storing the calculated amount for record-keeping
  paymentStatus: 'Paid' | 'Unpaid'; // New field
  updatedAt: string; // ISO string
}

export interface ProvidentFundRecord {
  id: string; // e.g., '2024-07-employeeId'
  employeeId: string;
  employeeName: string;
  month: string; // YYYY-MM
  amount: number;
  status: 'Paid' | 'Unpaid';
  updatedAt: string;
}

export interface Employee {
  id: string; // Firestore document ID
  employeeId: string; // e.g., EMP-001
  userId?: string | null; // Foreign key to the User collection
  name: string;
  email?: string | null;
  mobileNo: string;
  address?: string | null;
  dob: string; // ISO string date
  designation: string;
  joiningDate: string; // ISO string date
  status: 'Active' | 'Inactive';
  statusChangeDate?: string | null; // New field for inactive/reactive date
  avatarUrl?: string | null;
  salary?: number | null;
  payslips?: { [key: string]: Payslip }; // Optional map of payslips
  salaryHistory?: SalaryIncrement[];
  yearlyLeave?: number;
  leaveTaken?: number;
  leaveHistory?: LeaveRecord[];
  nationalId?: string; // New Field for National ID
  accountNo?: string;  // New Field for Bank Account Number
  providentFundStatus?: 'Active' | 'Inactive';
  incentive?: number;
}

export interface Vendor {
  id: string;
  vendorId: string; // V-001
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  category: string; // e.g., 'Printing', 'Materials', 'Logistics'
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface CustomStatus {
  id: string;
  xid: string; // A custom, URL-friendly identifier
  name: string;
  color: string;
  isSystemStatus?: boolean;
  isVisible?: boolean;
  allowedRoles?: UserRole[];
  isDeleted?: boolean;
}

export interface OrderLogEntry {
  id: string;
  timestamp: string; // ISO string
  status: string; //  ID of a CustomStatus
  changedByUserId: string;
  changedByUserName: string;
  notes?: string;
  type?: string; 
}

export interface OrderItem {
  id: string; // Unique ID for this specific item in the order
  model: string;
  quantity: number;
  lamination: string;
  unitPrice: number;
  lineItemTotalPrice: number;
  isGift?: boolean;
}

export interface AdvancePaymentRecord {
  id: string; // Unique ID for this payment record
  amount: number;
  date: string; // ISO string when the payment was recorded
  paymentMethod?: string | null;
  notes?: string | null;
  recordedByUserId: string;
  recordedByUserName: string;
  documentUrl?: string | null;
  status?: 'Pending' | 'Approved'; // New field for status
}

export interface Feedback {
  id: string;
  orderId: string;
  companyName: string;
  rating: number;
  text: string;
  submittedAt: string; // ISO string
  crmUserId?: string;
  crmUserName?: string;
  designerRepresentativeId?: string | null;
  designerRepresentativeName?: string | null;
}

export interface TrackingLink {
  id: string;
  clientId?: string | null;
  projectIdDisplay?: string; // New field for TD-XXX or ORD-XXX
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
  assigneeAvatarUrl?: string | null;
  designerRepresentativeAvatarUrl?: string | null;
  createdAt: string; // ISO string
  acceptedDeliveryDate?: string | null; // ISO string
  updatedAt?: string; // ISO string for last edit of order details
  updatedByUserId?: string;
  updatedByUserName?: string;
  isPublic: boolean;
  isStarred?: number;
  currentStatus: string; // ID of a CustomStatus
  statusHistory: OrderLogEntry[];
  comments: Comment[];
  viewCount?: number;
  advancePayments?: AdvancePaymentRecord[]; // New field for payment history
  packzyConsignmentId?: string | null;
  packzyTrackingCode?: string | null;
  shippingArea?: string | null;
  shippingCharge?: number | null;
  courierNote?: string | null;
  feedback?: { // This field is now deprecated but kept for backwards compatibility
    submittedAt: string;
  };
  deletedAt?: string | null;
  deletedById?: string | null;
  deletedByName?: string | null;
  deletedByAvatarUrl?: string | null;
}

export interface Comment {
  id: string;
  userId?: string | null;
  userName: string;
  userRole?: UserRole | 'Client';
  text: string;
  isInternal: boolean;
  timestamp: string;
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
  imageUrl?: string | null;
  isReadyMade?: boolean;
  stockCount?: number;
  totalSold?: number;
}

export interface ServiceLaminationItem {
  id: string;
  name: string;
}

export interface ServicePaymentMethodItem {
  id: string;
  name: string;
}

export interface ServiceGiftItem {
  id: string;
  name: string;
}

export interface ServiceCourierNoteItem {
  id: string;
  name: string;
}


export type ExpenseLoggingMode = "all" | "none" | "specificRoles" | "specificUsers";

export interface ExpenseLoggingPermissions {
  mode: ExpenseLoggingMode;
  allowedRoles: UserRole[];
  allowedUserIds: string[];
}

export type ProjectStatusType = 'CR Clearance' | 'Docs Pending' | 'CO Clearance' | 'Cancel' | 'On Design' | 'On Hold' | 'Logistics' | 'Courier' | 'Delivered' | 'Business Closed';

export interface RoleBasedTarget {
  CRM: number;
  DESIGNER_REPRESENTATIVE: number;
  LR: number;
}

export interface PipelineAccessSettings {
  canViewAllLeads: string[]; // Array of CRM user IDs with special access
}

export type LeadCategory = 'POP' | 'POG' | 'OC' | 'OD' | 'ROD' | 'APPOINTMENT' | 'PROSPECT';

export interface LeadCategoryAccessSettings {
  roles: UserRole[];
  specialAccess: string[]; // Array of user IDs with special access
}

export interface GlobalSettings {
  globalMonthlyOrderTarget: number;
  globalWeeklyOrderTarget: number;
  crmCompletionStatusIds?: string[];
  areCommentsVisibleOnPublicPage?: boolean;
  rolesAllowedToEditOrders?: UserRole[];
  rolesAllowedToDeleteOrders?: UserRole[];
  rolesAllowedToViewFinancials?: UserRole[];
  isPaymentValidationEnabled?: boolean; // New setting
  isLeaderboardRestrictedToAdmin?: boolean; // New setting
  showAvatarsInOrders?: boolean; // New setting to toggle avatars in orders
  toastSoundUrl?: string | null;
  leaderboardBackgroundImageUrl?: string | null;
  leaderboardThemeSettings?: LeaderboardThemeSettings | null;
  expenseLoggingPermissions?: ExpenseLoggingPermissions;
  projectStageAccess?: Record<ProjectStatusType, UserRole[]>;
  leadCategoryAccess?: Record<LeadCategory, LeadCategoryAccessSettings>;
  maintenanceMode?: boolean;
  maintenanceMessage?: string | null;
  drAssignmentNotificationTitle?: string;
  drAssignmentNotificationBody?: string;
  reportProductFilters?: string[];
  roleBasedTargets?: RoleBasedTarget;
  pipelineAccess?: PipelineAccessSettings; // New setting
  telegramBotToken?: string | null;
  telegramChatIds?: string[] | null;
  telegramRedirectDomain?: string | null;
  transactionCategories?: TransactionCategory[]; // New field
  isCourierNoteVisible?: boolean;
}

export interface TransactionCategory {
  id: string;
  value: string;
  label: string;
  icon: string; // Lucide icon name
  colorClass: string;
  type: 'expense' | 'purchase';
  isSystem?: boolean;
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
  documentUrl?: string | null;
}

export interface PersonalNote {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}


export interface Project {
  id: string;
  projectIdDisplay: string;
  name: string;
  status: ProjectStatusType;
  endDate?: string | null;
  assigneeId: string;
  assigneeName: string; // This is the CRM.
  assigneeInitials?: string;
  assigneeAvatarUrl?: string | null;
  categoryTag: string;
  createdAt?: string;
  updatedAt?: string;

  crClearanceAt?: string | null;
  coClearanceAt?: string | null;
  cancelAt?: string | null;
  onDesignAt?: string | null;
  onHoldAt?: string | null;
  logisticsAt?: string | null;
  courierAt?: string | null;
  deliveredAt?: string | null;
  docsPendingAt?: string | null;
  businessClosedAt?: string | null;

  designerRepresentativeId?: string | null;
  designerRepresentativeName?: string | null;
  designerRepresentativeAvatarUrl?: string | null;
  isStarred?: number;
  isDocsApproved?: boolean;
  isDesignApproved?: boolean;
}

export type LeadStatusType = 'New Lead' | 'Contacted' | 'Qualified' | 'Proposal Sent' | 'Negotiation' | 'Won' | 'Lost';
export type CustomerType = 'WARM' | 'COLD' | 'Order Lock';

export interface LeadActivity {
  id: string;
  timestamp: string; // ISO string
  activity: string;
  notes?: string | null;
  changedByUserId: string;
  changedByUserName: string;
}

export interface Lead {
  id: string;
  date: string; // ISO string
  contactName: string;
  businessName: string;
  phone: string;
  source: string;
  address: string;
  division?: string | null;
  district?: string | null;
  thana?: string | null;
  category: LeadCategory;
  status: LeadStatusType;
  notes?: string | null;
  schedule?: string | null; // ISO string or null
  crmId: string;
  crmName: string;
  customerType?: CustomerType | null;
  activityHistory?: LeadActivity[];
  updatedAt?: string; // New field for last update timestamp
  categoryUpdatedAt?: string; // Specific field for last category update
}


export type FollowUpStatusType = string;

export interface FollowUpStatus {
  id: string;
  name: string;
  color: string;
  isSystemStatus: boolean;
  isVisible: boolean;
  allowedRoles: UserRole[];
  xid: string;
  displayOrder: number;
  icon?: string;
  headerBgClass?: string;
}

export interface FollowUpLog {
  id: string;
  timestamp: string; // ISO string
  outcome: string;
  notes?: string | null;
  scheduledNext?: string | null; // ISO string
  recordedByUserId: string;
  recordedByUserName: string;
}

export interface FollowUp {
  id: string;
  leadId?: string | null; // Optional link back to a lead
  date: string; // ISO string (initial engagement date)
  contactName: string;
  businessName: string;
  phone: string;
  address: string;
  district?: string | null;
  division?: string | null;
  status: FollowUpStatusType;
  crmId: string;
  crmName: string;
  jobId?: string | null;
  customerType?: CustomerType | null;
  history?: FollowUpLog[];
  updatedAt?: string;
}

export interface DistrictDataEntry {
  id?: string; // Optional Firestore ID
  jobId: string;
  businessName: string;
  address: string;
  phone: string;
  orderDate: string; // ISO String
  division?: string;
  district?: string;
}

export interface DistrictInfo {
  name: string;
  entries: DistrictDataEntry[];
}

export interface DivisionData {
  division: string;
  districts: DistrictInfo[];
}

export type PurchaseRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Purchased';

export interface PurchaseRequest {
  id: string;
  requestId: string;
  createdAt: string;
  updatedAt: string;
  item: string;
  quantity: number;
  status: PurchaseRequestStatus;
  requestedByUserId: string;
  requestedByUserName: string;
  notes?: string | null;
  price?: number | null;
  approvedByUserId?: string | null;
  approvedByUserName?: string | null;
}

export interface SowDataEntry {
  id: string;
  jobId: string;
  businessName: string;
  address: string;
  phoneNumber: string;
  category: string;
  amount?: number;
  createdAt: string; // ISO String for when SOW was created
  crmUserId: string;
  crmUserName: string;
}

export interface Gift {
  id: string;
  giftIdDisplay: string;
  giftItemName: string; // Kept for backwards compatibility if needed, but new data will use giftItemNames
  giftItemNames: string[]; // New field for multiple items
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  dateGiven: string; // ISO String
  givenByUserId: string;
  givenByUserName: string;
  notes?: string | null;
  orderId?: string | null; // Optional link to an order
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  courierStatus?: string | null;
  packzyConsignmentId?: string | null;
  packzyTrackingCode?: string | null;
  shippingArea?: string | null;
  shippingCharge?: number | null;
  courierNote?: string | null;
}

export type Card = Gift;

export interface VendorProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
}

export interface VendorCategory {
  id: string;
  name: string;
}

export interface BillItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineItemTotalPrice: number;
}

export type VendorBillStatus = 'Paid' | 'Unpaid' | 'Partially Paid';

export interface BillPaymentRecord {
  id: string;
  amount: number;
  date: string; // ISO string
  paymentMethod: string;
  notes?: string | null;
  recordedByUserId: string;
  recordedByUserName: string;
}

export interface VendorBill {
  id: string;
  vendorId: string;
  vendorName: string;
  billId?: string | null;
  billDate: string; // ISO string
  dueDate?: string | null; // ISO string
  items: BillItem[];
  notes?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number; // Denormalized total paid amount
  dueAmount: number;
  status: VendorBillStatus;
  payments: BillPaymentRecord[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  createdByUserId: string;
  createdByUserName: string;
}

export interface BillReport {
  id: string;
  vendorId: string;
  vendorName: string;
  date: string; // ISO String
  invoiceId: string;
  amount: number;
  payment: number;
  method: string;
  status?: 'Approved' | 'Pending' | 'Paid' | 'Unpaid';
  notes?: string | null;
}

export interface LrEntryItem {
  id: string;
  companyName: string;
  productName: string;
  productQty: number;
  courierId: string;
  dueOrderName: string;
  dueOrderQty: number;
}

export interface Dr2oEntry {
  id: string;
  date: string; // ISO string
  crmId: string;
  crmName: string;
  // CR Fields
  appointmentCount?: number;
  prospectCount?: number;
  saleCount?: number;
  // DR/CO Fields
  newCustomer1?: string;
  newCustomer2?: string;
  newCustomer3?: string;
  oldCustomer1?: string;
  oldCustomer2?: string;
  oldCustomer3?: string;
  oldCustomer4?: string;
  // LR Fields
  lrItems?: LrEntryItem[];
}

export interface CaseStudyMessage {
  id: string;
  team: 'CR' | 'DR' | 'LR';
  userId: string;
  userName: string;
  userRole?: UserRole | null;
  userAvatarUrl?: string | null;
  message: string;
  imageUrl?: string | null;
  replyingTo?: {
    name: string;
    message: string;
  } | null;
  timestamp: string; // ISO string
}

export interface OfficeTime {
  id: string;
  name: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  graceTime: number; // in minutes
  shift: 'Day' | 'Night';
  applicableRoles?: UserRole[] | 'all';
}

export type AttendanceStatus = 'On Time' | 'Late' | 'Absent' | 'Paid Leave';

export interface AttendanceRecord {
  id: string; // Composite key: `${employeeId}_${YYYY-MM-DD}`
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkInTime: string; // ISO String
  checkOutTime?: string | null; // ISO String
  hoursWorked?: string | null; // e.g., "8h 15m"
  lateReason?: string | null;
  earlyOutReason?: string | null;
  location: string; // "Head Office", "Remote", etc.
  checkInLocation?: { lat: number; lng: number };
  checkOutLocation?: { lat: number; lng: number };
}

export interface TaskEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  userId: string;
  userName: string;
  role: UserRole;
  taskCount: number;
  createdAt: string; // ISO string
}

export interface MonthlyTargetHistory {
  id: string; // e.g., 'CRM-2024-06'
  team: UserRole | 'all';
  month: string; // YYYY-MM
  target: number;
  achieved: number;
  undone: number;
}

// Updated data structure for the Daily Routine page
export interface DailyRoutine {
  id: string; // Document ID for a header can be anything, for a daily record it's YYYY-MM-DD
  userId: string;

  // Fields for a routine header
  title?: string;
  time?: string;
  color?: string;
  description?: string;

  // Fields for a daily record
  completedTasks?: Record<string, string>; // Maps taskId to ISO timestamp
  remarks?: string;

  createdAt?: string; // ISO string, for sorting headers
  updatedAt: string; // ISO string
}


export interface SellEntryItem {
  productId: string;
  productName: string;
  quantity: number;
}

export interface SellEntry {
  id: string;
  entryId: string; // Display ID like SE-001
  items?: SellEntryItem[]; // Array of items
  productId?: string; // Legacy
  productName?: string; // Legacy
  quantity?: number; // Legacy or Total Quantity?
  status: 'Pending' | 'Approved' | 'Rejected';
  recordedByUserId: string;
  recordedByUserName: string;
  approvedByUserId?: string | null;
  approvedByUserName?: string | null;
  createdAt: string; // ISO string
  approvedAt?: string | null; // ISO string
}

export interface StockActivity {
  id: string;
  type: 'ADD' | 'UPDATE' | 'DELETE' | 'SALE' | 'RESTOCK';
  productName: string;
  productId?: string;
  quantity?: number;
  userName: string;
  userId: string;
  timestamp: string; // ISO string
  details?: string;
  entryId?: string;
}
