
"use client";

import type { Project, CustomStatus, User } from '@/types'; 
import { ProjectCard } from './ProjectCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LucideIcon } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';


interface KanbanColumnProps {
  id: string; 
  title: string;
  icon: LucideIcon;
  projects: Project[];
  headerBgClass: string;
  headerTextClass?: string;
  headerIconClass?: string;
  isLoading?: boolean;
  currentUser: User | null; 
  allStatuses: CustomStatus[]; 
  allUsers: User[]; 
  onOpenAssignDrDialog: (project: Project) => void;
  isSearching?: boolean;
}

const PROJECTS_PER_PAGE = 20;

export function KanbanColumn({ 
  id,
  title, 
  icon: Icon, 
  projects, 
  headerBgClass, 
  headerTextClass = "text-white",
  headerIconClass = "text-white",
  isLoading = false,
  currentUser,
  allStatuses,
  allUsers,
  onOpenAssignDrDialog,
  isSearching = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [visibleCount, setVisibleCount] = useState(PROJECTS_PER_PAGE);

  useEffect(() => {
    if (isSearching) {
      setVisibleCount(projects.length);
    } else {
      setVisibleCount(PROJECTS_PER_PAGE);
    }
  }, [projects, isSearching]);

  const handleLoadMore = () => {
    setVisibleCount(prevCount => prevCount + PROJECTS_PER_PAGE);
  };
  
  const visibleProjects = useMemo(() => isSearching ? projects : projects.slice(0, visibleCount), [projects, visibleCount, isSearching]);
  const hasMoreProjects = !isSearching && visibleCount < projects.length;


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
        ) : visibleProjects.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-xs text-muted-foreground text-center italic">No projects in this stage.</p>
          </div>
        ) : (
          <AnimatePresence>
            {visibleProjects.map((project, index) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: (index % PROJECTS_PER_PAGE) * 0.03 }}
              >
                  <ProjectCard 
                    key={project.id} 
                    project={project} 
                    currentUser={currentUser}
                    allStatuses={allStatuses}
                    allUsers={allUsers}
                    onOpenAssignDrDialog={onOpenAssignDrDialog} 
                  />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        {hasMoreProjects && (
          <div className="text-center pt-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8"
              onClick={handleLoadMore}
            >
              Load More ({projects.length - visibleCount} remaining)
            </Button>
          </div>
        )}
        </div>
      </ScrollArea>
    </div>
  );
}
