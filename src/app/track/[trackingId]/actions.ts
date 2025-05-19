
"use server";

import { revalidatePath } from "next/cache";
import type { Comment, TrackingLink, User, UserRole } from "@/types";
import { addCommentToOrder, addReplyToComment } from "@/lib/order-service"; // Use new Firestore service

// For top-level comments from the main form (typically by client or general update)
export async function submitCommentAction(
  orderId: string,
  commentData: {
    userName: string; // e.g., "CompanyName (Client)"
    text: string;
    isInternal: boolean;
    userId?: string; // Optional, if a registered user uses the main form
  }
): Promise<TrackingLink | { error: string }> {
  if (!commentData.text.trim()) {
    return { error: "Comment text cannot be empty." };
  }

  try {
    const payloadForService: Omit<Comment, 'id' | 'timestamp' | 'replies'> = {
      userName: commentData.userName,
      userRole: commentData.userId ? undefined : 'Client', // If userId, role might be set differently or omitted to infer
      text: commentData.text,
      isInternal: commentData.isInternal,
    };
    if (commentData.userId) {
      payloadForService.userId = commentData.userId;
      // Potentially fetch user role here if needed for top-level comments by registered users
    }


    const updatedOrder = await addCommentToOrder(orderId, payloadForService);

    if (!updatedOrder) {
      return { error: "Failed to add comment to order." };
    }

    revalidatePath(`/track/${orderId}`);
    return updatedOrder;
  } catch (error) {
    console.error("Error in submitCommentAction:", error);
    return { error: error instanceof Error ? error.message : "Failed to submit comment." };
  }
}

// For replies submitted by registered users
export async function submitReplyAction(
  orderId: string,
  parentCommentId: string,
  replyText: string,
  isInternal: boolean, // Assuming replies can also be internal
  currentUser: User // The currently logged-in user making the reply
): Promise<TrackingLink | { error: string }> {
  if (!replyText.trim()) {
    return { error: "Reply text cannot be empty." };
  }
  if (!currentUser || !currentUser.id || !currentUser.name || !currentUser.role) {
    return { error: "User information is missing to submit a reply." };
  }

  try {
    const replyDataForService: Omit<Comment, 'id' | 'timestamp' | 'replies'> = {
      userName: currentUser.name,
      userRole: currentUser.role,
      userId: currentUser.id,
      text: replyText,
      isInternal: isInternal,
    };

    const updatedOrder = await addReplyToComment(orderId, parentCommentId, replyDataForService);

    if (!updatedOrder) {
      return { error: "Failed to add reply to comment." };
    }

    revalidatePath(`/track/${orderId}`); // Revalidate the page to show the new reply
    return updatedOrder;
  } catch (error) {
    console.error("Error in submitReplyAction:", error);
    return { error: error instanceof Error ? error.message : "Failed to submit reply." };
  }
}
