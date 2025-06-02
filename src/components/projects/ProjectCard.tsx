
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
import { Progress } from '@/components/ui/progress'; // Import Progress component
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { parseISO, differenceInCalendarDays, isAfter, isBefore } from 'date-fns'; // Import date-fns functions
import React from 'react'; // Import React for SVG component type

// Inline SVG Stopwatch Icon Component
const StopwatchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="14" r="8" />
    <line x1="12" y1="6" x2="12" y2="2" />
    <line x1="10" y1="2" x2="14" y2="2" />
    <path d="M12 14l2-2" />
  </svg>
);

interface ProjectCardProps {
  project: Project;
}

// Helper function to calculate progress information
const calculateProgressInfo = (createdAtIso?: string, endDateIso?: string) => {
  if (!createdAtIso || !endDateIso) {
    return { percentage: 0, displayText: "Dates missing", isCompleted: false, isOverdue: false, progressColorClass: 'bg-gray-400' };
  }

  try {
    const startDate = parseISO(createdAtIso);
    const endDate = parseISO(endDateIso);
    const now = new Date();

    let percentage = 0;
    let displayText = "";
    let isCompleted = false;
    let isOverdue = false;
    let progressColorClass = 'progress-indicator-gradient'; // Default gradient

    if (isAfter(now, endDate)) {
      const daysOverdue = differenceInCalendarDays(now, endDate);
      percentage = 100;
      displayText = `Overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}`;
      isCompleted = true;
      isOverdue = true;
      progressColorClass = 'bg-destructive'; // Solid red for overdue
    } else if (isBefore(now, startDate)) {
      const daysUntilStart = differenceInCalendarDays(startDate, now);
      percentage = 0;
      displayText = `${daysUntilStart} day${daysUntilStart === 1 ? '' : 's'} until start`;
      // progressColorClass remains gradient or could be specific for 'not started'
    } else {
      const totalDuration = differenceInCalendarDays(endDate, startDate);
      const elapsedDuration = differenceInCalendarDays(now, startDate);

      if (totalDuration <= 0) { // End date is same or before start date
        percentage = 100;
        displayText = "Completed";
        isCompleted = true;
         progressColorClass = 'bg-green-500'; // Solid green for completed on time
      } else {
        percentage = Math.max(0, Math.min(100, (elapsedDuration / totalDuration) * 100));
        const daysRemaining = differenceInCalendarDays(endDate, now);
        
        if (daysRemaining < 0) { // Should be caught by isAfter, but for safety
             displayText = "Overdue";
             isOverdue = true;
             progressColorClass = 'bg-destructive';
        } else if (daysRemaining === 0) {
            displayText = "Due today";
        } else {
            displayText = `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`;
        }

        if (percentage === 100 && !isAfter(now, endDate)) {
           displayText = "Due today";
           isCompleted = true; // Mark as completed if progress is 100% and it's the end date
           progressColorClass = 'bg-green-500';
        }
      }
    }
    
    // If not using gradient and want color stages
    // if (!isOverdue && !isCompleted) {
    //   if (percentage < 33) progressColorClass = 'bg-red-500';
    //   else if (percentage < 66) progressColorClass = 'bg-yellow-500';
    //   else progressColorClass = 'bg-green-500';
    // }


    return {
      percentage,
      displayText,
      isCompleted,
      isOverdue,
      progressColorClass
    };
  } catch (error) {
    console.error("Error calculating progress:", error);
    return { percentage: 0, displayText: "Date error", isCompleted: false, isOverdue: false, progressColorClass: 'bg-gray-400' };
  }
};


export function ProjectCard({ project }: ProjectCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
    data: { project },
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

  const { percentage, displayText, progressColorClass } = calculateProgressInfo(project.createdAt, project.endDate);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "mb-3 bg-card shadow-md hover:shadow-lg transition-shadow relative group", // Added group for hover effects
        isDragging ? "opacity-50 shadow-2xl ring-2 ring-primary z-50" : "cursor-grab active:cursor-grabbing"
      )}
    >
      <CardContent className="p-3 space-y-2.5">
        <div
          className="absolute top-1/2 -translate-y-1/2 left-1.5 opacity-0 group-hover:opacity-80 transition-opacity p-1" // Hidden by default, shows on hover
          title="Drag to move project"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
        </div>

        <div className="flex justify-between items-start ml-6">
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
        
        {/* Project Name (moved from original, assuming projectIdDisplay is the main title) */}
        <p className="text-xs font-medium text-muted-foreground ml-6 truncate" title={project.name}>{project.name}</p>


        <div className="inline-flex items-center rounded-md border border-destructive/30 bg-destructive/20 px-2 py-0.5 text-xs font-semibold text-destructive transition-colors ml-6">
          <CalendarDays className="mr-1.5 h-3 w-3" />
          Target: {project.endDate ? parseISO(project.endDate).toLocaleDateString() : 'N/A'}
        </div>

        <div className="flex items-center space-x-1.5 text-xs text-muted-foreground ml-6">
          <User className="h-3.5 w-3.5" />
          <span className="truncate" title={project.assigneeName}>{project.assigneeName}</span>
        </div>

        <div className="flex items-center space-x-1.5 text-xs text-muted-foreground ml-6">
          <Folder className="h-3.5 w-3.5" />
          <span className="truncate" title={project.categoryTag}>{project.categoryTag}</span>
        </div>
        
        <div className="ml-6 pt-1">
          <div className="flex items-center space-x-2 mb-1">
            <StopwatchIcon className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">{displayText}</span>
          </div>
          <Progress 
            value={percentage} 
            className="h-2.5 rounded-full bg-secondary shadow-inner" 
            indicatorClassName={progressColorClass}
          />
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

