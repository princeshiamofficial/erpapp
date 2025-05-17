
'use server'; // Potentially for some functions if called directly from Server Components/Actions

import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc, query, where, orderBy, runTransaction } from 'firebase/firestore';
import type { User, UserRole } from '@/types';

const USERS_COLLECTION = 'users';

const getRolePrefix = (role: UserRole): string => {
  switch (role) {
    case 'ADMIN':
      return 'Admin-';
    case 'CRM':
      return 'CRM-';
    case 'DESIGNER_REPRESENTATIVE':
      return 'DR-';
    case 'SYSTEM_ADMIN':
      return 'SysAdmin-';
    default:
      // Fallback, though all roles should be covered
      return 'User-'; 
  }
};

// Add a new user to Firestore with role-specific sequential ID
export const addUser = async (userData: Omit<User, 'id'>): Promise<User> => {
  const usersCol = collection(db, USERS_COLLECTION);
  const rolePrefix = getRolePrefix(userData.role);

  // Query for users with the same role prefix to determine the next sequential number
  const q = query(usersCol, where('id', '>=', rolePrefix), where('id', '<', rolePrefix + '\uffff'), orderBy('id', 'desc'));
  const roleUsersSnapshot = await getDocs(q);
  
  let maxUserNumber = 0;
  roleUsersSnapshot.forEach(docSnap => {
    const docId = docSnap.id;
    if (docId.startsWith(rolePrefix)) {
      const numPart = parseInt(docId.substring(rolePrefix.length), 10);
      if (!isNaN(numPart) && numPart > maxUserNumber) {
        maxUserNumber = numPart;
      }
    }
  });
  const newUserNumber = maxUserNumber + 1;
  const userId = `${rolePrefix}${String(newUserNumber).padStart(3, '0')}`;

  const newUser: User = {
    ...userData,
    id: userId,
    companyName: userData.companyName || null,
    avatarUrl: userData.avatarUrl || null,
    monthlyOrderTarget: userData.monthlyOrderTarget === undefined ? null : userData.monthlyOrderTarget,
    weeklyOrderTarget: userData.weeklyOrderTarget === undefined ? null : userData.weeklyOrderTarget,
  };
  const userDocRef = doc(db, USERS_COLLECTION, userId);
  await setDoc(userDocRef, newUser);
  return newUser;
};

// Get all users from Firestore
export const getUsers = async (): Promise<User[]> => {
  const usersCol = collection(db, USERS_COLLECTION);
  const q = query(usersCol, orderBy("name", "asc")); // Order by name for consistent listing
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as User));
};

// Get a single user by ID
export const getUserById = async (userId: string): Promise<User | null> => {
  if (!userId) return null;
  const userDocRef = doc(db, USERS_COLLECTION, userId);
  const docSnap = await getDoc(userDocRef);
  if (docSnap.exists()) {
    return { ...docSnap.data(), id: docSnap.id } as User;
  }
  return null;
};


// Get user by email (for login)
export const getUserByEmail = async (email: string): Promise<User | null> => {
  const usersRef = collection(db, USERS_COLLECTION);
  const q = query(usersRef, where("email", "==", email));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    // Assuming email is unique
    const userDoc = querySnapshot.docs[0];
    return { ...userDoc.data(), id: userDoc.id } as User;
  }
  return null;
};

// Update user's role
export const updateUserRoleInFirestore = async (userId: string, role: UserRole): Promise<boolean> => {
  try {
    const userDoc = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userDoc, { role });
    return true;
  } catch (error) {
    console.error("Error updating user role in Firestore:", error);
    return false;
  }
};

// Update user's password (stores plain text)
export const updateUserPasswordInFirestore = async (userId: string, newPasswordPlainText: string): Promise<boolean> => {
  try {
    const userDoc = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userDoc, { password: newPasswordPlainText });
    return true;
  } catch (error) {
    console.error("Error updating user password in Firestore:", error);
    return false;
  }
};

// Update user's avatar
export const updateUserAvatarInFirestore = async (userId: string, avatarUrl: string | null): Promise<boolean> => {
  try {
    const userDoc = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userDoc, { avatarUrl: avatarUrl ?? null }); // Ensure null if empty
    return true;
  } catch (error) {
    console.error("Error updating user avatar in Firestore:", error);
    return false;
  }
};

// Update user's sales targets
export const updateUserTargetsInFirestore = async (userId: string, monthlyTarget: number | null, weeklyTarget: number | null): Promise<boolean> => {
  try {
    const userDoc = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userDoc, { 
      monthlyOrderTarget: monthlyTarget === undefined ? null : monthlyTarget, 
      weeklyOrderTarget: weeklyTarget === undefined ? null : weeklyTarget 
    });
    return true;
  } catch (error) {
    console.error("Error updating user targets in Firestore:", error);
    return false;
  }
};

// Delete a user from Firestore
export const deleteUserFromFirestore = async (userId: string): Promise<boolean> => {
  try {
    const userDoc = doc(db, USERS_COLLECTION, userId);
    await deleteDoc(userDoc);
    return true;
  } catch (error) {
    console.error("Error deleting user from Firestore:", error);
    return false;
  }
};

// Helper to seed initial admin if users collection is empty
export const seedInitialAdminUser = async () => {
  const usersRef = collection(db, USERS_COLLECTION);
  const q = query(usersRef, where("email", "==", "admin@colorhut.dev"));
  
  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.log("No admin user found, seeding initial admin...");
      // The addUser function will now assign an ID like 'Admin-001' or 'SysAdmin-001' based on role
      await addUser({ 
        name: 'Default Admin', 
        email: 'admin@colorhut.dev', 
        role: 'SYSTEM_ADMIN', // Defaulting to SYSTEM_ADMIN for initial setup power
        companyName: 'Color Hut Inc.', 
        password: "password", 
        avatarUrl: null, 
        monthlyOrderTarget: 0, 
        weeklyOrderTarget: 0 
      });
      console.log("Default Admin user (SYSTEM_ADMIN) seeded into Firestore with role-specific ID.");
    }
  } catch (error) {
    console.error("Error checking or seeding admin user:", error);
  }
};

