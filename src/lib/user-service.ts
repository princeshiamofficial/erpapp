

'use server'; // Potentially for some functions if called directly from Server Components/Actions

import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, getDoc, query, where, orderBy, deleteDoc } from 'firebase/firestore';
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
    case 'VENDOR':
      return 'Vendor-';
    case 'LR':
      return 'LR-';
    default:
      return 'User-'; // Fallback, though all roles should be covered
  }
};

// Add a new user to Firestore with role-specific sequential ID
export const addUser = async (userData: Omit<User, 'id'>): Promise<User | null> => {
  const usersCol = collection(db, USERS_COLLECTION);
  const rolePrefix = getRolePrefix(userData.role);

  try {
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
      phone: userData.phone || null,
      address: userData.address || null,
      avatarUrl: userData.avatarUrl || null,
      monthlyOrderTarget: userData.monthlyOrderTarget === undefined ? null : userData.monthlyOrderTarget,
      weeklyOrderTarget: userData.weeklyOrderTarget === undefined ? null : userData.weeklyOrderTarget,
      isBanned: false, 
      fcmToken: null, // Initialize fcmToken as null for new users
      isLeader: userData.isLeader || false, // Initialize isLeader
    };
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(userDocRef, newUser);
    return newUser;
  } catch (error) {
    console.error("Error adding user to Firestore:", error);
    return null;
  }
};

// Get all users from Firestore
export const getUsers = async (): Promise<User[]> => {
  const usersCol = collection(db, USERS_COLLECTION);
  const q = query(usersCol, orderBy("name", "asc")); // Order by name for consistent listing
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as User));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

// Get a single user by ID
export const getUserById = async (userId: string): Promise<User | null> => {
  if (!userId) return null;
  const userDocRef = doc(db, USERS_COLLECTION, userId);
  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return { ...docSnap.data(), id: docSnap.id } as User;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching user by ID "${userId}":`, error);
    return null;
  }
};


// Get user by email (for login)
export const getUserByEmail = async (email: string): Promise<User | null> => {
  const usersRef = collection(db, USERS_COLLECTION);
  const q = query(usersRef, where("email", "==", email));
  try {
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { ...userDoc.data(), id: userDoc.id } as User;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching user by email "${email}":`, error);
    return null;
  }
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

// Update user's ban status
export const updateUserBanStatus = async (userId: string, isBanned: boolean): Promise<boolean> => {
  try {
    const userDoc = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userDoc, { isBanned });
    return true;
  } catch (error) {
    console.error(`Error updating ban status for user ${userId}:`, error);
    return false;
  }
};

// Update user's basic information
export const updateUserInfo = async (
  userId: string,
  updates: Partial<Pick<User, 'name' | 'email' | 'companyName' | 'phone' | 'address' | 'category' | 'isLeader'>>
): Promise<boolean> => {
  try {
    const userDoc = doc(db, USERS_COLLECTION, userId);
    const dataToUpdate: Record<string, any> = {};
    if (updates.name !== undefined) dataToUpdate.name = updates.name;
    if (updates.email !== undefined) dataToUpdate.email = updates.email;
    if (updates.companyName !== undefined) dataToUpdate.companyName = updates.companyName === '' ? null : updates.companyName;
    if (updates.phone !== undefined) dataToUpdate.phone = updates.phone === '' ? null : updates.phone;
    if (updates.address !== undefined) dataToUpdate.address = updates.address === '' ? null : updates.address;
    if (updates.category !== undefined) dataToUpdate.category = updates.category === '' ? null : updates.category;
    if (updates.isLeader !== undefined) dataToUpdate.isLeader = updates.isLeader;


    if (Object.keys(dataToUpdate).length === 0) {
      return true; // No actual updates to make
    }

    await updateDoc(userDoc, dataToUpdate);
    return true;
  } catch (error) {
    console.error(`Error updating user info for ${userId}:`, error);
    return false;
  }
};


// Update user's FCM token
export async function updateUserFCMTokenInFirestore(userId: string, fcmToken: string | null): Promise<boolean> {
  if (!userId) {
    console.error("updateUserFCMTokenInFirestore: userId is required.");
    return false;
  }
  try {
    const userDocRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userDocRef, { fcmToken: fcmToken ?? null }); // Store null if token is null
    console.log(`[User Service] FCM token for user ${userId} updated to: ${fcmToken}`);
    return true;
  } catch (error) {
    console.error(`[User Service] Error updating FCM token for user ${userId}:`, error);
    return false;
  }
}


// Helper to seed initial admin or ensure admin@colorhut.dev is SYSTEM_ADMIN
export const seedInitialAdminUser = async () => {
  const adminEmail = "admin@colorhut.dev";
  
  try {
    const existingAdmin = await getUserByEmail(adminEmail);

    if (!existingAdmin) {
      console.log(`No user found with email ${adminEmail}, seeding initial System Admin...`);
      await addUser({
        name: 'Default Admin',
        email: adminEmail,
        role: 'SYSTEM_ADMIN', 
        companyName: 'Color Hut Inc.',
        password: "password", 
        avatarUrl: null,
        monthlyOrderTarget: 0,
        weeklyOrderTarget: 0,
        isBanned: false, 
        fcmToken: null,
        isLeader: false,
      });
      console.log(`Default System Admin user (${adminEmail}) seeded into Firestore.`);
    } else {
      let updates: Partial<User> = {};
      if (existingAdmin.role !== 'SYSTEM_ADMIN') {
        updates.role = 'SYSTEM_ADMIN';
        console.log(`Updating ${adminEmail} role to SYSTEM_ADMIN.`);
      }
      if (existingAdmin.isBanned === undefined) { 
        updates.isBanned = false;
         console.log(`Setting isBanned to false for ${adminEmail}.`);
      }
      if (existingAdmin.fcmToken === undefined) { // Ensure fcmToken field exists
        updates.fcmToken = null;
      }
      
      if (Object.keys(updates).length > 0) {
        console.log(`User ${adminEmail} found. Applying updates:`, updates);
        const userDocRef = doc(db, USERS_COLLECTION, existingAdmin.id);
        await updateDoc(userDocRef, updates);
        console.log(`User ${adminEmail} updated in Firestore.`);
      } else {
         console.log(`User ${adminEmail} already exists with SYSTEM_ADMIN role and correct setup.`);
      }
    }
  } catch (error) {
    console.error("Error checking or seeding/updating admin user:", error);
  }
};
