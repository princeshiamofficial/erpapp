
"use server";

import { revalidatePath } from "next/cache";
import type { Transaction, TransactionType, User, UserRole } from "@/types";
import {
  addTransaction as addTransactionService,
  deleteTransaction as deleteTransactionService,
  updateTransaction as updateTransactionService,
  getTransactionById
} from "@/lib/personal-finance-service";
import { adminApp } from '@/lib/firebase-admin';
import { getUserById } from '@/lib/user-service';
import type { messaging } from 'firebase-admin';
import { getGlobalSettings } from '@/lib/settings-service';

const formatAmountForNotification = (amount: number): string => {
  return `BDT ${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

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

    // If it's an admin sending money (expense for admin, and has sentToUserId),
    // create a corresponding income transaction for the recipient.
    // This section handles the dual entry:
    // 1. The `primaryTransaction` (above) is the System Admin's EXPENSE.
    // 2. The `recipientTransaction` (below) is the recipient staff user's INCOME.
    if (currentUser.role === 'SYSTEM_ADMIN' && transactionData.type === 'expense' && transactionData.sentToUserId) {
      console.log(`Admin ${currentUser.name} sending money to ${transactionData.sentToUserName}. Creating income record for recipient.`);
      const recipientIncomePayload = {
        type: 'income' as TransactionType,
        amount: transactionData.amount,
        category: `Received from ${currentUser.name}`,
        description: `Payment from ${currentUser.name}. Notes: ${transactionData.description || 'N/A'}`,
        date: transactionData.date,
        receivedFromUserId: currentUser.id,
        receivedFromUserName: currentUser.name,
      };
      const recipientTransaction = await addTransactionService(transactionData.sentToUserId, recipientIncomePayload);

      if (!recipientTransaction) {
        console.error(`Failed to add corresponding income transaction for recipient ${transactionData.sentToUserId}. Admin expense ID: ${primaryTransaction.id}. This is a critical issue and may require manual correction.`);
        return {
          success: true, 
          transaction: primaryTransaction,
          error: "Admin expense recorded, but failed to record income for recipient. Please check logs for recipient ID: " + transactionData.sentToUserId
        };
      } else {
        console.log(`Successfully created income transaction ${recipientTransaction.id} for recipient ${transactionData.sentToUserName} (ID: ${transactionData.sentToUserId})`);

        // ---- START: Send Push Notification to Recipient ----
        try {
          const recipientUser = await getUserById(transactionData.sentToUserId);
          if (recipientUser && recipientUser.fcmToken) {
            console.log(`[addTransactionAction] Recipient ${recipientUser.name} has FCM token. Attempting to send push notification.`);

            const globalSettings = await getGlobalSettings();
            const customSoundUrl = globalSettings.toastSoundUrl;

            const notificationTitle = "Funds Received!";
            const notificationBody = `You have received ${formatAmountForNotification(transactionData.amount)} from ${currentUser.name}.`;

            const fcmMessage: messaging.Message = {
              token: recipientUser.fcmToken,
              notification: {
                title: notificationTitle,
                body: notificationBody,
                icon: '/icons/icon-192x192.png'
              },
              data: { 
                title: notificationTitle,
                body: notificationBody,
                icon: '/icons/icon-192x192.png',
                iconUrl: '/icons/icon-192x192.png',
                targetUrl: '/finance-manager',
                click_action: '/finance-manager',
                ...(customSoundUrl && { customSoundUrl: customSoundUrl })
              },
              webpush: {
                notification: {
                  icon: '/icons/icon-192x192.png',
                  ...(customSoundUrl ? {} : { sound: "default" }) 
                },
                fcmOptions: {
                  link: '/finance-manager'
                }
              },
            };
            
            if (adminApp && typeof adminApp.messaging === 'function') {
                await adminApp.messaging().send(fcmMessage);
                console.log(`[addTransactionAction] Push notification sent to ${recipientUser.name} for received funds.`);
            } else {
                console.warn("[addTransactionAction] Firebase Admin SDK not properly initialized. Cannot send push notification for received funds.");
            }

          } else if (recipientUser) {
            console.log(`[addTransactionAction] Recipient ${recipientUser.name} does not have an FCM token. Skipping push notification.`);
          } else {
            console.warn(`[addTransactionAction] Could not fetch recipient user details for ID ${transactionData.sentToUserId}. Skipping push notification.`);
          }
        } catch (notifError) {
          console.error(`[addTransactionAction] Error sending push notification for received funds to user ${transactionData.sentToUserId}:`, notifError);
        }
        // ---- END: Send Push Notification to Recipient ----
      }
    }

    revalidatePath("/(app)/finance-manager");
    return { success: true, transaction: primaryTransaction };

  } catch (error) {
    console.error("Error in addTransactionAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: errorMessage };
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

    // System Admins can delete any transaction.
    if (userRoleVerifying === 'SYSTEM_ADMIN') {
      const success = await deleteTransactionService(transactionId);
      if (success) {
        revalidatePath("/(app)/finance-manager");
        return { success: true };
      }
      return { success: false, error: "Failed to delete transaction from database (Admin)." };
    }

    // Prevent recipient from deleting system-generated income
    if (
      transaction.type === 'income' &&
      transaction.receivedFromUserId && // It was received from someone
      userIdVerifying === transaction.userId // User trying to delete IS the recipient
    ) {
      return { success: false, error: "Cannot delete income transactions received from system transfers." };
    }

    // Other users can only delete their own transactions (that are not system-generated income)
    if (transaction.userId !== userIdVerifying) {
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

    // System Admins can edit any transaction.
    if (userRoleVerifying === 'SYSTEM_ADMIN') {
      const sanitizedUpdates = { ...updates };
      if (sanitizedUpdates.description === '') sanitizedUpdates.description = null;
      const success = await updateTransactionService(transactionId, sanitizedUpdates);
      if (success) {
        revalidatePath("/(app)/finance-manager");
        return { success: true };
      }
      return { success: false, error: "Failed to update transaction (Admin)." };
    }
    
    // Prevent recipient from editing system-generated income
    if (
      transaction.type === 'income' &&
      transaction.receivedFromUserId && 
      userIdVerifying === transaction.userId
    ) {
      return { success: false, error: "Cannot edit income transactions received from system transfers." };
    }

    // Other users can only edit their own transactions (that are not system-generated income)
     if (transaction.userId !== userIdVerifying) {
        return { success: false, error: "You do not have permission to edit this transaction." };
    }

    const sanitizedUpdates = { ...updates };
    if (sanitizedUpdates.description === '') sanitizedUpdates.description = null;

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
