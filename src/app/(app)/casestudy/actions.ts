
"use server";

import type { CaseStudyMessage, User, UserRole } from "@/types";
import { getMessages, addMessage, deleteMessage } from "@/lib/case-study-service";
import { revalidatePath } from "next/cache";
import { adminApp } from '@/lib/firebase-admin';
import { getUsers } from '@/lib/user-service';
import type { messaging } from 'firebase-admin';
import { getGlobalSettings } from '@/lib/settings-service';

export async function getMessagesAction(team: 'CR' | 'DR' | 'LR'): Promise<CaseStudyMessage[]> {
  return getMessages(team);
}

export async function addMessageAction(
  team: 'CR' | 'DR' | 'LR',
  message: string,
  replyingTo: { name: string; message: string } | null,
  currentUser: User
): Promise<{ success: boolean; message?: CaseStudyMessage; error?: string }> {
  if (!message.trim()) {
    return { success: false, error: "Message cannot be empty." };
  }

  try {
    const messageData: Omit<CaseStudyMessage, 'id' | 'timestamp'> = {
      team,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatarUrl: currentUser.avatarUrl,
      message,
      replyingTo,
    };
    const newMessage = await addMessage(team, messageData);
    if (newMessage) {
      revalidatePath("/(app)/layout", "layout");

      // Send push notifications to other team members
      try {
        const allUsers = await getUsers();
        const teamMembers = allUsers.filter(u => u.role === team && u.id !== currentUser.id && u.fcmToken);

        if (teamMembers.length > 0) {
            console.log(`[CaseStudy] Sending notifications to ${teamMembers.length} members of ${team} team.`);
            const globalSettings = await getGlobalSettings();
            const customSoundUrl = globalSettings.toastSoundUrl;
            
            const notificationTitle = `New Message in ${team} Case Study`;
            const notificationBody = `${currentUser.name}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`;
            const targetUrl = '/'; // Or a more specific link if available

            for (const member of teamMembers) {
                 const fcmMessage: messaging.Message = {
                    token: member.fcmToken!,
                    notification: { title: notificationTitle, body: notificationBody },
                    data: { title: notificationTitle, body: notificationBody, targetUrl, click_action: targetUrl, ...(customSoundUrl && { customSoundUrl }) },
                    webpush: { notification: { icon: '/icons/icon-192x192.png', ...(customSoundUrl ? {} : { sound: "default" }) }, fcmOptions: { link: targetUrl } },
                 };
                 if (adminApp && typeof adminApp.messaging === 'function') {
                    await adminApp.messaging().send(fcmMessage);
                 }
            }
        }
      } catch (notifError) {
          console.error('[CaseStudy] Failed to send push notifications:', notifError);
          // Do not fail the whole action, just log the error.
      }


      return { success: true, message: newMessage };
    }
    return { success: false, error: "Failed to save message." };
  } catch (error) {
    console.error("Error in addMessageAction:", error);
    return { success: false, error: "An unexpected server error occurred." };
  }
}

export async function deleteMessageAction(
  team: 'CR' | 'DR' | 'LR',
  messageId: string,
): Promise<{ success: boolean; error?: string }> {
    try {
        const success = await deleteMessage(team, messageId);
        if (success) {
            revalidatePath("/(app)/layout", "layout");
            return { success: true };
        }
        return { success: false, error: "Failed to delete message from the database." };
    } catch (error) {
        console.error("Error in deleteMessageAction:", error);
        return { success: false, error: "An unexpected error occurred while deleting the message." };
    }
}
