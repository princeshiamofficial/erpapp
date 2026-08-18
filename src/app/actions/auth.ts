
"use server";

import {
  getUserByEmail,
  seedInitialAdminUser,
  getUserById,
  verifyUserPassword,
  updateUserAvatar as updateUserAvatarService,
  updateUserPinCode as updateUserPinCodeService,
  verifyUserPinCode as verifyUserPinCodeService,
  verifyUserPinCodeWithLock as verifyUserPinCodeWithLockService,
  lockUserAccount72h as lockUserAccount72hService,
  setupTwoFactorSecret as setupTwoFactorSecretService,
  enableTwoFactor as enableTwoFactorService,
  disableTwoFactor as disableTwoFactorService,
  verifyTwoFactorCode as verifyTwoFactorCodeService,
  getUserBackupCodes as getUserBackupCodesService,
  type PinVerificationResult,
  type SetupTwoFactorResult
} from '@/lib/user-service';
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

export async function serverSetupTwoFactor(userId: string): Promise<SetupTwoFactorResult | null> {
  return await setupTwoFactorSecretService(userId);
}

export async function serverEnableTwoFactor(userId: string, token: string, secret: string, backupCodes: string[]): Promise<{ success: boolean; message?: string }> {
  return await enableTwoFactorService(userId, token, secret, backupCodes);
}

export async function serverDisableTwoFactor(userId: string): Promise<{ success: boolean; message?: string }> {
  return await disableTwoFactorService(userId);
}

export async function serverVerifyTwoFactorCode(userId: string, tokenInput: string): Promise<{ success: boolean; isBackupCode?: boolean; remainingBackupCodes?: number; message?: string }> {
  return await verifyTwoFactorCodeService(userId, tokenInput);
}

export async function serverGetUserBackupCodes(userId: string): Promise<string[]> {
  return await getUserBackupCodesService(userId);
}
