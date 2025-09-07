
"use client";

import type { Project, CustomStatus, User } from '@/types'; // Added CustomStatus, User
import { ProjectCard } from './ProjectCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LucideIcon } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface KanbanColumnProps {
  id: string; 
  title: string;
  icon: LucideIcon;
  projects: Project[];
  headerBgClass: string;
  headerTextClass?: string;
  headerIconClass?: string;
  isLoading?: boolean;
  currentUser: User | null; // Added
  allStatuses: CustomStatus[]; // Added
  allUsers: User[]; // Added
  onOpenAssignDrDialog: (project: Project) => void; // Added
}

export function KanbanColumn({ 
  id,
  title, 
  icon: Icon, 
  projects, 
  headerBgClass, 
  headerTextClass = "text-white",
  headerIconClass = "text-white",
  isLoading = false,
  currentUser, // Added
  allStatuses, // Added
  allUsers, // Added
  onOpenAssignDrDialog // Added
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "w-[280px] sm:w-[300px] shrink-0 flex flex-col bg-muted/30 rounded-lg overflow-hidden transition-all duration-200 ease-in-out h-full",
        isOver ? 'border-primary ring-2 ring-primary shadow-xl scale-[1.01]' : 'border-border/30 shadow-sm' 
      )}
    >
      <div className={`px-3 py-2.5 flex items-center justify-between ${headerBgClass} ${headerTextClass} rounded-t-lg shrink-0`}>
        <div className="flex items-center">
          <Icon className={`mr-2 h-4 w-4 ${headerIconClass}`} />
          <h2 className="font-semibold text-sm tracking-wide">{title}</h2>
        </div>
        <span className="text-xs px-2 py-0.5 bg-black/20 rounded-full">{isLoading ? <Skeleton className="h-4 w-4 inline-block" /> : projects.length}</span>
      </div>
      <ScrollArea className="flex-1 bg-background/10 custom-scrollbar">
        <div className="space-y-3 p-3">
        {isLoading && projects.length === 0 ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-20 w-full rounded-md" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-xs text-muted-foreground text-center italic">No projects in this stage.</p>
          </div>
        ) : (
          projects.map(project => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              currentUser={currentUser} // Pass down
              allStatuses={allStatuses} // Pass down
              allUsers={allUsers} // Pass down
              onOpenAssignDrDialog={onOpenAssignDrDialog} // Pass down
            />
          ))
        )}
        </div>
      </ScrollArea>
    </div>
  );
}
