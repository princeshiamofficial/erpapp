import type { User } from '@/types';

// For mock purposes, all users will have the password "password"
const DEFAULT_MOCK_PASSWORD = "password";

export const MOCK_USERS: User[] = [
  { id: 'user-admin-001', name: 'Alice Admin', email: 'admin@trackflow.dev', role: 'ADMIN', companyName: 'TrackFlow Inc.', password: DEFAULT_MOCK_PASSWORD },
  { id: 'user-crm-001', name: 'Bob CRM', email: 'bob.crm@trackflow.dev', role: 'CRM', companyName: 'TrackFlow Inc.', password: DEFAULT_MOCK_PASSWORD },
  { id: 'user-dr-001', name: 'Carol DesignerRep', email: 'carol.dr@trackflow.dev', role: 'DESIGNER_REPRESENTATIVE', companyName: 'TrackFlow Inc.', password: DEFAULT_MOCK_PASSWORD },
  { id: 'user-crm-002', name: 'David CRM', email: 'david.crm@trackflow.dev', role: 'CRM', companyName: 'TrackFlow Inc.', password: DEFAULT_MOCK_PASSWORD },
];

// Helper to get a user by email and password (for mock login)
export const findUserByEmailAndPassword = (email: string, pass: string): User | undefined => {
  const user = MOCK_USERS.find(user => user.email.toLowerCase() === email.toLowerCase());
  if (user && user.password === pass) {
    // Return user object without the password for security in client state
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }
  return undefined;
};
