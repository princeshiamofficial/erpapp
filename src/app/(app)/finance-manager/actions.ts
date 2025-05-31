
"use server";

import { revalidatePath } from "next/cache";
import type { Transaction, TransactionType, User } from "@/types";
import { 
  addTransaction as addTransactionService, 
  deleteTransaction as deleteTransactionService,
  updateTransaction as updateTransactionService
} from "@/lib/personal-finance-service";

// Action to add a new transaction
export async function addTransactionAction(
  currentUser: User,
  transactionData: {
    type: TransactionType;
    amount: number;
    category: string;
    description?: string;
    date: string; // ISO string from client
  }
): Promise<{ success: boolean; transaction?: Transaction; error?: string }> {
  if (!currentUser || !currentUser.id) {
    return { success: false, error: "User not authenticated." };
  }
  if (!transactionData.type || !transactionData.amount || !transactionData.category || !transactionData.date) {
    return { success: false, error: "Missing required transaction fields (type, amount, category, date)." };
  }
  if (transactionData.amount <= 0) {
    return { success: false, error: "Amount must be a positive number." };
  }

  try {
    const newTransaction = await addTransactionService(currentUser.id, transactionData);
    if (newTransaction) {
      revalidatePath("/(app)/finance-manager");
      return { success: true, transaction: newTransaction };
    }
    return { success: false, error: "Failed to add transaction to database." };
  } catch (error) {
    console.error("Error in addTransactionAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

// Action to delete a transaction
export async function deleteTransactionAction(
  transactionId: string,
  userIdVerifying: string // Ensure the user deleting owns it or is admin
): Promise<{ success: boolean; error?: string }> {
   if (!userIdVerifying) { // Basic check, proper permission check might involve fetching transaction first
    return { success: false, error: "User not authenticated for deletion." };
  }
  try {
    // Future enhancement: verify ownership or admin role before deleting if not done on client
    const success = await deleteTransactionService(transactionId);
    if (success) {
      revalidatePath("/(app)/finance-manager");
      return { success: true };
    }
    return { success: false, error: "Failed to delete transaction from database." };
  } catch (error) {
    console.error("Error in deleteTransactionAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

// Action to update a transaction (placeholder, more fields can be added)
export async function updateTransactionAction(
  transactionId: string,
  updates: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>,
  userIdVerifying: string
): Promise<{ success: boolean; error?: string }> {
  if (!userIdVerifying) {
    return { success: false, error: "User not authenticated for update." };
  }
  if (updates.amount !== undefined && updates.amount <= 0) {
    return { success: false, error: "Amount must be a positive number." };
  }
  try {
    const success = await updateTransactionService(transactionId, updates);
    if (success) {
      revalidatePath("/(app)/finance-manager");
      return { success: true };
    }
    return { success: false, error: "Failed to update transaction." };
  } catch (error) {
    console.error("Error in updateTransactionAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
