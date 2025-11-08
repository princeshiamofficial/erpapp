
import { Suspense } from 'react';
import { getOrderById } from '@/lib/order-service';
import { notFound } from 'next/navigation';
import { ApprovalClient } from './ApprovalClient';
import { Skeleton } from '@/components/ui/skeleton';

interface ApprovalPageProps {
  params: { orderId: string };
}

function ApprovalPageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-pulse p-4 sm:p-6 lg:p-8">
      <div className="shadow-lg overflow-hidden border bg-card rounded-xl">
        <div className="p-6 sm:p-8 border-b">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="p-6 sm:p-8 space-y-6">
          <Skeleton className="h-24 w-full rounded-md" />
          <Skeleton className="h-40 w-full rounded-md" />
          <div className="flex justify-end gap-4">
            <Skeleton className="h-11 w-32 rounded-md" />
            <Skeleton className="h-11 w-32 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}


export default async function ApprovalPage({ params }: ApprovalPageProps) {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 sm:py-10">
      <Suspense fallback={<ApprovalPageSkeleton />}>
        <ApprovalClient order={plainOrderData} />
      </Suspense>
    </div>
  );
}

