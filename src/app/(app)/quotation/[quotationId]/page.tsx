
import { Suspense } from 'react';
import { getQuotationById } from '@/lib/quotation-service';
import { getStatuses } from '@/lib/status-service';
import { getUsers } from '@/lib/user-service';
import { notFound } from 'next/navigation';
import { QuotationDetailsClient } from './QuotationDetailsClient';
import { Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

interface QuotationPageProps {
  params: Promise<{ quotationId: string }>;
}

export default async function QuotationPage({ params }: QuotationPageProps) {
  const { quotationId } = await params;

  const [quotationDataResult, allStatusesResult, allUsersResult] = await Promise.all([
    getQuotationById(quotationId),
    getStatuses(),
    getUsers()
  ]);

  if (!quotationDataResult) {
    notFound();
  }

  // Ensure data is plain before passing to Client Component
  const plainQuotationData = JSON.parse(JSON.stringify(quotationDataResult));
  const plainAllStatuses = JSON.parse(JSON.stringify(allStatusesResult));
  const plainAllUsers = JSON.parse(JSON.stringify(allUsersResult));

  return (
    <div className="min-h-screen bg-background py-6 sm:py-10 px-4 sm:px-6 lg:px-8 selection:bg-primary/20 selection:text-primary print:p-0 print:m-0 print:bg-white">


      <Suspense fallback={<QuotationPageSkeleton />}>
        <QuotationDetailsClient
          quotation={plainQuotationData}
          allStatuses={plainAllStatuses}
          allUsers={plainAllUsers}
        />
      </Suspense>

      <footer className="text-center mt-16 sm:mt-20 py-8 sm:py-10 border-t border-border/30 print:hidden">
        <p className="text-sm sm:text-md text-muted-foreground">&copy; {new Date().getFullYear()} <span className="font-bold">Color Hut</span>. All rights reserved.</p>
        <p className="text-xs sm:text-sm text-muted-foreground/70 mt-1 sm:mt-1.5">Precision Quotation Management, Simplified.</p>
      </footer>
    </div>
  );
}

function QuotationPageSkeleton() {
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
