
"use server";

import { getUserByEmail, seedInitialAdminUser, getUserById, verifyUserPassword, updateUserAvatar as updateUserAvatarService } from '@/lib/user-service';
import type { User } from '@/types';

export async function serverSeedInitialAdminUser() {
  await seedInitialAdminUser();
}

export async function serverGetUserById(userId: string): Promise<User | null> {
  const user = await getUserById(userId);
  if (!user) return null;
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword as User;
}

export async function serverVerifyUserPassword(email: string, pass: string): Promise<User | null> {
  return await verifyUserPassword(email, pass);
}

export async function serverUpdateUserAvatar(userId: string, avatarUrl: string | null): Promise<boolean> {
  return await updateUserAvatarService(userId, avatarUrl);
}
