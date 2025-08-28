"use client";

import React from 'react';
import { ProjectsKanbanClient } from '@/components/projects/ProjectsKanbanClient';

// The page component itself is now much simpler.
export default function ProjectsPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.24))]">
      {/* 
        The ProjectsKanbanClient is a Client Component that fetches its own data.
        The suspense boundary has been removed from this page as the component
        now handles its own loading state internally.
      */}
      <ProjectsKanbanClient />
    </div>
  );
}
