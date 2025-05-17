import type { User } from '@/types';

export const MOCK_USERS: User[] = [
  { id: 'user-admin-001', name: 'Alice Admin', email: 'admin@trackflow.dev', role: 'ADMIN', companyName: 'TrackFlow Inc.' },
  { id: 'user-crm-001', name: 'Bob CRM', email: 'bob.crm@trackflow.dev', role: 'CRM', companyName: 'TrackFlow Inc.' },
  { id: 'user-dr-001', name: 'Carol DesignerRep', email: 'carol.dr@trackflow.dev', role: 'DESIGNER_REPRESENTATIVE', companyName: 'TrackFlow Inc.' },
  { id: 'user-crm-002', name: 'David CRM', email: 'david.crm@trackflow.dev', role: 'CRM', companyName: 'TrackFlow Inc.' },
];

// Helper to get a user by email (for mock login)
export const findUserByEmail = (email: string): User | undefined => {
  return MOCK_USERS.find(user => user.email.toLowerCase() === email.toLowerCase());
};
