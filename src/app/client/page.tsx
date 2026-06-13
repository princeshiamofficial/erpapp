import { Suspense } from 'react';
import { getOrderById } from '@/lib/order-service';
import { getStatuses } from '@/lib/status-service';
import { getGlobalSettings } from '@/lib/settings-service';
import { getUsers } from '@/lib/user-service';
import { notFound } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from 'lucide-react';
import { OrderDetailsLoader } from '@/app/track/[trackingId]/OrderDetailsLoader';
import { cookies } from 'next/headers';
import type { User } from '@/types';
import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

interface ClientPageProps {
  searchParams: Promise<{ id?: string }>;
}

export async function generateMetadata({ searchParams }: ClientPageProps): Promise<Metadata> {
  const { id } = await searchParams;
  if (!id) {
    return {
      title: 'Order Not Found',
    };
  }
  const order = await getOrderById(id);

  if (!order) {
    return {
      title: 'Order Not Found',
    };
  }

  const companyNameParts = order.companyName.split('•').map((part: string) => part.trim());
  const businessName = companyNameParts.length > 1 ? companyNameParts[companyNameParts.length - 1] : order.companyName;

  return {
    title: `${businessName} | Color Hut`,
  };
}

function TrackingPageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 sm:space-y-10 animate-pulse">
      <div className="shadow-2xl overflow-hidden border border-border/40 bg-card rounded-xl">
        <div className="bg-card p-6 sm:p-8 border-b border-border/40">
          <div className="flex flex-col items-start space-y-3">
            {/* Logo skeleton */}
            <div className="h-6 w-24 bg-muted/60 rounded-lg border border-border/30" />
            {/* Title skeleton */}
            <Skeleton className="h-6 w-36 sm:h-7 sm:w-44" />
          </div>
        </div>
        <div className="p-6 sm:p-8 space-y-6">
          {/* Checklist item 1 */}
          <div className="flex items-start gap-3.5">
            <div className="h-5 w-5 bg-muted/50 rounded border border-border/30 mt-1 flex-shrink-0 animate-pulse" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          {/* Checklist item 2 */}
          <div className="flex items-start gap-3.5">
            <div className="h-5 w-5 bg-muted/50 rounded border border-border/30 mt-1 flex-shrink-0 animate-pulse" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          {/* Checklist item 3 */}
          <div className="flex items-start gap-3.5">
            <div className="h-5 w-5 bg-muted/50 rounded border border-border/30 mt-1 flex-shrink-0 animate-pulse" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>

          {/* Button skeleton */}
          <div className="pt-4 border-t border-border/30 flex justify-end">
            <Skeleton className="h-10 w-28 sm:w-32 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function ClientPage({ searchParams }: ClientPageProps) {
  const { id } = await searchParams;

  if (!id) {
    notFound();
  }

  const [orderDataResult, allStatusesResult, globalSettingsResult, allUsersResult] = await Promise.all([
    getOrderById(id),
    getStatuses(),
    getGlobalSettings(),
    getUsers()
  ]);

  if (!orderDataResult) {
    notFound();
  }

  const cookieStore = await cookies();
  const userCookie = cookieStore.get('colorhut-user');
  let currentUser: User | null = null;
  if (userCookie) {
    try {
      currentUser = JSON.parse(userCookie.value);
    } catch (e) {
      console.error("Failed to parse user cookie", e);
    }
  }

  const plainOrderData = JSON.parse(JSON.stringify(orderDataResult));
  const plainAllStatuses = JSON.parse(JSON.stringify(allStatusesResult));
  const plainGlobalSettings = JSON.parse(JSON.stringify(globalSettingsResult));
  const plainAllUsers = JSON.parse(JSON.stringify(allUsersResult));

  const areCommentsVisible = plainGlobalSettings.areCommentsVisibleOnPublicPage ?? true;

  return (
    <div className="min-h-screen bg-background pt-6 sm:pt-10 pb-6 sm:pb-10 px-4 sm:px-6 lg:px-8 selection:bg-primary/20 selection:text-primary print:p-0 print:m-0 print:bg-white">
      <Suspense fallback={<TrackingPageSkeleton />}>
        <OrderDetailsLoader
          order={plainOrderData}
          allStatuses={plainAllStatuses}
          allUsersForMentions={plainAllUsers}
          areCommentsVisible={areCommentsVisible}
          rolesAllowedToViewFinancials={plainGlobalSettings.rolesAllowedToViewFinancials ?? []}
          currentUser={currentUser}
          hideStatusHeader={true}
        />
      </Suspense>

    </div>
  );
}
