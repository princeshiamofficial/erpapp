
'use server'; // Potentially for some functions if called directly from Server Components/Actions

import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc, query, where, orderBy } from 'firebase/firestore';
import type { User, UserRole } from '@/types';
// Removed v4 as uuidv4 from here as we'll generate sequential IDs for new users

const USERS_COLLECTION = 'users';

// Add a new user to Firestore with sequential ID
export const addUser = async (userData: Omit<User, 'id'>): Promise<User> => {
  const usersCol = collection(db, USERS_COLLECTION);
  // Fetch all users to determine the next ID. This could be optimized for very large user bases.
  // For now, we assume a manageable number of users.
  const allUsersSnapshot = await getDocs(query(usersCol, orderBy('id', 'desc')));
  let maxUserNumber = 0;
  allUsersSnapshot.forEach(docSnap => {
    const docId = docSnap.id;
    if (docId.startsWith("User-")) {
      const numPart = parseInt(docId.substring(5), 10); // "User-" is 5 chars
      if (!isNaN(numPart) && numPart > maxUserNumber) {
        maxUserNumber = numPart;
      }
    }
  });
  const newUserNumber = maxUserNumber + 1;
  const userId = `User-${String(newUserNumber).padStart(3, '0')}`;

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
  const snapshot = await getDocs(usersCol);
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
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.log("No admin user found, seeding initial admin...");
    try {
      await addUser({ // addUser will now generate the sequential ID, e.g., User-001
        name: 'Default Admin', 
        email: 'admin@colorhut.dev', 
        role: 'ADMIN', 
        companyName: 'Color Hut Inc.', 
        password: "password", 
        avatarUrl: null, 
        monthlyOrderTarget: 0, 
        weeklyOrderTarget: 0 
      });
      console.log("Default Admin user seeded into Firestore with sequential ID.");
    } catch (error) {
      console.error("Error seeding admin user:", error);
    }
  }
};
