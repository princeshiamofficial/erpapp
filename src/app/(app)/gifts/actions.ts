

"use server";

import { revalidatePath } from "next/cache";
import type { Gift, User } from '@/types';
import {
  getGifts as getGiftsFromDb,
  addGift as addGiftToDb,
  updateGift as updateGiftInDb,
  deleteGift as deleteGiftFromDb,
} from '@/lib/gift-service';

export async function getGifts(): Promise<Gift[]> {
  try {
    return await getGiftsFromDb();
  } catch (error) {
    console.error("Error in getGifts server action:", error);
    return [];
  }
}

export async function addGiftAction(
  giftData: Omit<Gift, 'id' | 'giftIdDisplay' | 'givenByUserId' | 'givenByUserName' | 'createdAt' | 'updatedAt' | 'giftItemName'> & { giftItemNames: string[] },
  currentUser: User
): Promise<{ success: boolean; gift?: Gift; error?: string }> {
  try {
    const newGift = await addGiftToDb(giftData, currentUser);
    if (newGift) {
      revalidatePath("/(app)/gifts");
      return { success: true, gift: newGift };
    }
    return { success: false, error: "Failed to add gift to database." };
  } catch (error) {
    console.error("Error in addGiftAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateGiftAction(
  giftId: string,
  updates: Partial<Omit<Gift, 'id' | 'createdAt' | 'giftItemName'>> & { giftItemNames: string[] },
  currentUser: User
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await updateGiftInDb(giftId, updates, currentUser);
    if (success) {
      revalidatePath("/(app)/gifts");
      return { success: true };
    }
    return { success: false, error: "Failed to update gift in database." };
  } catch (error) {
    console.error("Error in updateGiftAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function deleteGift(giftId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await deleteGiftFromDb(giftId);
    if (success) {
      revalidatePath("/(app)/gifts");
      return { success: true };
    }
    return { success: false, error: "Failed to delete gift from database." };
  } catch (error) {
    console.error("Error in deleteGiftAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
