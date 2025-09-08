import { Suspense } from 'react';
import { getOrderById } from '@/lib/order-service';
import { notFound } from 'next/navigation';
import { FeedbackClient } from './FeedbackClient';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

interface FeedbackPageProps {
  params: { orderId: string };
}

function FeedbackPageSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-pulse">
      <div className="shadow-lg overflow-hidden border-border/40 bg-card rounded-xl p-6 sm:p-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-12 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

export default async function FeedbackPage({ params }: FeedbackPageProps) {
  const orderId = params.orderId;

  if (!orderId) {
    notFound();
  }

  // The feedback page is now public, so we don't need to check for isPublic status
  const orderData = await getOrderById(orderId);

  if (!orderData) {
    notFound();
  }

  const plainOrderData = JSON.parse(JSON.stringify(orderData));

  return (
    // This component now uses a standalone HTML structure to match the reference
    <FeedbackClient order={plainOrderData} />
  );
}
