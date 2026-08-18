
"use server";

import { getUserByEmail, seedInitialAdminUser, getUserById, verifyUserPassword, updateUserAvatar as updateUserAvatarService, updateUserPinCode as updateUserPinCodeService, verifyUserPinCode as verifyUserPinCodeService, verifyUserPinCodeWithLock as verifyUserPinCodeWithLockService, lockUserAccount72h as lockUserAccount72hService, type PinVerificationResult } from '@/lib/user-service';
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

export async function serverUpdateUserPinCode(userId: string, pinCode: string | null): Promise<boolean> {
  return await updateUserPinCodeService(userId, pinCode);
}

export async function serverVerifyUserPinCode(userId: string, pinInput: string): Promise<boolean> {
  return await verifyUserPinCodeService(userId, pinInput);
}

export async function serverVerifyUserPinCodeWithLock(userId: string, pinInput: string): Promise<PinVerificationResult> {
  return await verifyUserPinCodeWithLockService(userId, pinInput);
}

export async function serverLockUserAccount72h(userId: string): Promise<{ success: boolean; lockedUntil: string }> {
  return await lockUserAccount72hService(userId);
}
