'use server';

import { query } from './mysql';
import type { User, UserRole } from '@/types';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import { getRoles } from './user-role-service';

const USERS_TABLE = 'users';


// Add a new user to MySQL
export const addUser = async (userData: Omit<User, 'id'> & { id?: string }): Promise<User | null> => {
  let userId = userData.id;

  if (!userId) {
    // Generate a unique ID using UUID
    userId = uuidv4();
  } else {
    // Check if custom ID already exists
    const existingUser = await getUserById(userId);
    if (existingUser) {
      throw new Error(`User ID "${userId}" already exists. Please choose another.`);
    }
  }

  if (userData.email) {
    const existingEmail = await getUserByEmail(userData.email.trim());
    if (existingEmail) {
      throw new Error(`Email "${userData.email.trim()}" is already registered to another user.`);
    }
  }

  if (userData.role) {
    try {
      const roles = await getRoles();
      const roleExists = roles.some(r => r.id === userData.role);
      if (!roleExists) {
        throw new Error(`Role "${userData.role}" does not exist in the system. Please ensure the role is created under Custom Access first.`);
      }
    } catch (e: any) {
      if (e?.message?.includes("does not exist")) throw e;
    }
  }

  const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 10) : await bcrypt.hash('password', 10);

  const newUser: User = {
    ...userData,
    id: userId,
    email: userData.email.trim(),
    companyName: userData.companyName || null,
    phone: userData.phone || null,
    address: userData.address || null,
    avatarUrl: userData.avatarUrl || null,
    monthlyOrderTarget: userData.monthlyOrderTarget ?? 0,
    weeklyOrderTarget: userData.weeklyOrderTarget ?? 0,
    isBanned: false,
    fcmToken: null,
    isLeader: userData.isLeader || false,
  };

  try {
    await query(
      `INSERT INTO ${USERS_TABLE} (id, name, email, password, role, company_name, phone, address, avatar_url, monthly_order_target, weekly_order_target, is_banned, fcm_token, is_leader) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newUser.id, newUser.name, newUser.email, hashedPassword,
        newUser.role, newUser.companyName, newUser.phone, newUser.address,
        newUser.avatarUrl, newUser.monthlyOrderTarget, newUser.weeklyOrderTarget,
        newUser.isBanned ? 1 : 0, newUser.fcmToken, newUser.isLeader ? 1 : 0
      ]
    );

    return newUser;
  } catch (error: any) {
    console.error("Error adding user to MySQL:", error);
    if (error?.code === 'ER_DUP_ENTRY') {
      throw new Error(`A user with email "${newUser.email}" already exists.`);
    }
    if (error?.code === 'ER_NO_REFERENCED_ROW_2' || error?.code === 'ER_NO_REFERENCED_ROW') {
      throw new Error(`Role "${newUser.role}" is invalid or does not exist in the database.`);
    }
    if (error?.code === 'ER_DATA_TOO_LONG') {
      throw new Error("Avatar image file size is too large for database storage. Please choose a smaller image.");
    }
    if (error?.code === 'ER_BAD_FIELD_ERROR' && error?.message?.includes('role')) {
      await query(
        `INSERT INTO ${USERS_TABLE} (id, name, email, password, role_id, company_name, phone, address, avatar_url, monthly_order_target, weekly_order_target, is_banned, fcm_token, is_leader) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newUser.id, newUser.name, newUser.email, hashedPassword,
          newUser.role, newUser.companyName, newUser.phone, newUser.address,
          newUser.avatarUrl, newUser.monthlyOrderTarget, newUser.weeklyOrderTarget,
          newUser.isBanned ? 1 : 0, newUser.fcmToken, newUser.isLeader ? 1 : 0
        ]
      );
      return newUser;
    }
    if (error instanceof Error) throw error;
    throw new Error("Failed to insert user into database.");
  }
};

// Get all users from MySQL
export const getUsers = async (): Promise<User[]> => {
  try {
    const results = await query<any[]>(`SELECT * FROM ${USERS_TABLE} ORDER BY name ASC`);
    return results.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      companyName: row.company_name,
      phone: row.phone,
      address: row.address,
      password: row.password,
      avatarUrl: row.avatar_url,
      monthlyOrderTarget: row.monthly_order_target,
      weeklyOrderTarget: row.weekly_order_target,
      isBanned: Boolean(row.is_banned),
      fcmToken: row.fcm_token,
      isLeader: Boolean(row.is_leader)
    } as User));
  } catch (error) {
    console.error("Error fetching users from MySQL:", error);
    return [];
  }
};

// Get a single user by ID from MySQL
export const getUserById = async (userId: string): Promise<User | null> => {
  if (!userId) return null;
  try {
    const results = await query<any[]>(`SELECT * FROM ${USERS_TABLE} WHERE id = ?`, [userId]);
    if (results.length > 0) {
      const row = results[0];
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        companyName: row.company_name,
        phone: row.phone,
        address: row.address,
        password: row.password,
        avatarUrl: row.avatar_url,
        monthlyOrderTarget: row.monthly_order_target,
        weeklyOrderTarget: row.weekly_order_target,
        isBanned: Boolean(row.is_banned),
        fcmToken: row.fcm_token,
        isLeader: Boolean(row.is_leader)
      } as User;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching user by ID "${userId}" from MySQL:`, error);
    return null;
  }
};

// Get user by email from MySQL
export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const results = await query<any[]>(`SELECT * FROM ${USERS_TABLE} WHERE email = ?`, [email]);
    if (results.length > 0) {
      const row = results[0];
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        companyName: row.company_name,
        phone: row.phone,
        address: row.address,
        password: row.password,
        avatarUrl: row.avatar_url,
        monthlyOrderTarget: row.monthly_order_target,
        weeklyOrderTarget: row.weekly_order_target,
        isBanned: Boolean(row.is_banned),
        fcmToken: row.fcm_token,
        isLeader: Boolean(row.is_leader)
      } as User;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching user by email "${email}" from MySQL:`, error);
    return null;
  }
};

// Update user's role in MySQL
export const updateUserRole = async (userId: string, role: UserRole): Promise<boolean> => {
  try {
    await query(`UPDATE ${USERS_TABLE} SET role = ? WHERE id = ?`, [role, userId]);
    return true;
  } catch (error) {
    console.error("Error updating user role in MySQL:", error);
    return false;
  }
};

// Update user's password in MySQL (hashed)
export const updateUserPassword = async (userId: string, newPasswordPlainText: string): Promise<boolean> => {
  try {
    const hashedPassword = await bcrypt.hash(newPasswordPlainText, 10);
    await query(`UPDATE ${USERS_TABLE} SET password = ? WHERE id = ?`, [hashedPassword, userId]);
    return true;
  } catch (error) {
    console.error("Error updating user password in MySQL:", error);
    return false;
  }
};

// Verify user password
export const verifyUserPassword = async (email: string, passwordPlainText: string): Promise<User | null> => {
  try {
    const results = await query<any[]>(`SELECT * FROM ${USERS_TABLE} WHERE email = ?`, [email]);
    if (results.length > 0) {
      const row = results[0];
      const isMatch = await bcrypt.compare(passwordPlainText, row.password);
      if (isMatch) {
        return {
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role,
          companyName: row.company_name,
          phone: row.phone,
          address: row.address,
          avatarUrl: row.avatar_url,
          monthlyOrderTarget: row.monthly_order_target,
          weeklyOrderTarget: row.weekly_order_target,
          isBanned: Boolean(row.is_banned),
          fcm_token: row.fcm_token,
          isLeader: Boolean(row.is_leader)
        } as User;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error verifying password for email "${email}":`, error);
    return null;
  }
};

// Update user's avatar in MySQL
export const updateUserAvatar = async (userId: string, avatarUrl: string | null): Promise<boolean> => {
  try {
    await query(`UPDATE ${USERS_TABLE} SET avatar_url = ? WHERE id = ?`, [avatarUrl, userId]);
    return true;
  } catch (error) {
    console.error("Error updating user avatar in MySQL:", error);
    return false;
  }
};

// Update user's sales targets in MySQL
export const updateUserTargets = async (userId: string, monthlyTarget: number | null, weeklyTarget: number | null): Promise<boolean> => {
  try {
    await query(
      `UPDATE ${USERS_TABLE} SET monthly_order_target = ?, weekly_order_target = ? WHERE id = ?`,
      [monthlyTarget, weeklyTarget, userId]
    );
    return true;
  } catch (error) {
    console.error("Error updating user targets in MySQL:", error);
    return false;
  }
};

// Delete a user from MySQL
export const deleteUser = async (userId: string): Promise<boolean> => {
  try {
    await query(`DELETE FROM ${USERS_TABLE} WHERE id = ?`, [userId]);
    return true;
  } catch (error) {
    console.error("Error deleting user from MySQL:", error);
    return false;
  }
};

// Update user's ban status in MySQL
export const updateUserBanStatus = async (userId: string, isBanned: boolean): Promise<boolean> => {
  try {
    await query(`UPDATE ${USERS_TABLE} SET is_banned = ? WHERE id = ?`, [isBanned, userId]);
    return true;
  } catch (error) {
    console.error(`Error updating ban status for user ${userId} in MySQL:`, error);
    return false;
  }
};

// Update user's basic information in MySQL
export const updateUserInfo = async (
  userId: string,
  updates: Partial<Pick<User, 'name' | 'email' | 'companyName' | 'phone' | 'address' | 'category' | 'isLeader'>>
): Promise<boolean> => {
  try {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
    if (updates.companyName !== undefined) { fields.push('company_name = ?'); values.push(updates.companyName || null); }
    if (updates.phone !== undefined) { fields.push('phone = ?'); values.push(updates.phone || null); }
    if (updates.address !== undefined) { fields.push('address = ?'); values.push(updates.address || null); }
    if (updates.isLeader !== undefined) { fields.push('is_leader = ?'); values.push(updates.isLeader); }

    if (fields.length === 0) return true;

    values.push(userId);
    await query(`UPDATE ${USERS_TABLE} SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
  } catch (error) {
    console.error(`Error updating user info for ${userId} in MySQL:`, error);
    return false;
  }
};

// Update user's FCM token in MySQL
export async function updateUserFCMToken(userId: string, fcmToken: string | null): Promise<boolean> {
  if (!userId) return false;
  try {
    await query(`UPDATE ${USERS_TABLE} SET fcm_token = ? WHERE id = ?`, [fcmToken, userId]);
    return true;
  } catch (error) {
    console.error(`Error updating FCM token for user ${userId} in MySQL:`, error);
    return false;
  }
}

// Seed admin user in MySQL
export const seedInitialAdminUser = async () => {
  const adminEmail = "admin@colorhut.dev";
  try {
    // await ensureCoreTablesExist(); // Removed non-existent call
    const existingAdmin = await getUserByEmail(adminEmail);
    if (!existingAdmin) {
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
    }
  } catch (error) {
    console.error("Error seeding admin user in MySQL:", error);
  }
};
