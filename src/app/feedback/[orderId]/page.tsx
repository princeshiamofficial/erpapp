
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

  const orderData = await getOrderById(orderId);

  if (!orderData) {
    notFound();
  }

  const plainOrderData = JSON.parse(JSON.stringify(orderData));

  return (
    <div className="min-h-screen bg-background py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <header className="text-center mb-8 sm:mb-12 print:hidden">
        <div className="inline-block mb-2">
            <Image
              src="https://i.ibb.co/FFQMvkz/logo-02-01.jpg"
              alt="Color Hut Logo"
              width={253}
              height={64}
              priority
              className="object-contain mx-auto"
            />
        </div>
      </header>
      <Suspense fallback={<FeedbackPageSkeleton />}>
        <FeedbackClient order={plainOrderData} />
      </Suspense>
    </div>
  );
}
