
"use server";

import { revalidatePath } from "next/cache";
import { 
  setCrmCompletionStatusIds, 
  setCommentsVisibility,
  setRolesAllowedToEditOrders
} from "@/lib/settings-service";
import type { UserRole, User } from "@/types"; // Added User
// import { getUsers } from "@/lib/user-service"; // Not needed here if tokens are sent from client/logged


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

interface PushNotificationPayload {
  title: string;
  body: string;
  iconUrl?: string;
  targetUrl?: string;
  targetType: 'all' | 'roles' | 'users';
  targetRoles?: UserRole[];
  targetUserIds?: string[];
}

export async function sendPushNotificationAction(
  payload: PushNotificationPayload,
  actingUser: User
): Promise<{ success: boolean; message: string; error?: string }> {
  if (!actingUser || (actingUser.role !== 'SYSTEM_ADMIN' && actingUser.role !== 'ADMIN')) {
    return { success: false, message: "Permission denied.", error: "User does not have permission to send notifications." };
  }

  const { title, body, iconUrl, targetUrl, targetType, targetRoles, targetUserIds } = payload;

  if (!title || !body) {
    return { success: false, message: "Title and body are required for the notification.", error: "Missing title or body." };
  }

  // Simulate sending logic
  console.log("--- SIMULATING PUSH NOTIFICATION SEND ---");
  console.log("Acting User:", { id: actingUser.id, name: actingUser.name, role: actingUser.role });
  console.log("Notification Details:");
  console.log("  Title:", title);
  console.log("  Body:", body);
  if (iconUrl) console.log("  Icon URL:", iconUrl);
  if (targetUrl) console.log("  Target URL:", targetUrl);
  console.log("Targeting:");
  console.log("  Type:", targetType);

  if (targetType === 'roles' && targetRoles && targetRoles.length > 0) {
    console.log("  Roles:", targetRoles.join(', '));
    // In a real scenario, you would fetch device tokens for users in these roles.
  } else if (targetType === 'users' && targetUserIds && targetUserIds.length > 0) {
    console.log("  User IDs:", targetUserIds.join(', '));
    // In a real scenario, you would fetch device tokens for these user IDs.
  } else if (targetType === 'all') {
    console.log("  Target: All Users");
    // In a real scenario, you might send to a topic or iterate through all users with tokens.
  } else {
    return { success: false, message: "Invalid targeting information provided.", error: "Invalid target."};
  }
  console.log("--- END SIMULATION ---");

  // This is where you would integrate with Firebase Admin SDK to send the actual push notifications
  // For example:
  // const tokens = await getDeviceTokensForTarget(targetType, targetRoles, targetUserIds);
  // await admin.messaging().sendToDevice(tokens, { notification: { title, body, icon: iconUrl }, data: { click_action: targetUrl }});

  return { success: true, message: "Notification (simulated) sent successfully. Check console for details." };
}
