import { LeadCategory } from "@/types";

export const LEAD_CATEGORY_LABELS: Record<LeadCategory, string> = {
  'POP': 'Intake Leads',
  'POG': 'POG',
  'OC': 'Sales',
  'OD': 'Delivered',
  'ROD': 'Retention',
  'APPOINTMENT': 'Appointment',
  'PROSPECT': 'Prospect',
};

export const LEAD_TEMPERATURES = [0, 30, 50, 70, 100] as const;
