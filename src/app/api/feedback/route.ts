
import { NextResponse } from 'next/server';
import { submitFeedbackAction } from '@/app/feedback/[orderId]/actions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, rating, feedbackText } = body;

    if (!orderId || rating === undefined || !feedbackText) {
      return NextResponse.json({ success: false, error: 'Missing required feedback data.' }, { status: 400 });
    }

    const result = await submitFeedbackAction(orderId, rating, feedbackText);

    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Feedback Route] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ success: false, error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}

    