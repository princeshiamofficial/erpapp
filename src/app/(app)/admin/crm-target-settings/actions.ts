
"use server";

import { revalidatePath } from "next/cache";
import { 
  setCrmCompletionStatusIds, 
  setCommentsVisibility,
  setRolesAllowedToEditOrders
} from "@/lib/settings-service";
import type { UserRole, User } from "@/types"; 
import { adminApp } from '@/lib/firebase-admin'; 
import { getUsers as getAllUsersFromDb, getUserById } from '@/lib/user-service'; 
import type { messaging } from 'firebase-admin';


export async function updateCompletionStatusIdsAction(ids: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await setCrmCompletionStatusIds(ids);
    if (success) {
      revalidatePath("/(app)/admin/crm-target-settings");
      revalidatePath("/(app)/dashboard"); 
      revalidatePath("/(app)/leaderboard"); 
      return { success: true };
    }
    return { success: false, error: "Failed to update CRM completion status settings in database." };
  } catch (error) {
    console.error("Error in updateCompletionStatusIdsAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateCommentsVisibilityAction(isVisible: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await setCommentsVisibility(isVisible);
    if (success) {
      revalidatePath("/(app)/admin/crm-target-settings"); 
      revalidatePath("/track/[trackingId]", "layout"); 
      return { success: true };
    }
    return { success: false, error: "Failed to update comments visibility setting in database." };
  } catch (error) {
    console.error("Error in updateCommentsVisibilityAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateRolesAllowedToEditOrdersAction(roles: UserRole[]): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await setRolesAllowedToEditOrders(roles);
    if (success) {
      revalidatePath("/(app)/admin/crm-target-settings");
      revalidatePath("/(app)/orders"); 
      return { success: true };
    }
    return { success: false, error: "Failed to update order editing permissions in database." };
  } catch (error) {
    console.error("Error in updateRolesAllowedToEditOrdersAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

interface AppNotificationPayload {
  title: string;
  body: string;
  iconUrl?: string;
  targetUrl?: string;
  soundUrl?: string; 
  targetType: 'all' | 'roles' | 'users';
  targetRoles?: UserRole[];
  targetUserIds?: string[];
}

export async function sendPushNotificationAction(
  payload: AppNotificationPayload,
  actingUser: User
): Promise<{ success: boolean; message: string; error?: string }> {
  if (!actingUser || (actingUser.role !== 'SYSTEM_ADMIN')) { 
    return { success: false, message: "Permission denied.", error: "Only System Administrators can send push notifications." };
  }

  if (!adminApp) {
    console.error("sendPushNotificationAction: Firebase Admin SDK not initialized. Cannot send real push notifications.");
    return { 
      success: false, 
      message: "Configuration Error: Firebase Admin SDK not initialized. Real push notifications disabled.",
      error: "Firebase Admin SDK is not configured on the server. Please check server logs and environment variables (GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON)."
    };
  }

  const { title, body, iconUrl, targetUrl, soundUrl, targetType, targetRoles, targetUserIds } = payload;

  if (!title || !body) {
    return { success: false, message: "Title and body are required for the notification.", error: "Missing title or body."};
  }

  let tokensToSend: string[] = [];
  let targetDescription = "";
  let allUsersWarning = "";

  try {
    if (targetType === 'users' && targetUserIds && targetUserIds.length > 0) {
      targetDescription = `specific users (${targetUserIds.length})`;
      const usersToNotify: User[] = [];
      for (const userId of targetUserIds) {
        const user = await getUserById(userId); 
        if (user) usersToNotify.push(user);
      }
      tokensToSend = usersToNotify.filter(u => u.fcmToken).map(u => u.fcmToken!);
    } else if (targetType === 'roles' && targetRoles && targetRoles.length > 0) {
      targetDescription = `users with roles: ${targetRoles.join(', ')}`;
      const allUsers = await getAllUsersFromDb();
      tokensToSend = allUsers.filter(u => u.fcmToken && targetRoles.includes(u.role)).map(u => u.fcmToken!);
    } else if (targetType === 'all') {
      targetDescription = "all users";
      const allUsers = await getAllUsersFromDb(); // Fetch all users
      tokensToSend = allUsers.filter(u => u.fcmToken).map(u => u.fcmToken!);
      console.log(`[sendPushNotificationAction] Target 'all': Found ${allUsers.length} total users, ${tokensToSend.length} with FCM tokens.`);
      if (tokensToSend.length === 0) {
          allUsersWarning = " (No users with FCM tokens found to send to.)";
      } else {
          allUsersWarning = ` (Attempting to send to ${tokensToSend.length} users with FCM tokens. For very large user bases, consider topic messaging.)`;
      }
    } else {
      return { success: false, message: "Invalid targeting information provided.", error: "Invalid target."};
    }

    if (tokensToSend.length === 0) {
      return { success: false, message: `No users with FCM tokens found for the selected target: ${targetDescription}.`, error: "No recipients found." };
    }

    const fcmMessagePayload: messaging.MulticastMessage = {
      notification: {
        title: title,
        body: body,
        ...(iconUrl && {imageUrl: iconUrl})
      },
      data: { // Custom data payload for client to handle
        title: title, 
        body: body, // Duplicate for easier access on client if notification object isn't parsed directly
        ...(iconUrl && { icon: iconUrl, iconUrl: iconUrl }), // Send both for flexibility
        ...(targetUrl && { click_action: targetUrl, targetUrl: targetUrl }), // click_action is standard, targetUrl for custom handling
        ...(soundUrl && { sound: soundUrl }) 
      },
      tokens: tokensToSend,
      // Optional: Android specific config, APNS specific config, Webpush specific config
      // Example webpush config (can also be set globally on admin.messaging())
      // webpush: {
      //   notification: {
      //     icon: iconUrl || '/default-icon.png', // Default icon if not provided
      //   },
      //   fcmOptions: {
      //     link: targetUrl || 'https://your-app-domain.com' // Default click action
      //   }
      // }
    };
    
    // If an iconUrl is provided, ensure it's set on the notification part of the payload as imageUrl for FCM
    if (iconUrl && fcmMessagePayload.notification) { 
       fcmMessagePayload.notification.imageUrl = iconUrl; 
    }


    console.log(`[sendPushNotificationAction] Attempting to send REAL push notification to ${tokensToSend.length} tokens for target: ${targetDescription}`);
    console.log("[sendPushNotificationAction] FCM Message Payload:", JSON.stringify(fcmMessagePayload, null, 2));
    
    // @ts-ignore admin.messaging might be an issue with the type if not fully initialized, but should work if adminApp is valid
    const response = await adminApp.messaging().sendEachForMulticast(fcmMessagePayload as admin.messaging.MulticastMessage);
    
    const successfulSends = response.successCount;
    const failedSends = response.failureCount;
    
    console.log(`[sendPushNotificationAction] Push Notification Send Results: ${successfulSends} successful, ${failedSends} failed.`);
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.error(`[sendPushNotificationAction] Failed to send to token ${tokensToSend[idx]}: ${resp.error?.message} (Code: ${resp.error?.code})`);
      }
    });

    return { 
      success: true, 
      message: `Notification sent to ${successfulSends} device(s). ${failedSends > 0 ? `${failedSends} failed.` : ''} (Target: ${targetDescription}${allUsersWarning})`
    };

  } catch (error) {
    console.error("Error in sendPushNotificationAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while sending notification.";
    return { 
      success: false, 
      message: `Failed to send notifications: ${errorMessage}`,
      error: errorMessage 
    };
  }
}

    

    