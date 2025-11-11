
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getProjectById } from '@/lib/project-service';
import { getGlobalSettings } from '@/lib/settings-service';
import { getUsers } from '@/lib/user-service';
import { getStatuses } from '@/lib/status-service';
import { cookies } from 'next/headers';
import type { User } from '@/types';
import { ProjectDetailsClient } from './ProjectDetailsClient';
import { Skeleton } from '@/components/ui/skeleton';


interface ProjectDetailsPageProps {
  params: { projectId: string };
}

function PageSkeleton() {
    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.24))] p-4 space-y-4">
            <Skeleton className="h-12 w-1/3 rounded-lg" />
            <Skeleton className="h-10 w-full rounded-md" />
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <Skeleton className="h-full w-full rounded-lg" />
                <Skeleton className="h-full w-full rounded-lg" />
                <Skeleton className="h-full w-full rounded-lg" />
                <Skeleton className="h-full w-full rounded-lg hidden lg:block" />
                <Skeleton className="h-full w-full rounded-lg hidden xl:block" />
            </div>
        </div>
    );
}


export default async function MyProjectDetailsPage({ params }: ProjectDetailsPageProps) {
  const { projectId } = params;

  if (!projectId) {
    notFound();
  }

  // Fetch all necessary data in parallel
  const [projectData, globalSettings, allUsers, allStatuses] = await Promise.all([
    getProjectById(projectId),
    getGlobalSettings(),
    getUsers(),
    getStatuses()
  ]);

  // If no project or fallback order is found, 404
  if (!projectData) {
    notFound();
  }
  
  // For this public page, the user is always considered null and view is read-only.
  const currentUser: User | null = null;
  const isReadOnly = true;

  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProjectDetailsClient
        initialProject={projectData}
        isReadOnly={isReadOnly}
        currentUser={currentUser}
        globalSettings={globalSettings}
        allUsers={allUsers}
        allStatuses={allStatuses}
      />
    </Suspense>
  );
}
