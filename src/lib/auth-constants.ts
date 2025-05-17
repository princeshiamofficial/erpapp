
import type { User } from '@/types';

// For mock purposes, all users will have the password "password"
const DEFAULT_MOCK_PASSWORD = "password";

export const MOCK_USERS: User[] = [
  // All demo accounts have been removed.
  // You can add a default System Admin or Admin here if needed for initial setup.
  // Example:
  // { id: 'user-admin-init', name: 'Initial Admin', email: 'initadmin@trackflow.dev', role: 'ADMIN', companyName: 'TrackFlow Inc.', password: DEFAULT_MOCK_PASSWORD, avatarUrl: undefined, monthlyOrderTarget: 0, weeklyOrderTarget: 0 },
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

// Helper to update a user's password
export const updateUserPassword = (userId: string, newPassword: string): boolean => {
  const userIndex = MOCK_USERS.findIndex(user => user.id === userId);
  if (userIndex !== -1) {
    MOCK_USERS[userIndex].password = newPassword;
    return true; // Indicate success
  }
  return false; // Indicate user not found or failure
};

// Helper to update a user's avatar URL
export const updateUserAvatarInMock = (userId: string, avatarUrl: string | null): boolean => {
  const userIndex = MOCK_USERS.findIndex(user => user.id === userId);
  if (userIndex !== -1) {
    MOCK_USERS[userIndex].avatarUrl = avatarUrl ?? undefined; // Store null as undefined
    return true;
  }
  return false;
};

// Helper to update a user's sales targets in the mock data
export const updateUserTargetsInMock = (userId: string, monthlyTarget: number, weeklyTarget: number): boolean => {
  const userIndex = MOCK_USERS.findIndex(user => user.id === userId);
  if (userIndex !== -1 && MOCK_USERS[userIndex].role === 'CRM') {
    MOCK_USERS[userIndex].monthlyOrderTarget = monthlyTarget;
    MOCK_USERS[userIndex].weeklyOrderTarget = weeklyTarget;
    return true;
  }
  return false;
};
