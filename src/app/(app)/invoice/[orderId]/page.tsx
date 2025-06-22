import { Suspense } from 'react';
import { getOrderById } from '@/lib/order-service';
import { getStatuses } from '@/lib/status-service';
import { getUsers } from '@/lib/user-service';
import { notFound } from 'next/navigation';
import { InvoiceDetailsClient } from './InvoiceDetailsClient'; // New component
import { Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

interface InvoicePageProps {
  params: { orderId: string };
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const orderId = params.orderId;

  const [orderDataResult, allStatusesResult, allUsersResult] = await Promise.all([
    getOrderById(orderId),
    getStatuses(),
    getUsers()
  ]);

  if (!orderDataResult) {
    notFound();
  }

  // Ensure data is plain before passing to Client Component
  const plainOrderData = JSON.parse(JSON.stringify(orderDataResult));
  const plainAllStatuses = JSON.parse(JSON.stringify(allStatusesResult));
  const plainAllUsers = JSON.parse(JSON.stringify(allUsersResult));

  return (
    <div className="min-h-screen bg-background py-6 sm:py-10 px-4 sm:px-6 lg:px-8 selection:bg-primary/20 selection:text-primary print:p-0 print:m-0 print:bg-white">
       <header className="text-center mb-8 sm:mb-12 bg-black print:hidden">
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

      <Suspense fallback={<InvoicePageSkeleton />}>
        <InvoiceDetailsClient
            order={plainOrderData}
            allStatuses={plainAllStatuses}
            allUsers={plainAllUsers}
        />
      </Suspense>

      <footer className="text-center mt-16 sm:mt-20 py-8 sm:py-10 border-t border-border/30 print:hidden">
        <p className="text-sm sm:text-md text-muted-foreground">&copy; {new Date().getFullYear()} <span className="font-bold">Color Hut</span>. All rights reserved.</p>
        <p className="text-xs sm:text-sm text-muted-foreground/70 mt-1 sm:mt-1.5">Precision Order Tracking, Simplified.</p>
      </footer>
    </div>
  );
}

function InvoicePageSkeleton() {
    return (
      <div className="max-w-4xl mx-auto space-y-8 sm:space-y-10 animate-pulse">
        <div className="shadow-2xl overflow-hidden border-border/40 bg-card rounded-xl p-6 sm:p-8">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <Skeleton className="h-10 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-4 w-72 mt-1" />
                </div>
                <div className="text-right">
                    <Skeleton className="h-6 w-32 mb-1" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-12 w-32 mt-2" />
                </div>
            </div>
            <Skeleton className="h-px w-full my-6" />
            <div className="grid grid-cols-2 gap-6 mb-8">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-40 w-full" />
            <div className="flex justify-end mt-8">
                <div className="w-full max-w-sm space-y-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-8 w-full mt-2" />
                </div>
            </div>
        </div>
      </div>
    );
  }
