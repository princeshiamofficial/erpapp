
"use server";

import type { CaseStudyMessage, User } from "@/types";
import { getMessages, addMessage, deleteMessage } from "@/lib/case-study-service";
import { revalidatePath } from "next/cache";

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
      // Revalidating the layout might be too broad, but ensures all clients get updates.
      // A more targeted revalidation might be better if possible.
      revalidatePath("/(app)/layout", "layout");
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
