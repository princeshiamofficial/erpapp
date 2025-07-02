
"use server";

import { revalidatePath } from "next/cache";
import type { Comment, TrackingLink, User, UserRole } from "@/types";
import { addCommentToOrder, addReplyToComment, toggleReaction } from "@/lib/order-service"; 

// For top-level comments from the main form (typically by client or general update)
export async function submitCommentAction(
  orderId: string,
  commentData: {
    userName: string; 
    text: string;
    isInternal: boolean;
    userId?: string; 
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

// For replies submitted by authenticated users
export async function submitReplyAction(
  orderId: string,
  parentCommentId: string,
  replyText: string,
  isInternal: boolean,
  actingUser: User 
): Promise<TrackingLink | { error: string }> {
  if (!replyText.trim()) {
    return { error: "Reply text cannot be empty." };
  }
  if (!actingUser || !actingUser.id || !actingUser.name || !actingUser.role) {
    return { error: "Authenticated user information is missing for reply."};
  }

  try {
    const replyDataForService: Omit<Comment, 'id' | 'timestamp' | 'replies' | 'likes'> = {
      userName: actingUser.name,
      userRole: actingUser.role,
      text: replyText,
      isInternal: isInternal,
      userId: actingUser.id,
    };

    const updatedOrder = await addReplyToComment(orderId, parentCommentId, replyDataForService);

    if (!updatedOrder) {
      return { error: "Failed to add reply to comment." };
    }

    revalidatePath(`/track/${orderId}`); 
    return updatedOrder;
  } catch (error) {
    console.error("Error in submitReplyAction (authenticated):", error);
    return { error: error instanceof Error ? error.message : "Failed to submit reply." };
  }
}


// For replies submitted by unauthenticated clients
export async function submitClientReplyAction(
  orderId: string,
  parentCommentId: string,
  replyText: string
  // clientName parameter can be added here if you want clients to provide a name
): Promise<TrackingLink | { error: string }> {
  if (!replyText.trim()) {
    return { error: "Reply text cannot be empty." };
  }

  try {
    const replyDataForService: Omit<Comment, 'id' | 'timestamp' | 'replies' | 'likes'> = {
      userName: "Client", // Or use clientName if you add an input for it
      userRole: 'Client',
      text: replyText,
      isInternal: false, 
    };

    const updatedOrder = await addReplyToComment(orderId, parentCommentId, replyDataForService);

    if (!updatedOrder) {
      return { error: "Failed to add client reply to comment." };
    }

    revalidatePath(`/track/${orderId}`); 
    return updatedOrder;
  } catch (error) {
    console.error("Error in submitClientReplyAction:", error);
    return { error: error instanceof Error ? error.message : "Failed to submit client reply." };
  }
}


export async function toggleOrderCommentReactionAction(
  orderId: string,
  targetCommentId: string,
  isReply: boolean,
  parentCommentIdIfReply: string | undefined,
  reactorId: string, 
  reactionType: 'like' 
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

export async function getPackzyDeliveryStatusAction(trackingCode: string): Promise<{ delivery_status: string } | { error: string }> {
  if (!trackingCode) {
    return { error: 'Tracking code is required.' };
  }

  const apiKey = 'vfei2q49dhy1rxqxjs6xntkkvc2odeax';
  const secretKey = 'n4wr4fhdohq0x3gmm8xg3pp1';

  try {
    const response = await fetch(`https://portal.packzy.com/api/v1/status_by_trackingcode/${trackingCode}`, {
      method: 'GET',
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Ensure we always get the latest status
    });

    const data = await response.json();

    if (data.status !== 200) {
      console.error('Packzy API Error:', data);
      return { error: data.message || 'Failed to fetch delivery status from Packzy.' };
    }

    return { delivery_status: data.delivery_status };
  } catch (error) {
    console.error('Error calling Packzy API:', error);
    return { error: 'An unexpected error occurred while fetching delivery status.' };
  }
}
