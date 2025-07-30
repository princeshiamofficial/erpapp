
import { Suspense } from 'react';
import { OrderDetailsClient } from './OrderDetailsClient';
import { getOrderById, incrementOrderViewCount } from '@/lib/order-service';
import { getStatuses } from '@/lib/status-service';
import { getGlobalSettings } from '@/lib/settings-service';
import { getUsers } from '@/lib/user-service';
import { notFound } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from 'lucide-react';

interface PublicTrackingPageProps {
  params: { trackingId: string };
}

export default async function PublicTrackingPage({ params }: PublicTrackingPageProps) {
  const trackingId = params.trackingId;

  if (trackingId) {
    await incrementOrderViewCount(trackingId);
  }

  const [orderDataResult, allStatusesResult, globalSettingsResult, allUsersResult] = await Promise.all([
    getOrderById(trackingId),
    getStatuses(),
    getGlobalSettings(),
    getUsers()
  ]);

  if (!orderDataResult) {
    notFound();
  }

  // Ensure data is plain before passing to Client Component
  // This helps avoid issues with Next.js's handling of props derived from server-side dynamic APIs.
  const plainOrderData = JSON.parse(JSON.stringify(orderDataResult));
  const plainAllStatuses = JSON.parse(JSON.stringify(allStatusesResult));
  const plainGlobalSettings = JSON.parse(JSON.stringify(globalSettingsResult));
  const plainAllUsers = JSON.parse(JSON.stringify(allUsersResult));

  const areCommentsVisible = plainGlobalSettings.areCommentsVisibleOnPublicPage ?? true;

  return (
    <div className="min-h-screen bg-background py-6 sm:py-10 px-4 sm:px-6 lg:px-8 selection:bg-primary/20 selection:text-primary print:p-0 print:m-0 print:bg-white">
      <Suspense fallback={<TrackingPageSkeleton />}>
        <OrderDetailsClient
            order={plainOrderData}
            allStatuses={plainAllStatuses}
            allUsersForMentions={plainAllUsers}
            areCommentsVisible={areCommentsVisible}
        />
      </Suspense>

      <footer className="text-center mt-16 sm:mt-20 py-8 sm:py-10 border-t border-border/30 print:hidden">
        <p className="text-sm sm:text-md text-muted-foreground">&copy; {new Date().getFullYear()} <span className="font-bold">Color Hut</span>. All rights reserved.</p>
        <p className="text-xs sm:text-sm text-muted-foreground/70 mt-1 sm:mt-1.5">Precision Order Tracking, Simplified.</p>
      </footer>
    </div>
  );
}

function TrackingPageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 sm:space-y-10 animate-pulse">
      <div className="shadow-2xl overflow-hidden border-border/40 bg-card rounded-xl">
        <div className="bg-card p-6 sm:p-8 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6">
            <div className="h-16 w-16 sm:h-20 sm:w-20 bg-primary/10 rounded-lg border border-primary/20 flex items-center justify-center mb-4 sm:mb-0 flex-shrink-0">
                <Package className="h-8 w-8 sm:h-10 sm:w-10 text-primary opacity-50" />
            </div>
            <div>
              <Skeleton className="h-8 w-72 mb-2 sm:h-10" />
              <Skeleton className="h-5 w-48 sm:h-6" />
            </div>
          </div>
        </div>
        <div className="p-6 sm:p-8 space-y-8">
          <div>
            <Skeleton className="h-7 w-40 mb-2" />
            <Skeleton className="h-10 w-56 mb-1" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-px w-full my-8 bg-border/30" />
          <div>
            <Skeleton className="h-6 w-32 mb-5" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-1.5 p-3 bg-secondary/30 rounded-lg border border-border/20">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          </div>
          <Skeleton className="h-px w-full my-8 bg-border/30" />
          <div>
            <Skeleton className="h-6 w-40 mb-6" />
            <div className="space-y-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="space-y-2 p-4 bg-muted/50 rounded-lg border border-border/40">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
       <div className="shadow-xl border border-border/40 bg-card rounded-xl">
        <div className="bg-card p-6 sm:p-8 border-b border-border/40">
          <Skeleton className="h-8 w-60 mb-1" />
          <Skeleton className="h-5 w-80" />
        </div>
        <div className="p-6 sm:p-8 space-y-6">
           <Skeleton className="h-24 w-full rounded-lg" />
           <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
