
"use server";

import { revalidatePath } from "next/cache";
import { getOrderById } from '@/lib/order-service';
import { addFeedback } from '@/lib/feedback-service'; // Import the new service
import type { Feedback } from '@/types'; // Import the new type

export async function submitFeedbackAction(orderId: string, rating: number, feedbackText: string): Promise<{ success: boolean; error?: string }> {
  try {
    const order = await getOrderById(orderId);
    if (!order) {
      return { success: false, error: "Order not found." };
    }
    
    // The data structure for the new feedback entry
    const newFeedbackData: Omit<Feedback, 'id'> = {
      orderId: order.id,
      companyName: order.companyName,
      rating: rating,
      text: feedbackText,
      submittedAt: new Date().toISOString(),
    };

    // Use the new service to add the feedback to its own collection
    const success = await addFeedback(newFeedbackData);

    if (!success) {
      return { success: false, error: "Failed to save feedback to the database." };
    }

    revalidatePath(`/feedback/${orderId}`);
    // Optionally, you might still want to revalidate the tracking page if it displays a "feedback submitted" state
    revalidatePath(`/track/${orderId}`);
    return { success: true };

  } catch (error) {
    console.error("Error submitting feedback:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}
