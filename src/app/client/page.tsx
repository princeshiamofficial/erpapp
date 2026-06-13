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
  width: 1024,
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
