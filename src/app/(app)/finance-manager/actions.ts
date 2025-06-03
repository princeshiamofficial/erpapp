
"use server";

import { revalidatePath } from "next/cache";
import type { Transaction, TransactionType, User } from "@/types";
import {
  addTransaction as addTransactionService,
  deleteTransaction as deleteTransactionService,
  updateTransaction as updateTransactionService,
  getTransactionById // Ensure this is exported from personal-finance-service
} from "@/lib/personal-finance-service";

// Action to add a new transaction
export async function addTransactionAction(
  currentUser: User,
  transactionData: {
    type: TransactionType;
    amount: number;
    category: string;
    description?: string | null;
    date: string;
    sentToUserId?: string | null;
    sentToUserName?: string | null;
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
    // This is the primary transaction (admin's expense or user's own income/expense)
    const primaryTransactionPayload = {
      type: transactionData.type,
      amount: transactionData.amount,
      category: transactionData.category,
      description: transactionData.description || null,
      date: transactionData.date,
      sentToUserId: transactionData.sentToUserId || null, // For admin's expense, notes who it was sent to
      sentToUserName: transactionData.sentToUserName || null,
    };

    const primaryTransaction = await addTransactionService(currentUser.id, primaryTransactionPayload);

    if (!primaryTransaction) {
      return { success: false, error: "Failed to add primary transaction to database." };
    }

    // If it's an admin sending money (expense for admin, and has sentToUserId),
    // create a corresponding income transaction for the recipient.
    if (currentUser.role === 'SYSTEM_ADMIN' && transactionData.type === 'expense' && transactionData.sentToUserId) {
      // This section handles the dual entry:
      // 1. The `primaryTransaction` (above) is the System Admin's EXPENSE.
      // 2. The `recipientTransaction` (below) is the recipient staff user's INCOME.
      console.log(`Admin ${currentUser.name} sending money to ${transactionData.sentToUserName}. Creating income record for recipient.`);
      const recipientIncomePayload = {
        type: 'income' as TransactionType,
        amount: transactionData.amount,
        category: "Funds Received", // Standardized category for received funds
        description: `Payment from ${currentUser.name}. Notes: ${transactionData.description || 'N/A'}`,
        date: transactionData.date,
        receivedFromUserId: currentUser.id, // For recipient's income, notes who it was received from
        receivedFromUserName: currentUser.name,
      };
      const recipientTransaction = await addTransactionService(transactionData.sentToUserId, recipientIncomePayload);

      if (!recipientTransaction) {
        console.error(`Failed to add corresponding income transaction for recipient ${transactionData.sentToUserId}. Admin expense ID: ${primaryTransaction.id}. This is a critical issue and may require manual correction.`);
        // For now, we'll consider the primary transaction a success but return a specific error message.
        // Ideally, this would be a transactional operation or have rollback logic.
        return {
          success: true, // Primary transaction succeeded
          transaction: primaryTransaction,
          error: "Admin expense recorded, but failed to record income for recipient. Please check logs for recipient ID: " + transactionData.sentToUserId
        };
      }
      console.log(`Successfully created income transaction ${recipientTransaction.id} for recipient ${transactionData.sentToUserName} (ID: ${transactionData.sentToUserId})`);
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
  userIdVerifying: string,
  userRoleVerifying: UserRole
): Promise<{ success: boolean; error?: string }> {
  if (!userIdVerifying) {
    return { success: false, error: "User not authenticated for deletion." };
  }
  try {
    const transaction = await getTransactionById(transactionId);
    if (!transaction) {
      return { success: false, error: "Transaction not found." };
    }

    // Prevent recipient from deleting system-generated income
    if (
      transaction.type === 'income' &&
      transaction.receivedFromUserId && // It was received from someone
      userIdVerifying === transaction.userId && // User trying to delete IS the recipient
      userRoleVerifying !== 'SYSTEM_ADMIN'   // And user is NOT a System Admin
    ) {
      return { success: false, error: "Cannot delete income transactions received from system transfers." };
    }

    // System Admins can delete any transaction. Other users can only delete their own.
    if (userRoleVerifying !== 'SYSTEM_ADMIN' && transaction.userId !== userIdVerifying) {
        return { success: false, error: "You do not have permission to delete this transaction." };
    }


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
  userIdVerifying: string,
  userRoleVerifying: UserRole
): Promise<{ success: boolean; error?: string }> {
  if (!userIdVerifying) {
    return { success: false, error: "User not authenticated for update." };
  }
  if (updates.amount !== undefined && updates.amount <= 0) {
    return { success: false, error: "Amount must be a positive number." };
  }

  try {
    const transaction = await getTransactionById(transactionId);
    if (!transaction) {
      return { success: false, error: "Transaction not found." };
    }

    // Prevent recipient from editing system-generated income
    if (
      transaction.type === 'income' &&
      transaction.receivedFromUserId && // It was received from someone
      userIdVerifying === transaction.userId && // User trying to update IS the recipient
      userRoleVerifying !== 'SYSTEM_ADMIN'   // And user is NOT a System Admin
    ) {
      // More granular control could be added here if some fields (e.g., description) are allowed to be edited
      return { success: false, error: "Cannot edit income transactions received from system transfers." };
    }

    // System Admins can edit any transaction. Other users can only edit their own.
     if (userRoleVerifying !== 'SYSTEM_ADMIN' && transaction.userId !== userIdVerifying) {
        return { success: false, error: "You do not have permission to edit this transaction." };
    }

    // Ensure description is explicitly set to null if empty string, otherwise keep as is
    const sanitizedUpdates = { ...updates };
    if (sanitizedUpdates.description === '') {
      sanitizedUpdates.description = null;
    }


    const success = await updateTransactionService(transactionId, sanitizedUpdates);
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
