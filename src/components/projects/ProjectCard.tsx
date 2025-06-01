
"use client";

import type { Project } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, User, Folder, EllipsisVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';

interface ProjectCardProps {
  project: Project;
  // onEdit: (project: Project) => void;
  // onDelete: (project: Project) => void;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
  };

  return (
    <Card className="mb-3 bg-card shadow-md hover:shadow-lg transition-shadow cursor-pointer">
      <CardContent className="p-3 space-y-2">
        <div className="flex justify-between items-start">
          <span className="text-sm font-semibold text-foreground">{project.projectIdDisplay}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <EllipsisVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem /* onClick={() => onEdit(project)} */ >Edit Project</DropdownMenuItem>
              <DropdownMenuItem /* onClick={() => onDelete(project)} */ className="text-destructive focus:text-destructive">Delete Project</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Using a custom badge style for the date to match image */}
        <div className="inline-flex items-center rounded-md border border-destructive/30 bg-destructive/20 px-2 py-0.5 text-xs font-semibold text-destructive transition-colors">
          <CalendarDays className="mr-1.5 h-3 w-3" />
          {project.endDate}
        </div>
        
        <div className="flex items-center space-x-1.5 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          <span className="truncate" title={project.assigneeName}>{project.assigneeName}</span>
        </div>
        
        <div className="flex items-center space-x-1.5 text-xs text-muted-foreground">
          <Folder className="h-3.5 w-3.5" /> {/* Or Tag */}
          <span className="truncate" title={project.categoryTag}>{project.categoryTag}</span>
        </div>
        
        <div className="flex items-center justify-start mt-2">
          <Avatar className="h-7 w-7 text-xs border bg-muted">
            <AvatarFallback className="text-muted-foreground font-semibold">{getInitials(project.assigneeInitials || project.assigneeName)}</AvatarFallback>
          </Avatar>
        </div>
      </CardContent>
    </Card>
  );
}
