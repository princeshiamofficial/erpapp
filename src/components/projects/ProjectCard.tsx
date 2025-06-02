
"use client";

import type { Project } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CalendarDays, User, Folder, EllipsisVertical, GripVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
    data: { project }, // Pass project data for context in handleDragEnd
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={cn(
        "mb-3 bg-card shadow-md hover:shadow-lg transition-shadow relative",
        isDragging ? "opacity-50 shadow-2xl ring-2 ring-primary z-50" : "cursor-grab active:cursor-grabbing"
      )}
    >
      <CardContent className="p-3 space-y-2">
        <div 
          className="absolute top-1/2 -translate-y-1/2 left-1.5 opacity-30 hover:opacity-80 cursor-grab group p-1"
          {...listeners} 
          {...attributes}
          title="Drag to move project"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
        </div>
        
        <div className="flex justify-between items-start ml-6"> {/* Added ml-6 for drag handle space */}
          <span className="text-sm font-semibold text-foreground">{project.projectIdDisplay}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <EllipsisVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>Edit Project (Soon)</DropdownMenuItem>
              <DropdownMenuItem disabled className="text-destructive focus:text-destructive">Delete Project (Soon)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="inline-flex items-center rounded-md border border-destructive/30 bg-destructive/20 px-2 py-0.5 text-xs font-semibold text-destructive transition-colors ml-6">
          <CalendarDays className="mr-1.5 h-3 w-3" />
          {project.endDate}
        </div>
        
        <div className="flex items-center space-x-1.5 text-xs text-muted-foreground ml-6">
          <User className="h-3.5 w-3.5" />
          <span className="truncate" title={project.assigneeName}>{project.assigneeName}</span>
        </div>
        
        <div className="flex items-center space-x-1.5 text-xs text-muted-foreground ml-6">
          <Folder className="h-3.5 w-3.5" />
          <span className="truncate" title={project.categoryTag}>{project.categoryTag}</span>
        </div>
        
        <div className="flex items-center justify-start mt-2 ml-6">
          <Avatar className="h-7 w-7 text-xs border bg-muted">
            <AvatarFallback className="text-muted-foreground font-semibold">{getInitials(project.assigneeInitials || project.assigneeName)}</AvatarFallback>
          </Avatar>
        </div>
      </CardContent>
    </Card>
  );
}
