
"use server";

import { revalidatePath } from "next/cache";
import type { Transaction, TransactionType, User, UserRole, PersonalNote } from "@/types";
import {
  addTransaction as addTransactionService,
  deleteTransaction as deleteTransactionService,
  updateTransaction as updateTransactionService,
  getTransactionById,
  getAllTransactions as getAllTransactionsService,
  getTransactionsForUser as getTransactionsForUserService,
  addPersonalNote as addPersonalNoteService,
  getPersonalNotesForUser as getPersonalNotesForUserService,
  updatePersonalNote as updatePersonalNoteService,
  deletePersonalNote as deletePersonalNoteService,
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
    documentUrl?: string | null; // Added documentUrl
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
  // Allow admins to skip document uploads, but not regular users for these types
  if (currentUser.role !== 'SYSTEM_ADMIN' && (transactionData.type === 'expense' || transactionData.type === 'purchase') && !transactionData.documentUrl && !transactionData.sentToUserId) { // Don't require doc for sent money
    return { success: false, error: "Document is required for expenses and purchases." };
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
      documentUrl: transactionData.documentUrl || null, // Pass documentUrl
    };

    const primaryTransaction = await addTransactionService(currentUser.id, primaryTransactionPayload);

    if (!primaryTransaction) {
      return { success: false, error: "Failed to add primary transaction to database." };
    }

    if (currentUser.role === 'SYSTEM_ADMIN' && transactionData.type === 'expense' && transactionData.sentToUserId) {
      console.log(`Admin ${currentUser.name} sending money to ${transactionData.sentToUserName}. Creating income record for recipient.`);
      const recipientIncomePayload = {
        type: 'income' as TransactionType,
        amount: transactionData.amount,
        category: `Funds from ${currentUser.name}`,
        description: `Payment from ${currentUser.name}. Notes: ${transactionData.description || 'N/A'}`,
        date: transactionData.date,
        receivedFromUserId: currentUser.id,
        receivedFromUserName: currentUser.name,
        // Document URL from the admin's expense transaction is not typically copied to the recipient's income record.
        // If this is desired, add: documentUrl: transactionData.documentUrl || null,
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
        try {
          const recipientUser = await getUserById(transactionData.sentToUserId);
          if (recipientUser && recipientUser.fcmToken) {
            console.log(`[addTransactionAction - Send Money] Recipient ${recipientUser.name} has FCM token. Attempting to send push notification.`);
            const globalSettings = await getGlobalSettings();
            const customSoundUrl = globalSettings.toastSoundUrl;
            const notificationTitle = "Funds Received!";
            const notificationBody = `You have received ${formatAmountForNotification(transactionData.amount)} from ${currentUser.name}.`;
            const targetUrl = '/finance-manager';
            const fcmMessage: messaging.Message = {
              token: recipientUser.fcmToken,
              notification: { title: notificationTitle, body: notificationBody, icon: '/icons/icon-192x192.png' },
              data: { title: notificationTitle, body: notificationBody, iconUrl: '/icons/icon-192x192.png', targetUrl: targetUrl, click_action: targetUrl, ...(customSoundUrl && { customSoundUrl: customSoundUrl }) },
              webpush: { notification: { icon: '/icons/icon-192x192.png', badge: '/icons/icon-72x72.png', ...(customSoundUrl ? {} : { sound: "default" }) }, fcmOptions: { link: targetUrl } },
            };
            if (adminApp && typeof adminApp.messaging === 'function') {
                await adminApp.messaging().send(fcmMessage);
                console.log(`[addTransactionAction - Send Money] Push notification sent to ${recipientUser.name} for received funds.`);
            } else {
                console.warn("[addTransactionAction - Send Money] Firebase Admin SDK not properly initialized. Cannot send push notification for received funds.");
            }
          } else if (recipientUser) {
            console.log(`[addTransactionAction - Send Money] Recipient ${recipientUser.name} does not have an FCM token. Skipping push notification.`);
          } else {
            console.warn(`[addTransactionAction - Send Money] Could not fetch recipient user details for ID ${transactionData.sentToUserId}. Skipping push notification.`);
          }
        } catch (notifError) {
          console.error(`[addTransactionAction - Send Money] Error sending push notification for received funds to user ${transactionData.sentToUserId}:`, notifError);
        }
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
    if (userRoleVerifying === 'SYSTEM_ADMIN') {
      const success = await deleteTransactionService(transactionId);
      if (success) {
        revalidatePath("/(app)/finance-manager");
        return { success: true };
      }
      return { success: false, error: "Failed to delete transaction from database (Admin)." };
    }
    if (transaction.type === 'income' && transaction.receivedFromUserId && userIdVerifying === transaction.userId && userRoleVerifying !== 'SYSTEM_ADMIN') {
      return { success: false, error: "Cannot delete income transactions received from system transfers." };
    }
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

    const sanitizedUpdates = { ...updates };
    if (sanitizedUpdates.description === '') sanitizedUpdates.description = null;
    if (sanitizedUpdates.documentUrl === '') sanitizedUpdates.documentUrl = null; // Allow removing documentUrl


    if (userRoleVerifying === 'SYSTEM_ADMIN') {
      const success = await updateTransactionService(transactionId, sanitizedUpdates);
      if (success) {
        revalidatePath("/(app)/finance-manager");
        return { success: true };
      }
      return { success: false, error: "Failed to update transaction (Admin)." };
    }
    if (transaction.type === 'income' && transaction.receivedFromUserId && userIdVerifying === transaction.userId && userRoleVerifying !== 'SYSTEM_ADMIN') {
      return { success: false, error: "Cannot edit income transactions received from system transfers." };
    }
     if (transaction.userId !== userIdVerifying) {
        return { success: false, error: "You do not have permission to edit this transaction." };
    }
    
    // Non-admin can't change type of 'expense' (sent money) to something else if it's a system-generated pair.
    if (transaction.type === 'expense' && transaction.sentToUserId && updates.type && updates.type !== 'expense') {
        return { success: false, error: "Cannot change the type of a 'Sent Money' transaction."};
    }
    // Similarly for 'income' (received money)
    if (transaction.type === 'income' && transaction.receivedFromUserId && updates.type && updates.type !== 'income') {
        return { success: false, error: "Cannot change the type of a 'Received Money' transaction."};
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

// Server action to get transactions for the current user
export async function getTransactionsForUserAction(userId: string): Promise<Transaction[]> {
  return getTransactionsForUserService(userId);
}

// Server action to get all transactions (for admin)
export async function getAllTransactionsAction(): Promise<Transaction[]> {
  return getAllTransactionsService();
}


// Note Actions
export async function addNoteAction(
  noteData: Omit<PersonalNote, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; note?: PersonalNote; error?: string }> {
  if (!noteData.userId) {
    return { success: false, error: "User ID is required to add a note." };
  }
  if (!noteData.title?.trim()) {
    return { success: false, error: "Note title cannot be empty." };
  }
  try {
    const newNote = await addPersonalNoteService(noteData);
    if (newNote) {
      revalidatePath("/(app)/finance-manager");
      return { success: true, note: newNote };
    }
    return { success: false, error: "Failed to add note to database." };
  } catch (error) {
    console.error("Error in addNoteAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function getNotesForUserAction(userId: string): Promise<PersonalNote[]> {
  if (!userId) {
    console.error("getNotesForUserAction: userId is required.");
    return [];
  }
  return getPersonalNotesForUserService(userId);
}

export async function updateNoteAction(
  noteId: string,
  updates: Partial<Omit<PersonalNote, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<{ success: boolean; error?: string }> {
  if (!updates.title?.trim()) {
    return { success: false, error: "Note title cannot be empty." };
  }
  try {
    const success = await updatePersonalNoteService(noteId, updates);
    if (success) {
      revalidatePath("/(app)/finance-manager");
      return { success: true };
    }
    return { success: false, error: "Failed to update note in database." };
  } catch (error) {
    console.error("Error in updateNoteAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function deleteNoteAction(noteId: string, userIdVerifying: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Optional: Verify if the user owns the note before deleting, if needed.
    // For now, assuming deletion is allowed if the action is called.
    const success = await deletePersonalNoteService(noteId, userIdVerifying); // Pass userIdVerifying
    if (success) {
      revalidatePath("/(app)/finance-manager");
      return { success: true };
    }
    return { success: false, error: "Failed to delete note from database or permission denied." };
  } catch (error) {
    console.error("Error in deleteNoteAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}
