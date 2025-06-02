
"use client";

import type { Project, ProjectStatusType } from '@/types';
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
import { Progress } from '@/components/ui/progress';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { parseISO, differenceInCalendarDays, isAfter, isBefore, addHours, addDays, differenceInSeconds, formatDistanceToNowStrict } from 'date-fns';
import React from 'react';

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

const calculateProgressInfo = (
  status: ProjectStatusType,
  createdAtIso: string, 
  updatedAtIso: string, 
  endDateIso?: string    
) => {
  const now = new Date();
  let showProgressBar = true;
  let baseDateForSLA = updatedAtIso ? parseISO(updatedAtIso) : now; // Fallback to now if updatedAt is missing

  // Default values for overall project timeline (if no specific SLA applies)
  let effectiveStartDate = createdAtIso ? parseISO(createdAtIso) : now; // Fallback to now if createdAt is missing
  let effectiveTargetDate = endDateIso ? parseISO(endDateIso) : now;   // Fallback to now if endDate is missing
  
  let mainDisplayText = ""; 
  let slaOverrideText = ""; 
  let progressColorClass = 'progress-indicator-gradient';

  // Handle cases where crucial dates for overall timeline might be missing
  if ((status !== 'CR Clearance' && status !== 'On Design' && status !== 'Logistics' && status !== 'Courier' && status !== 'On Hold' && status !== 'CR Cancel') && (!createdAtIso || !endDateIso)) {
    return { showProgressBar: true, percentage: 0, displayText: "Project dates missing", isOverdue: false, progressColorClass: 'bg-gray-400' };
  }

  switch (status) {
    case 'CR Clearance':
      effectiveTargetDate = addHours(baseDateForSLA, 24);
      slaOverrideText = "24H for CR Clearance";
      effectiveStartDate = baseDateForSLA; 
      break;
    case 'CR Cancel':
      showProgressBar = false;
      return { showProgressBar, percentage: 0, displayText: "", isOverdue: false, progressColorClass: "" };
    case 'On Design':
      effectiveTargetDate = addHours(baseDateForSLA, 48);
      slaOverrideText = "48H for Design";
      effectiveStartDate = baseDateForSLA;
      break;
    case 'On Hold':
      effectiveTargetDate = addDays(baseDateForSLA, 15);
      slaOverrideText = "Max 15 Days on Hold";
      effectiveStartDate = baseDateForSLA;
      break;
    case 'Logistics':
      effectiveTargetDate = addHours(baseDateForSLA, 24);
      slaOverrideText = "24H for Logistics";
      effectiveStartDate = baseDateForSLA;
      break;
    case 'Courier':
      effectiveTargetDate = addHours(baseDateForSLA, 6);
      slaOverrideText = "6H for Courier";
      effectiveStartDate = baseDateForSLA;
      break;
    default:
      // Use overall project timeline (effectiveStartDate & effectiveTargetDate already set to overall project dates)
      // No slaOverrideText, mainDisplayText will be calculated based on overall timeline.
      break;
  }

  let percentage = 0;
  let isOverdue = false;

  if (isAfter(now, effectiveTargetDate)) {
    percentage = 100;
    isOverdue = true;
    progressColorClass = 'bg-destructive';
    const timeOver = formatDistanceToNowStrict(effectiveTargetDate, { addSuffix: false });
    mainDisplayText = `Overdue by ${timeOver}`;
  } else if (isBefore(now, effectiveStartDate) && !(status === 'CR Clearance' || status === 'On Design' || status === 'Logistics' || status === 'Courier' || status === 'On Hold')) {
    // Only show "Starts in" for overall project timeline if it hasn't started
    // For SLA stages, effectiveStartDate is usually updatedAt, so this condition is less relevant for them.
    percentage = 0;
    const timeUntilStart = formatDistanceToNowStrict(effectiveStartDate, { addSuffix: false });
    mainDisplayText = `Starts in ${timeUntilStart}`;
  } else { 
    const totalDurationSeconds = differenceInSeconds(effectiveTargetDate, effectiveStartDate);
    const elapsedDurationSeconds = differenceInSeconds(now, effectiveStartDate);

    if (totalDurationSeconds <= 0) { 
      percentage = 100; 
      mainDisplayText = "Due";
      if (isAfter(now, effectiveTargetDate)) {
        isOverdue = true;
        progressColorClass = 'bg-destructive';
        mainDisplayText = "Overdue";
      } else {
          progressColorClass = 'bg-green-500'; 
      }
    } else {
      percentage = Math.max(0, Math.min(100, (elapsedDurationSeconds / totalDurationSeconds) * 100));
      const timeRemaining = formatDistanceToNowStrict(effectiveTargetDate, { addSuffix: false });
      mainDisplayText = `${timeRemaining} remaining`;

      if (percentage === 100 && !isAfter(now, effectiveTargetDate)) { 
        mainDisplayText = "Due today";
      }
    }
  }
  
  const finalDisplayText = isOverdue ? mainDisplayText : (slaOverrideText || mainDisplayText);

  return {
    showProgressBar,
    percentage: Math.round(percentage),
    displayText: finalDisplayText,
    isOverdue,
    progressColorClass,
  };
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

  const { showProgressBar, percentage, displayText, progressColorClass } = calculateProgressInfo(
    project.status,
    project.createdAt,
    project.updatedAt || project.createdAt, // Fallback updatedAt to createdAt if missing
    project.endDate
  );

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "mb-3 bg-card shadow-md hover:shadow-lg transition-shadow relative group",
        isDragging ? "opacity-50 shadow-2xl ring-2 ring-primary z-50" : "cursor-grab active:cursor-grabbing"
      )}
    >
      <CardContent className="p-3 space-y-2.5">
        <div
          className="absolute top-1/2 -translate-y-1/2 left-1.5 opacity-0 group-hover:opacity-80 transition-opacity p-1"
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
        
        {showProgressBar && (
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
        )}

        <div className="flex items-center justify-start mt-2 ml-6">
          <Avatar className="h-7 w-7 text-xs border bg-muted">
            <AvatarFallback className="text-muted-foreground font-semibold">{getInitials(project.assigneeInitials || project.assigneeName)}</AvatarFallback>
          </Avatar>
        </div>
      </CardContent>
    </Card>
  );
}
