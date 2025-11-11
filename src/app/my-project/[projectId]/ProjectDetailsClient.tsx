
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DndContext } from '@dnd-kit/core';
import { KanbanColumn } from '@/components/projects/KanbanColumn';
import type { Project, CustomStatus, User, GlobalSettings, ProjectStatusType } from '@/types';
import { EyeOff, Briefcase } from 'lucide-react';

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
    if (project && grouped[project.status]) {
      grouped[project.status].push(project);
    }
    return grouped;
  }, [project]);
  
  const { businessName } = useMemo(() => {
    const nameParts = (project?.name || '').split(' • ');
    if (nameParts.length > 1) {
      // Return the part after the first '•'
      return { businessName: nameParts.slice(1).join(' • ').trim() };
    }
    // If no '•', return the whole name as the business name
    return { businessName: project?.name || 'Loading...' };
  }, [project?.name]);


  return (
    <DndContext>
      <div className="flex flex-col h-full space-y-4 p-4">
        {isReadOnly && (
          <div className="flex items-center justify-center gap-2 p-2 bg-black text-white rounded-md text-sm font-medium">
            Read-Only View
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight">
          Project: <span className="text-muted-foreground">{businessName}</span>
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
