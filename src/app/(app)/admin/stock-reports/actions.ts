
"use server";

import { revalidatePath } from "next/cache";
import {
    addStockItem,
    updateStockItem,
    deleteStockItem
} from "@/lib/stock-service";
import {
    addSellEntry,
    approveSellEntry,
    rejectSellEntry,
    deleteSellEntry
} from "@/lib/sell-entry-service";
import type { ServiceModelItem, SellEntry } from "@/types";

const STOCK_REPORTS_PATH = "/(app)/admin/stock-reports";

export async function addStockAction(name: string, buyingPrice?: number, sellingPrice?: number, imageUrl?: string | null, isReadyMade?: boolean, stockCount?: number): Promise<{ success: boolean; item?: ServiceModelItem; error?: string }> {
    try {
        const newItem = await addStockItem(name, buyingPrice, sellingPrice, imageUrl, isReadyMade, stockCount);
        if (newItem) {
            revalidatePath(STOCK_REPORTS_PATH);
            return { success: true, item: newItem };
        }
        return { success: false, error: "Failed to add item to stock database." };
    } catch (error) {
        console.error("Error in addStockAction:", error);
        return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
    }
}

export async function updateStockAction(id: string, name: string, buyingPrice?: number, sellingPrice?: number, imageUrl?: string | null, isReadyMade?: boolean, stockCountChange?: number): Promise<{ success: boolean; error?: string }> {
    try {
        const success = await updateStockItem(id, name, buyingPrice, sellingPrice, imageUrl, isReadyMade, stockCountChange);
        if (success) {
            revalidatePath(STOCK_REPORTS_PATH);
            return { success: true };
        }
        return { success: false, error: "Failed to update item in stock database." };
    } catch (error) {
        console.error("Error in updateStockAction:", error);
        return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
    }
}

export async function deleteStockAction(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const success = await deleteStockItem(id);
        if (success) {
            revalidatePath(STOCK_REPORTS_PATH);
            return { success: true };
        }
        return { success: false, error: "Failed to delete item from stock database." };
    } catch (error) {
        console.error("Error in deleteStockAction:", error);
        return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
    }
}

// Sell Entry Actions
export async function addSellEntryAction(
    items: { productId: string; productName: string; quantity: number }[],
    recordedByUserId: string,
    recordedByUserName: string,
    createdAt?: string,
    status?: 'Pending' | 'Approved'
): Promise<{ success: boolean; entry?: SellEntry; error?: string }> {
    try {
        const newEntry = await addSellEntry(items, recordedByUserId, recordedByUserName, createdAt, status);
        if (newEntry) {
            revalidatePath(STOCK_REPORTS_PATH);
            return { success: true, entry: newEntry };
        }
        return { success: false, error: "Failed to add sell entry." };
    } catch (error) {
        console.error("Error in addSellEntryAction:", error);
        return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
    }
}

export async function approveSellEntryAction(
    id: string,
    approvedByUserId: string,
    approvedByUserName: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const success = await approveSellEntry(id, approvedByUserId, approvedByUserName);
        if (success) {
            revalidatePath(STOCK_REPORTS_PATH);
            return { success: true };
        }
        return { success: false, error: "Failed to approve sell entry." };
    } catch (error) {
        console.error("Error in approveSellEntryAction:", error);
        return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
    }
}

export async function rejectSellEntryAction(
    id: string,
    rejectedByUserId: string,
    rejectedByUserName: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const success = await rejectSellEntry(id, rejectedByUserId, rejectedByUserName);
        if (success) {
            revalidatePath(STOCK_REPORTS_PATH);
            return { success: true };
        }
        return { success: false, error: "Failed to reject sell entry." };
    } catch (error) {
        console.error("Error in rejectSellEntryAction:", error);
        return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
    }
}

export async function deleteSellEntryAction(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const success = await deleteSellEntry(id);
        if (success) {
            revalidatePath(STOCK_REPORTS_PATH);
            return { success: true };
        }
        return { success: false, error: "Failed to delete sell entry." };
    } catch (error) {
        console.error("Error in deleteSellEntryAction:", error);
        return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
    }
}
