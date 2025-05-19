
"use server";

import { revalidatePath } from "next/cache";
import type { Comment, TrackingLink, User, UserRole } from "@/types";
import { addCommentToOrder, addReplyToComment, toggleReaction } from "@/lib/order-service"; // Use new Firestore service

// For top-level comments from the main form (typically by client or general update)
export async function submitCommentAction(
  orderId: string,
  commentData: {
    userName: string; // e.g., "CompanyName (Client)"
    text: string;
    isInternal: boolean;
    userId?: string; // Optional, if a registered user uses the main form
    userRole?: UserRole | 'Client';
  }
): Promise<TrackingLink | { error: string }> {
  if (!commentData.text.trim()) {
    return { error: "Comment text cannot be empty." };
  }

  try {
    const payloadForService: Omit<Comment, 'id' | 'timestamp' | 'replies' | 'likes'> = {
      userName: commentData.userName,
      userRole: commentData.userRole || 'Client', 
      text: commentData.text,
      isInternal: commentData.isInternal,
    };
    if (commentData.userId) {
      payloadForService.userId = commentData.userId;
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

// For replies submitted by registered users or clients
export async function submitClientReplyAction(
  orderId: string,
  parentCommentId: string,
  replyText: string,
  // clientName is removed as userName will be "Client" for this action
  // isInternal is always false for client replies
  actingUser?: User | null // Optional User object if logged in user is replying
): Promise<TrackingLink | { error: string }> {
  if (!replyText.trim()) {
    return { error: "Reply text cannot be empty." };
  }

  try {
    const replyDataForService: Omit<Comment, 'id' | 'timestamp' | 'replies' | 'likes'> = {
      userName: actingUser ? actingUser.name : "Client",
      userRole: actingUser ? actingUser.role : 'Client',
      text: replyText,
      isInternal: false, // Client replies are never internal
      ...(actingUser && { userId: actingUser.id }),
    };

    const updatedOrder = await addReplyToComment(orderId, parentCommentId, replyDataForService);

    if (!updatedOrder) {
      return { error: "Failed to add reply to comment." };
    }

    revalidatePath(`/track/${orderId}`); 
    return updatedOrder;
  } catch (error) {
    console.error("Error in submitClientReplyAction:", error);
    return { error: error instanceof Error ? error.message : "Failed to submit reply." };
  }
}


export async function toggleOrderCommentReactionAction(
  orderId: string,
  targetCommentId: string,
  isReply: boolean,
  parentCommentIdIfReply: string | undefined,
  reactorId: string, // This will be currentUser.id or a client-generated ID
  reactionType: 'like' // For now, only 'like'
): Promise<TrackingLink | { error: string }> {
  if (!reactorId) {
    return { error: "Reactor ID is missing." };
  }
  if (!reactionType) {
    return { error: "Reaction type is missing." };
  }

  try {
    const updatedOrder = await toggleReaction(
      orderId,
      targetCommentId,
      isReply,
      parentCommentIdIfReply,
      reactorId,
      reactionType
    );

    if (!updatedOrder) {
      return { error: "Failed to toggle reaction on comment/reply." };
    }

    revalidatePath(`/track/${orderId}`);
    return updatedOrder;
  } catch (error) {
    console.error("Error in toggleOrderCommentReactionAction:", error);
    return { error: error instanceof Error ? error.message : "Failed to toggle reaction." };
  }
}
