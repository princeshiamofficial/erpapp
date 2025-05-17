
'use server'; // Potentially for some functions if called directly from Server Components/Actions

import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc, query, where, addDoc } from 'firebase/firestore';
import type { User, UserRole } from '@/types';
import { v4 as uuidv4 } from 'uuid'; // For generating IDs if not using Firestore auto-ID for main user ID

const USERS_COLLECTION = 'users';

// Add a new user to Firestore
export const addUser = async (userData: Omit<User, 'id'>): Promise<User> => {
  // For consistency with how other entities are handled, let's use a generated ID.
  // Firestore's addDoc would also generate one, but we often want to set it ourselves.
  const userId = uuidv4(); 
  const newUser: User = {
    ...userData,
    id: userId,
    // Ensure optional fields are null if not provided, to prevent Firestore 'undefined' error
    companyName: userData.companyName || null,
    avatarUrl: userData.avatarUrl || null,
    monthlyOrderTarget: userData.monthlyOrderTarget || 0,
    weeklyOrderTarget: userData.weeklyOrderTarget || 0,
  };
  const userDocRef = doc(db, USERS_COLLECTION, userId);
  await setDoc(userDocRef, newUser);
  return newUser;
};

// Get all users from Firestore
export const getUsers = async (): Promise<User[]> => {
  const usersCol = collection(db, USERS_COLLECTION);
  const snapshot = await getDocs(usersCol);
  if (snapshot.empty) {
    // Optionally seed an initial admin user if collection is empty and MOCK_USERS based login is also removed
    // For now, assume admin is added via MOCK_USERS for initial login or seeded by another process.
    return [];
  }
  return snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as User));
};

// Get a single user by ID
export const getUserById = async (userId: string): Promise<User | null> => {
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

// Update user's password (stores plain text, still mock-like)
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
export const updateUserTargetsInFirestore = async (userId: string, monthlyTarget: number, weeklyTarget: number): Promise<boolean> => {
  try {
    const userDoc = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userDoc, { 
      monthlyOrderTarget: monthlyTarget, 
      weeklyOrderTarget: weeklyTarget 
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

// Helper to seed initial admin if users collection is empty (call this once, e.g. in a setup script or AuthProvider)
export const seedInitialAdminUser = async () => {
  const usersRef = collection(db, USERS_COLLECTION);
  const q = query(usersRef, where("email", "==", "admin@colorhut.dev"));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.log("No admin user found, seeding initial admin...");
    try {
      await addUser({
        name: 'Default Admin', 
        email: 'admin@colorhut.dev', 
        role: 'ADMIN', 
        companyName: 'Color Hut Inc.', 
        password: "password", // Storing plain text password for demo
        avatarUrl: null, 
        monthlyOrderTarget: 0, 
        weeklyOrderTarget: 0 
      });
      console.log("Default Admin user seeded into Firestore.");
    } catch (error) {
      console.error("Error seeding admin user:", error);
    }
  }
};
