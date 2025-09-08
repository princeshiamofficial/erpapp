
"use server";

import { revalidatePath } from "next/cache";
import { getOrderById, updateOrder } from '@/lib/order-service';

interface Feedback {
    rating: number;
    text: string;
    submittedAt: string;
}

export async function submitFeedbackAction(orderId: string, rating: number, feedbackText: string): Promise<{ success: boolean; error?: string }> {
  try {
    const order = await getOrderById(orderId);
    if (!order) {
      return { success: false, error: "Order not found." };
    }
    
    const newFeedback: Feedback = {
      rating,
      text: feedbackText,
      submittedAt: new Date().toISOString(),
    };

    // In a real app, you would likely store this feedback in a separate collection
    // or as a subcollection of the order. For this example, we'll add it to a
    // hypothetical 'feedback' field on the order document.
    const updates = {
      feedback: newFeedback
    };

    const success = await updateOrder(orderId, updates);
    if (!success) {
      return { success: false, error: "Failed to save feedback to the database." };
    }

    revalidatePath(`/feedback/${orderId}`);
    return { success: true };

  } catch (error) {
    console.error("Error submitting feedback:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}
