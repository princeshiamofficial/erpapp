
"use server";

import { revalidatePath } from "next/cache";
import {
  addStockItem,
  updateStockItem,
  deleteStockItem,
} from "@/lib/stock-service";
import type { ServiceModelItem } from "@/types";

const STOCK_MANAGEMENT_PATH = "/(app)/admin/stock-management";

export async function addStockItemAction(name: string, buyingPrice?: number, sellingPrice?: number, imageUrl?: string | null, isReadyMade?: boolean, stockCount?: number): Promise<{ success: boolean; item?: ServiceModelItem; error?: string }> {
  try {
    const newItem = await addStockItem(name, buyingPrice, sellingPrice, imageUrl, isReadyMade, stockCount);
    if (newItem) {
      revalidatePath(STOCK_MANAGEMENT_PATH);
      return { success: true, item: newItem };
    }
    return { success: false, error: "Failed to add item to stock." };
  } catch (error) {
    console.error("Error in addStockItemAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateStockItemAction(id: string, name: string, buyingPrice?: number, sellingPrice?: number, imageUrl?: string | null, isReadyMade?: boolean, stockCountChange?: number): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await updateStockItem(id, name, buyingPrice, sellingPrice, imageUrl, isReadyMade, stockCountChange);
    if (success) {
      revalidatePath(STOCK_MANAGEMENT_PATH);
      return { success: true };
    }
    return { success: false, error: "Failed to update stock item." };
  } catch (error) {
    console.error("Error in updateStockItemAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function deleteStockItemAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await deleteStockItem(id);
    if (success) {
      revalidatePath(STOCK_MANAGEMENT_PATH);
      return { success: true };
    }
    return { success: false, error: "Failed to delete stock item. It might be in use by existing orders." };
  } catch (error) {
    console.error("Error in deleteStockItemAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
