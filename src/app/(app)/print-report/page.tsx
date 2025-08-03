
import React, { Suspense } from 'react';
import { getOrdersForReport } from '@/lib/report-service';
import { getUsers } from '@/lib/user-service';
import { getStatuses } from '@/lib/status-service';
import { PrintReportClient } from './PrintReportClient';
import { Skeleton } from '@/components/ui/skeleton';
import { cookies } from 'next/headers';
import type { User } from '@/types';

function PrintReportPageSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-80 mt-2" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="border rounded-lg">
        <div className="p-5 border-b">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <div className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {[...Array(6)].map((_, i) => (
                    <th key={i} className="h-12 px-4 text-left"><Skeleton className="h-5 w-24" /></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-6 w-28 rounded-full" /></td>
                    <td className="p-4"><div className="flex items-center gap-2"><Skeleton className="h-6 w-6 rounded-full" /><Skeleton className="h-5 w-32" /></div></td>
                    <td className="p-4"><div className="flex items-center gap-2"><Skeleton className="h-6 w-6 rounded-full" /><Skeleton className="h-5 w-32" /></div></td>
                    <td className="p-4 text-right"><Skeleton className="h-9 w-20 inline-block rounded-md" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


async function PrintReportData() {
  const cookieStore = cookies();
  const userCookie = cookieStore.get('colorhut-user');
  let currentUser: User | null = null;
  if (userCookie) {
    try {
      currentUser = JSON.parse(userCookie.value);
    } catch (e) {
      console.error("Failed to parse user cookie on server for Print Report", e);
    }
  }

  const [initialOrders, initialUsers, initialStatuses] = await Promise.all([
    getOrdersForReport({ limit: 500, orderBy: 'createdAt', direction: 'desc' }),
    getUsers(),
    getStatuses()
  ]);

  return (
    <PrintReportClient
      initialOrders={initialOrders}
      initialUsers={initialUsers}
      initialStatuses={initialStatuses}
      serverCurrentUser={currentUser}
    />
  );
}


export default function PrintReportPage() {
  return (
    <Suspense fallback={<PrintReportPageSkeleton />}>
      <PrintReportData />
    </Suspense>
  );
}
