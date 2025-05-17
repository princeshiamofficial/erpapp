
import type { User } from '@/types';
// getUserByEmail will now be used from user-service.ts for login
// MOCK_USERS can be kept for local testing or removed if login fully relies on Firestore.
// For now, keep it to ensure the existing login flow for the initial admin isn't broken
// before full migration of AuthContext.

// For mock purposes, all users will have the password "password"
const DEFAULT_MOCK_PASSWORD = "password";

// This array can now be very minimal or used as a fallback if Firestore is empty.
// Ideally, the user-service.ts seedInitialAdminUser function handles the first admin.
export const MOCK_USERS: User[] = [
  { 
    id: 'user-admin-default-local-mock', // Changed ID to avoid clash if seeded
    name: 'Default Admin (Local Mock)', 
    email: 'admin@colorhut.dev', 
    role: 'ADMIN', 
    companyName: 'Color Hut Inc.', 
    password: DEFAULT_MOCK_PASSWORD, 
    avatarUrl: undefined, 
    monthlyOrderTarget: 0, 
    weeklyOrderTarget: 0 
  },
];

// This function will be replaced by calls to user-service.ts's getUserByEmail for actual login.
// It can remain for local testing if needed, but AuthContext should primarily use the service.
export const findUserByEmailAndPasswordInMock = (email: string, pass: string): User | undefined => {
  const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (user && user.password === pass) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }
  return undefined;
};

// These functions are now effectively replaced by their Firestore counterparts in user-service.ts
// and will be called by the Admin User Management page directly via user-service.
// They are removed here to avoid confusion. If any part of the app still relies on them for
// non-admin-related user profile updates (e.g. user updating their own profile through MOCK_USERS),
// that logic would also need to migrate to user-service.ts.

// export const updateUserPassword = (userId: string, newPassword: string): boolean => { ... };
// export const updateUserAvatarInMock = (userId: string, avatarUrl: string | null): boolean => { ... };
// export const updateUserTargetsInMock = (userId: string, monthlyTarget: number, weeklyTarget: number): boolean => { ... };
