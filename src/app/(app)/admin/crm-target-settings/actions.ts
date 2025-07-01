
"use server";

import { revalidatePath } from "next/cache";
import {
  setCrmCompletionStatusIds,
  setCommentsVisibility,
  setRolesAllowedToEditOrders,
  setRolesAllowedToDeleteOrders, // New
  setToastSoundUrl,
  setLeaderboardBackgroundImageUrl,
  setExpenseLoggingPermissions, 
  setProjectStageAccess, 
} from "@/lib/settings-service";
import type { UserRole, User, ExpenseLoggingPermissions, ProjectStatusType } from "@/types"; 
import { adminApp } from '@/lib/firebase-admin';
import { getUsers as getAllUsersFromDb, getUserById } from '@/lib/user-service';
import type { FirebaseError } from 'firebase-admin';
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

export async function updateRolesAllowedToDeleteOrdersAction(roles: UserRole[]): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await setRolesAllowedToDeleteOrders(roles);
    if (success) {
      revalidatePath("/(app)/admin/crm-target-settings");
      revalidatePath("/(app)/orders"); // Revalidate orders page as permissions changed
      return { success: true };
    }
    return { success: false, error: "Failed to update order deletion permissions in database." };
  } catch (error) {
    console.error("Error in updateRolesAllowedToDeleteOrdersAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}


export async function updateToastSoundUrlAction(soundUrl: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    if (soundUrl && !soundUrl.startsWith('http://') && !soundUrl.startsWith('https://') && !soundUrl.startsWith('/')) {
      // return { success: false, error: "Invalid sound URL format. Must be a valid URL or a relative path starting with '/'." };
    }
    const success = await setToastSoundUrl(soundUrl);
    if (success) {
      revalidatePath("/(app)/admin/crm-target-settings");
      return { success: true };
    }
    return { success: false, error: "Failed to update toast sound URL in database." };
  } catch (error) {
    console.error("Error in updateToastSoundUrlAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateLeaderboardBackgroundImageUrlAction(imageUrl: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('/')) {
      // return { success: false, error: "Invalid image URL format. Must be a valid URL or a relative path." };
    }
    const success = await setLeaderboardBackgroundImageUrl(imageUrl);
    if (success) {
      revalidatePath("/(app)/admin/crm-target-settings");
      revalidatePath("/(app)/leaderboard"); 
      return { success: true };
    }
    return { success: false, error: "Failed to update leaderboard background image URL in database." };
  } catch (error) {
    console.error("Error in updateLeaderboardBackgroundImageUrlAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateExpenseLoggingPermissionsAction(permissions: ExpenseLoggingPermissions): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate permissions structure
    if (!permissions || !permissions.mode) {
        return { success: false, error: "Invalid permission structure provided." };
    }
    if (permissions.mode === 'specificRoles' && (!Array.isArray(permissions.allowedRoles) || permissions.allowedRoles.some(r => !['ADMIN','CRM','DESIGNER_REPRESENTATIVE', 'VENDOR', 'LR'].includes(r)))) {
        return { success: false, error: "Invalid roles specified for expense logging." };
    }
    if (permissions.mode === 'specificUsers' && !Array.isArray(permissions.allowedUserIds)) {
        return { success: false, error: "Allowed user IDs must be an array for expense logging." };
    }

    const success = await setExpenseLoggingPermissions(permissions);
    if (success) {
      revalidatePath("/(app)/admin/crm-target-settings");
      revalidatePath("/(app)/finance-manager"); 
      return { success: true };
    }
    return { success: false, error: "Failed to update expense logging permissions in database." };
  } catch (error) {
    console.error("Error in updateExpenseLoggingPermissionsAction:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
}

export async function updateProjectStageAccessAction(
  permissions: Record<ProjectStatusType, UserRole[]>
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await setProjectStageAccess(permissions);
    if (success) {
      revalidatePath("/(app)/admin/crm-target-settings");
      revalidatePath("/(app)/projects");
      return { success: true };
    }
    return { success: false, error: "Failed to update project stage access permissions in database." };
  } catch (error) {
    console.error("Error in updateProjectStageAccessAction:", error);
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

  const { title: rawTitle, body: rawBody, iconUrl, targetUrl, soundUrl, targetType, targetRoles, targetUserIds } = payload;

  if (!rawTitle || !rawBody) {
    return { success: false, message: "Title and body are required for the notification.", error: "Missing title or body."};
  }

  let targetUsersData: Array<{ id: string; name: string; role: UserRole; fcmToken: string | null }> = [];
  let targetDescription = "";

  try {
    const allUsersFromDb = await getAllUsersFromDb();

    if (targetType === 'users' && targetUserIds && targetUserIds.length > 0) {
      targetDescription = `specific users (${targetUserIds.length})`;
      for (const userId of targetUserIds) {
        const user = allUsersFromDb.find(u => u.id === userId);
        if (user && user.fcmToken) {
          targetUsersData.push({ id: user.id, name: user.name, role: user.role, fcmToken: user.fcmToken });
        }
      }
    } else if (targetType === 'roles' && targetRoles && targetRoles.length > 0) {
      targetDescription = `users with roles: ${targetRoles.join(', ')}`;
      targetUsersData = allUsersFromDb
        .filter(u => u.fcmToken && targetRoles.includes(u.role))
        .map(u => ({ id: u.id, name: u.name, role: u.role, fcmToken: u.fcmToken }));
    } else if (targetType === 'all') {
      targetDescription = "all users (excluding sender)";
      targetUsersData = allUsersFromDb
        .filter(u => u.fcmToken && u.id !== actingUser.id) // Exclude the sender
        .map(u => ({ id: u.id, name: u.name, role: u.role, fcmToken: u.fcmToken }));
    } else {
      return { success: false, message: "Invalid targeting information provided.", error: "Invalid target."};
    }

    if (targetUsersData.length === 0) {
      return { success: false, message: `No users with FCM tokens found for the selected target: ${targetDescription}.`, error: "No recipients found." };
    }

    let successfulSends = 0;
    let failedSends = 0;
    const errors: string[] = [];

    console.log(`[sendPushNotificationAction] Preparing to send REAL push notifications to ${targetUsersData.length} user(s) for target: ${targetDescription}`);

    for (const user of targetUsersData) {
      if (!user.fcmToken) {
        failedSends++;
        errors.push(`User ${user.name} (${user.id}) has no FCM token.`);
        continue;
      }

      const personalizedTitle = rawTitle.replace(/%name%/g, user.name).replace(/%role%/g, user.role);
      const personalizedBody = rawBody.replace(/%name%/g, user.name).replace(/%role%/g, user.role);

      const fcmMessage: messaging.Message = {
        token: user.fcmToken,
        notification: { 
          title: personalizedTitle,
          body: personalizedBody,
          ...(iconUrl && { imageUrl: iconUrl })
        },
        data: { 
          title: personalizedTitle, 
          body: personalizedBody,
          ...(iconUrl && { icon: iconUrl, iconUrl: iconUrl }),
          ...(targetUrl && { click_action: targetUrl, targetUrl: targetUrl }),
          ...(soundUrl && { customSoundUrl: soundUrl }) 
        },
        webpush: { 
          notification: {
            icon: iconUrl || '/icons/icon-192x192.png', 
            ...(soundUrl ? {} : { sound: "default" }) 
          },
          fcmOptions: {
            link: targetUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://colorhut-57f5a.web.app') 
          }
        },
      };

      try {
        // @ts-ignore admin.messaging might be an issue with the type if not fully initialized, but should work if adminApp is valid
        await adminApp.messaging().send(fcmMessage);
        successfulSends++;
        console.log(`[sendPushNotificationAction] Successfully sent notification to ${user.name} (${user.id}) with token ${user.fcmToken}. Message:`, JSON.stringify(fcmMessage));
      } catch (error) {
        failedSends++;
        const firebaseError = error as FirebaseError;
        const errorMessage = firebaseError.message || "Unknown error";
        console.error(`[sendPushNotificationAction] Failed to send to ${user.name} (${user.id}) with token ${user.fcmToken}: ${errorMessage} (Code: ${firebaseError.code}). Message attempted:`, JSON.stringify(fcmMessage));
        errors.push(`Failed for ${user.name}: ${errorMessage}`);
      }
    }

    let messageSummary = `Sent to ${successfulSends} device(s). `;
    if (failedSends > 0) {
      messageSummary += `${failedSends} failed.`;
      if (errors.length > 0) {
          messageSummary += ` Errors: ${errors.slice(0,3).join(', ')}${errors.length > 3 ? '...' : ''}`;
      }
    }
    messageSummary += ` (Target: ${targetDescription})`;

    if(targetType === 'all' && successfulSends > 20) {
        messageSummary += " Note: Sending to 'All Users' can be resource-intensive for large user bases. Consider topic messaging for broader reach."
    }


    return {
      success: successfulSends > 0,
      message: messageSummary,
      ...(failedSends > 0 && { error: `Some notifications failed to send. ${errors.join('; ')}` })
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
