
"use client";

import type { Project } from '@/types';
import { ProjectCard } from './ProjectCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LucideIcon } from 'lucide-react';

interface KanbanColumnProps {
  title: string;
  icon: LucideIcon;
  projects: Project[];
  headerBgClass: string;
  headerTextClass?: string;
  headerIconClass?: string;
}

export function KanbanColumn({ 
  title, 
  icon: Icon, 
  projects, 
  headerBgClass, 
  headerTextClass = "text-white",
  headerIconClass = "text-white" 
}: KanbanColumnProps) {
  return (
    <div className="flex-1 min-w-[280px] max-w-[320px] flex flex-col bg-muted/30 rounded-lg shadow-sm overflow-hidden border border-border/30">
      <div className={`px-3 py-2.5 flex items-center justify-between ${headerBgClass} ${headerTextClass}`}>
        <div className="flex items-center">
          <Icon className={`mr-2 h-4 w-4 ${headerIconClass}`} />
          <h2 className="font-semibold text-sm tracking-wide">{title}</h2>
        </div>
        <span className="text-xs px-2 py-0.5 bg-black/20 rounded-full">{projects.length}</span>
      </div>
      <ScrollArea className="flex-1 p-3 bg-background/10">
        {projects.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-xs text-muted-foreground text-center italic">No projects in this stage.</p>
          </div>
        ) : (
          projects.map(project => <ProjectCard key={project.id} project={project} />)
        )}
      </ScrollArea>
    </div>
  );
}
