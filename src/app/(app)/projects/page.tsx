
import React, { Suspense } from 'react';
import type { Project, CustomStatus, GlobalSettings, User } from '@/types'; 
import { getProjects } from '@/lib/project-service';
import { getStatuses } from '@/lib/status-service'; 
import { getGlobalSettings } from '@/lib/settings-service';
import { Briefcase } from 'lucide-react'; 
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectsKanbanClient } from '@/components/projects/ProjectsKanbanClient';
import { cookies } from 'next/headers';


async function ProjectsPageData() {
  // Fetch all data on the server
  const [projects, statuses, globalSettings] = await Promise.all([
    getProjects(),
    getStatuses(),
    getGlobalSettings()
  ]);

  // Get current user from cookie to pass to client component
  const cookieStore = cookies();
  const userCookie = cookieStore.get('colorhut-user');
  let currentUser: User | null = null;
  if (userCookie) {
    try {
      currentUser = JSON.parse(userCookie.value);
    } catch (e) {
      console.error("Failed to parse user cookie on server", e);
    }
  }

  // Pass all fetched data as initial props to the client component
  return (
    <ProjectsKanbanClient
      initialProjects={projects}
      initialStatuses={statuses}
      initialGlobalSettings={globalSettings}
      currentUser={currentUser}
    />
  );
}

// Skeleton component for a better loading experience during server render
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


export default async function ProjectsPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.24))]">
      <Suspense fallback={<ProjectsPageSkeleton />}>
        <ProjectsPageData />
      </Suspense>
    </div>
  );
}
