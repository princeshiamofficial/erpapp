
"use server";

import { revalidatePath } from "next/cache";
import type { Comment, TrackingLink } from "@/types";
import { addCommentToOrder } from "@/lib/order-service"; // Use new Firestore service

export async function submitCommentAction(
  orderId: string,
  commentData: {
    userName: string;
    text: string;
    isInternal: boolean;
    userId?: string;
  }
): Promise<TrackingLink | { error: string }> {
  if (!commentData.text.trim()) {
    return { error: "Comment text cannot be empty." };
  }

  try {
    const newComment: Omit<Comment, 'id' | 'timestamp'> = {
      userName: commentData.userName,
      text: commentData.text,
      isInternal: commentData.isInternal,
      userId: commentData.userId,
    };

    const updatedOrder = await addCommentToOrder(orderId, newComment);
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
