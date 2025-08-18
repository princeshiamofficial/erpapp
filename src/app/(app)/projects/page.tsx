import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectsKanbanClient } from '@/components/projects/ProjectsKanbanClient';

function ProjectsPageSkeleton() {
  const KANBAN_COLUMNS_CONFIG = [
    { title: 'CR Clearance', status: 'CR Clearance', headerBgClass: 'bg-sky-600' },
    { title: 'Cancel', status: 'Cancel', headerBgClass: 'bg-red-600' },
    { title: 'On Design', status: 'On Design', headerBgClass: 'bg-purple-600' },
    { title: 'On Hold', status: 'On Hold', headerBgClass: 'bg-yellow-500' },
    { title: 'Logistics', status: 'Logistics', headerBgClass: 'bg-orange-600' },
    { title: 'Courier', status: 'Courier', headerBgClass: 'bg-green-600' },
    { title: 'Delivered', status: 'Delivered', headerBgClass: 'bg-emerald-600' },
  ];
   return (
      <div className="flex flex-col h-full space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4 sm:px-0">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex space-x-4 min-w-max px-4 sm:px-0">
            {KANBAN_COLUMNS_CONFIG.map((col) => (
              <div key={col.status} className="flex-1 min-w-[280px] max-w-[320px] flex flex-col bg-muted/30 rounded-lg shadow-sm">
                <div className={`px-3 py-2.5 flex items-center justify-between ${col.headerBgClass} text-white rounded-t-lg`}>
                  <Skeleton className="h-5 w-32 bg-white/30" />
                  <Skeleton className="h-5 w-6 rounded-full bg-white/30" />
                </div>
                <div className="flex-1 p-3 space-y-3">
                  <Skeleton className="h-20 w-full rounded-md" />
                  <Skeleton className="h-20 w-full rounded-md" />
                  <Skeleton className="h-20 w-full rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
  );
}

// The page component itself is now much simpler.
export default async function ProjectsPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.24))]">
      <Suspense fallback={<ProjectsPageSkeleton />}>
        {/* 
          The ProjectsKanbanClient is a Client Component that fetches its own data.
          Wrapping it in Suspense allows Next.js to stream the page, showing the
          skeleton fallback immediately while the client component loads and fetches data.
        */}
        <ProjectsKanbanClient />
      </Suspense>
    </div>
  );
}
