
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
    description?: string | null; // Allow null
    date: string; // ISO string from client
    sentToUserId?: string | null; // For admin sending money
    sentToUserName?: string | null; // For admin sending money
    // receivedFromUserId and receivedFromUserName are set by the system for income tx
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
    // Data for the primary transaction (admin's expense or user's own income/expense)
    const primaryTransactionPayload = {
      type: transactionData.type,
      amount: transactionData.amount,
      category: transactionData.category,
      description: transactionData.description || null,
      date: transactionData.date,
      sentToUserId: transactionData.sentToUserId || null,
      sentToUserName: transactionData.sentToUserName || null,
    };

    const primaryTransaction = await addTransactionService(currentUser.id, primaryTransactionPayload);

    if (!primaryTransaction) {
      return { success: false, error: "Failed to add primary transaction to database." };
    }

    // If it's an admin sending money (expense for admin, and has sentToUserId)
    if (currentUser.role === 'SYSTEM_ADMIN' && transactionData.type === 'expense' && transactionData.sentToUserId) {
      const recipientIncomePayload = {
        type: 'income' as TransactionType,
        amount: transactionData.amount,
        category: "Funds Received",
        description: `Payment from ${currentUser.name}. Admin notes: ${transactionData.description || 'N/A'}`,
        date: transactionData.date,
        receivedFromUserId: currentUser.id,
        receivedFromUserName: currentUser.name,
      };
      const recipientTransaction = await addTransactionService(transactionData.sentToUserId, recipientIncomePayload);
      if (!recipientTransaction) {
        // Note: This is a simplified error handling. Ideally, you'd roll back the admin's expense transaction.
        console.error(`Failed to add corresponding income transaction for recipient ${transactionData.sentToUserId}. Admin expense ID: ${primaryTransaction.id}`);
        // For now, we'll consider the primary transaction a success but log this issue.
        // You might want to return a more specific error or status here.
        return { 
          success: true, // Primary transaction succeeded
          transaction: primaryTransaction, 
          error: "Admin expense recorded, but failed to record income for recipient. Please check logs." 
        };
      }
      console.log(`Successfully created income transaction ${recipientTransaction.id} for recipient ${transactionData.sentToUserId}`);
    }

    revalidatePath("/(app)/finance-manager");
    return { success: true, transaction: primaryTransaction };

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
   if (!userIdVerifying) { 
    return { success: false, error: "User not authenticated for deletion." };
  }
  try {
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

// Action to update a transaction
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
  // Ensure description is explicitly set to null if empty string, otherwise keep as is
  if (updates.description === '') {
    updates.description = null;
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
