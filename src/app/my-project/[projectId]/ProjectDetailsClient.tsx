
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { DndContext, type DragEndEvent, type DragStartEvent, type DragCancelEvent, closestCorners } from '@dnd-kit/core';
import { useToast } from '@/hooks/use-toast';
import { KanbanColumn } from '@/components/projects/KanbanColumn';
import { ProjectCard } from '@/components/projects/ProjectCard';
import type { Project, CustomStatus, User, GlobalSettings, ProjectStatusType } from '@/types';
import dynamic from 'next/dynamic';
import { Briefcase, EyeOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';

// Since this is a public page, interactive dialogs are not needed.

const KANBAN_COLUMNS_CONFIG: Array<{ title: string; status: ProjectStatusType; icon: React.ElementType; headerBgClass: string; }> = [
  { title: 'CR Clearance', status: 'CR Clearance', icon: Briefcase, headerBgClass: 'bg-sky-600' },
  { title: 'CO Clearance', status: 'CO Clearance', icon: Briefcase, headerBgClass: 'bg-teal-600' },
  { title: 'On Design', status: 'On Design', icon: Briefcase, headerBgClass: 'bg-purple-600' },
  { title: 'On Hold', status: 'On Hold', icon: Briefcase, headerBgClass: 'bg-yellow-500' },
  { title: 'Logistics', status: 'Logistics', icon: Briefcase, headerBgClass: 'bg-orange-600' },
  { title: 'Courier', status: 'Courier', icon: Briefcase, headerBgClass: 'bg-green-600' },
  { title: 'Delivered', status: 'Delivered', icon: Briefcase, headerBgClass: 'bg-emerald-600' },
  { title: 'Cancel', status: 'Cancel', icon: Briefcase, headerBgClass: 'bg-red-600' },
];

interface ProjectDetailsClientProps {
  initialProject: Project;
  isReadOnly: boolean;
  currentUser: User | null;
  globalSettings: GlobalSettings;
  allUsers: User[];
  allStatuses: CustomStatus[];
}

export function ProjectDetailsClient({
  initialProject,
  isReadOnly,
  currentUser,
  globalSettings,
  allUsers,
  allStatuses,
}: ProjectDetailsClientProps) {
  const [project, setProject] = useState(initialProject);
  
  const projectsByStatus = useMemo(() => {
    const grouped: Record<ProjectStatusType, Project[]> = {
      'CR Clearance': [], 'CO Clearance': [], 'Cancel': [], 'On Design': [],
      'On Hold': [], 'Logistics': [], 'Courier': [], 'Delivered': [],
    };
    if (grouped[project.status]) {
      grouped[project.status].push(project);
    }
    return grouped;
  }, [project]);
  
  const { contactPerson, businessName } = useMemo(() => {
    const parts = (project.name || '').split(' • ');
    if (parts.length > 1) {
      return { contactPerson: parts[0].trim(), businessName: parts.slice(1).join(' • ').trim() };
    }
    return { contactPerson: '', businessName: project.name };
  }, [project.name]);


  return (
    <DndContext>
      <div className="flex flex-col h-full space-y-4 p-4">
        {isReadOnly && (
          <div className="flex items-center justify-center gap-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-md text-sm font-medium">
            <EyeOff className="h-4 w-4" />
            Read-Only View
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight">
          Project: <span className="text-muted-foreground">{businessName || project.projectIdDisplay}</span>
        </h1>
        <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar-hidden">
          <div className="flex space-x-4 h-full min-w-max">
            {KANBAN_COLUMNS_CONFIG.map((col) => (
              <KanbanColumn
                key={col.status} id={col.status} title={col.title} icon={col.icon}
                projects={projectsByStatus[col.status] || []}
                headerBgClass={col.headerBgClass}
                isLoading={false} currentUser={currentUser} allStatuses={allStatuses} allUsers={allUsers}
                onOpenAssignDrDialog={() => {}} // No-op for read-only
              />
            ))}
          </div>
        </div>
      </div>
    </DndContext>
  );
}
