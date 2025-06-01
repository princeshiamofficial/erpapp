
"use server";

import { revalidatePath } from "next/cache";
import { 
  setCrmCompletionStatusIds, 
  setCommentsVisibility,
  setRolesAllowedToEditOrders
} from "@/lib/settings-service";
import type { UserRole, User } from "@/types"; 


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

interface PushNotificationPayloadForFCM {
  notification: {
    title: string;
    body: string;
    icon?: string; // Optional: URL to an icon
    // sound?: string; // Optional: 'default' or URL to sound file
    // click_action?: string; // Optional: URL to open on click (often handled by data payload)
  };
  data?: {
    [key: string]: string; // Custom key-value pairs
    click_action?: string; // Standard key for URL to open
    targetUrl?: string; // Alternative for URL
    iconUrl?: string; // For custom icon handling in SW
    soundUrl?: string; // For custom sound handling in SW
  };
  // Targeting (e.g., to a specific token, topic, or condition) would be handled by Admin SDK
  // For example:
  // to?: string; // FCM token
  // topic?: string; // Topic name
}

interface AppNotificationPayload {
  title: string;
  body: string;
  iconUrl?: string;
  targetUrl?: string;
  soundUrl?: string; // Added for custom sound
  targetType: 'all' | 'roles' | 'users';
  targetRoles?: UserRole[];
  targetUserIds?: string[];
}

export async function sendPushNotificationAction(
  payload: AppNotificationPayload,
  actingUser: User
): Promise<{ success: boolean; message: string; error?: string }> {
  if (!actingUser || (actingUser.role !== 'SYSTEM_ADMIN' && actingUser.role !== 'ADMIN')) {
    return { success: false, message: "Permission denied.", error: "User does not have permission to send notifications." };
  }

  const { title, body, iconUrl, targetUrl, soundUrl, targetType, targetRoles, targetUserIds } = payload;

  if (!title || !body) {
    return { success: false, message: "Title and body are required for the notification.", error: "Missing title or body."};
  }

  // Construct a payload structure similar to what FCM expects
  const fcmLikePayload: PushNotificationPayloadForFCM = {
    notification: {
      title: title,
      body: body,
      ...(iconUrl && { icon: iconUrl }), // Standard FCM notification icon
      // sound: 'default' // Or a custom sound if supported directly
    },
    data: {
      ...(targetUrl && { click_action: targetUrl, targetUrl: targetUrl }), // click_action for SW, targetUrl for flexibility
      ...(iconUrl && { iconUrl: iconUrl }), // Custom data for SW to potentially override icon
      ...(soundUrl && { soundUrl: soundUrl }) // Custom data for SW to play specific sound
    }
  };


  console.log("--- SIMULATING PUSH NOTIFICATION SEND ---");
  console.log("Acting User:", { id: actingUser.id, name: actingUser.name, role: actingUser.role });
  console.log("FCM-like Payload that WOULD be sent to a backend for FCM delivery:");
  console.log(JSON.stringify(fcmLikePayload, null, 2));
  console.log("Targeting Details (for backend to resolve to FCM tokens):");
  console.log("  Type:", targetType);

  if (targetType === 'roles' && targetRoles && targetRoles.length > 0) {
    console.log("  Roles:", targetRoles.join(', '));
  } else if (targetType === 'users' && targetUserIds && targetUserIds.length > 0) {
    console.log("  User IDs:", targetUserIds.join(', '));
  } else if (targetType === 'all') {
    console.log("  Target: All Users with FCM Tokens");
  } else {
    console.log("--- END SIMULATION ---");
    return { success: false, message: "Invalid targeting information provided.", error: "Invalid target."};
  }
  console.log("--- END SIMULATION ---");

  // In a REAL SCENARIO, this action would:
  // 1. Determine the list of FCM tokens based on targetType, targetRoles, or targetUserIds.
  // 2. Send the `fcmLikePayload` to those tokens using Firebase Admin SDK (from a backend/Cloud Function).
  //    Example: await admin.messaging().sendToDevice(tokens, fcmLikePayload);
  //    OR: await admin.messaging().sendEachForMulticast({ tokens, ...fcmLikePayload });

  return { success: true, message: "Notification (SIMULATED) logged to console. A backend is needed for actual FCM delivery." };
}
