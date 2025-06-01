
"use server";

import { revalidatePath } from "next/cache";
import { 
  setCrmCompletionStatusIds, 
  setCommentsVisibility,
  setRolesAllowedToEditOrders
} from "@/lib/settings-service";
import type { UserRole, User } from "@/types"; 
import { adminApp } from '@/lib/firebase-admin'; // Import Firebase Admin
import { getUsers as getAllUsersFromDb, getUserById } from '@/lib/user-service'; // To fetch users and their tokens
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
  if (!actingUser || (actingUser.role !== 'SYSTEM_ADMIN')) { // Restrict to SYSTEM_ADMIN for real sending
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

  try {
    if (targetType === 'users' && targetUserIds && targetUserIds.length > 0) {
      targetDescription = `specific users (${targetUserIds.length})`;
      const usersToNotify: User[] = [];
      for (const userId of targetUserIds) {
        const user = await getUserById(userId); // Assuming getUserById fetches a single user
        if (user) usersToNotify.push(user);
      }
      tokensToSend = usersToNotify.filter(u => u.fcmToken).map(u => u.fcmToken!);
    } else if (targetType === 'roles' && targetRoles && targetRoles.length > 0) {
      targetDescription = `users with roles: ${targetRoles.join(', ')}`;
      const allUsers = await getAllUsersFromDb();
      tokensToSend = allUsers.filter(u => u.fcmToken && targetRoles.includes(u.role)).map(u => u.fcmToken!);
    } else if (targetType === 'all') {
      // Sending to "all users" by fetching all tokens is generally not recommended for large user bases from a single server action.
      // Consider using FCM topic messaging for "all users" scenarios.
      // For this implementation, "all users" will not send a real push to avoid performance issues.
      console.warn("sendPushNotificationAction: Target 'all' selected. Real push notification to ALL users is not implemented in this version due to potential scalability issues. This will be a simulation only.");
      // Log the simulation for "all"
      const fcmLikePayloadForLog = {
        notification: { title, body, ...(iconUrl && { icon: iconUrl }) },
        data: { ...(targetUrl && { click_action: targetUrl, targetUrl }), ...(iconUrl && { iconUrl }), ...(soundUrl && { soundUrl }) }
      };
      console.log("--- SIMULATING PUSH NOTIFICATION SEND (Target: All Users) ---");
      console.log("Acting User:", { id: actingUser.id, name: actingUser.name, role: actingUser.role });
      console.log("FCM-like Payload (SIMULATED):", JSON.stringify(fcmLikePayloadForLog, null, 2));
      console.log("--- END SIMULATION ---");
      return { 
        success: true, // Technically success as a simulation was logged
        message: "Notification to 'All Users' (SIMULATED) and logged to console. Real sending to all users is not implemented for performance reasons. Use Firebase Console for broadcast or implement topic messaging.",
      };
    } else {
      return { success: false, message: "Invalid targeting information provided.", error: "Invalid target."};
    }

    if (tokensToSend.length === 0) {
      return { success: false, message: `No users with FCM tokens found for the selected target: ${targetDescription}.`, error: "No recipients found." };
    }

    // Construct the FCM message payload
    const message: messaging.MulticastMessage = {
      notification: {
        title: title,
        body: body,
        ...(iconUrl && {imageUrl: iconUrl}) // Standard FCM field for notification image
      },
      data: {
        title: title, // Send title/body in data too for SW flexibility
        body: body,
        ...(iconUrl && { icon: iconUrl }), // For custom SW handling
        ...(targetUrl && { click_action: targetUrl, targetUrl: targetUrl }),
        ...(soundUrl && { sound: soundUrl }) // 'sound' is often used, but SW can use 'soundUrl' from data
      },
      tokens: tokensToSend,
      // Optional: Android specific config
      // android: {
      //   notification: {
      //     sound: soundUrl ? 'custom_sound.wav' : 'default', // if using custom sound files in app
      //     channelId: 'your_channel_id' // For Android O+
      //   }
      // },
      // Optional: APNS specific config
      // apns: {
      //   payload: {
      //     aps: {
      //       sound: soundUrl ? 'custom_sound.aiff' : 'default'
      //     }
      //   }
      // }
    };
    
    if (iconUrl && message.notification) { // Ensure notification object exists
       message.notification.imageUrl = iconUrl; // Standard field
    }


    console.log(`Attempting to send push notification to ${tokensToSend.length} tokens for target: ${targetDescription}`);
    const response = await adminApp.messaging().sendEachForMulticast(message as admin.messaging.MulticastMessage);
    
    const successfulSends = response.successCount;
    const failedSends = response.failureCount;
    
    console.log(`Push Notification Send Results: ${successfulSends} successful, ${failedSends} failed.`);
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.error(`Failed to send to token ${tokensToSend[idx]}: ${resp.error?.message} (Code: ${resp.error?.code})`);
      }
    });

    return { 
      success: true, 
      message: `Notification sent to ${successfulSends} device(s). ${failedSends > 0 ? `${failedSends} failed.` : ''} (Target: ${targetDescription})`
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
