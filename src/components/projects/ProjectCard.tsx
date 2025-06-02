
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
import { parseISO, differenceInSeconds, isAfter, isBefore, addHours, addDays, formatDistanceToNowStrict } from 'date-fns';
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

function formatDurationPrecise(totalSeconds: number): string {
  if (totalSeconds <= 0) return "Due";

  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  let parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}m`); // Only show minutes if no days are shown
  
  if (parts.length === 0) { // Less than a minute remaining
    if (totalSeconds > 0) return "<1m";
    return "Due";
  }

  return parts.join(' ');
}

const calculateProgressInfo = (
  status: ProjectStatusType,
  createdAtIso: string,
  updatedAtIso: string,
  endDateIso?: string
) => {
  const now = new Date();
  const baseDateForSLA = updatedAtIso ? parseISO(updatedAtIso) : now;

  let effectiveStartDate = createdAtIso ? parseISO(createdAtIso) : now;
  let effectiveTargetDate = endDateIso ? parseISO(endDateIso) : now;
  let slaStageName: string | null = null;
  let showProgressBar = true;
  let progressColorClass = 'progress-indicator-gradient'; // Default gradient

  if (status === 'CR Cancel') {
    showProgressBar = false;
    return { showProgressBar, percentage: 0, displayText: "", isOverdue: false, progressColorClass: "" };
  }

  switch (status) {
    case 'CR Clearance':
      effectiveStartDate = baseDateForSLA;
      effectiveTargetDate = addHours(baseDateForSLA, 24);
      slaStageName = " (24H SLA)";
      break;
    case 'On Design':
      effectiveStartDate = baseDateForSLA;
      effectiveTargetDate = addHours(baseDateForSLA, 48);
      slaStageName = " (48H SLA)";
      break;
    case 'On Hold':
      effectiveStartDate = baseDateForSLA;
      effectiveTargetDate = addDays(baseDateForSLA, 15); // Target for overdue calculation
      // Display text is handled specially below for On Hold
      break;
    case 'Logistics':
      effectiveStartDate = baseDateForSLA;
      effectiveTargetDate = addHours(baseDateForSLA, 24);
      slaStageName = " (24H SLA)";
      break;
    case 'Courier':
      effectiveStartDate = baseDateForSLA;
      effectiveTargetDate = addHours(baseDateForSLA, 6);
      slaStageName = " (6H SLA)";
      break;
    default:
      // Uses overall project timeline (effectiveStartDate & effectiveTargetDate already set)
      break;
  }

  let currentPercentage: number;
  let currentDisplayText: string;
  let currentIsOverdue = false;

  if (isAfter(now, effectiveTargetDate)) {
    currentIsOverdue = true;
    const timeOver = formatDistanceToNowStrict(effectiveTargetDate, { addSuffix: false });
    currentDisplayText = `Overdue by ${timeOver}`;
    progressColorClass = 'bg-destructive'; // Corrected line
    currentPercentage = 100;
  } else if (
    status !== 'CR Clearance' && status !== 'On Design' && status !== 'Logistics' &&
    status !== 'Courier' && status !== 'On Hold' && // These SLA stages start from updatedAt
    isBefore(now, effectiveStartDate)
  ) {
    const timeUntilStart = formatDistanceToNowStrict(effectiveStartDate, { addSuffix: false });
    currentDisplayText = `Starts in ${timeUntilStart}`;
    currentPercentage = 0;
  } else {
    const secondsRemaining = differenceInSeconds(effectiveTargetDate, now);
    if (secondsRemaining <= 0) {
      currentDisplayText = (status === 'On Hold') ? "Hold period ended" : "Stage due";
      currentPercentage = 100;
      // If it's exactly due or slightly past but not yet flagged `currentIsOverdue` by `isAfter` (due to precision)
      progressColorClass = isAfter(now, effectiveTargetDate) ? 'bg-destructive' : 'bg-yellow-500';
    } else {
      currentDisplayText = `${formatDurationPrecise(secondsRemaining)} remaining`;
      const totalDurationSeconds = differenceInSeconds(effectiveTargetDate, effectiveStartDate);
      const elapsedDurationSeconds = differenceInSeconds(now, effectiveStartDate);
      currentPercentage = totalDurationSeconds > 0 ? Math.max(0, Math.min(100, (elapsedDurationSeconds / totalDurationSeconds) * 100)) : (isAfter(now, effectiveStartDate) ? 100 : 0);
    }
  }

  // Special text for "On Hold" if not overdue
  if (status === 'On Hold' && !currentIsOverdue) {
    currentDisplayText = "Max 15 Days on Hold";
     // Recalculate percentage specifically for On Hold based on its 15-day target
    const holdTargetDateForDisplay = addDays(baseDateForSLA, 15);
    const totalHoldDurationForDisplay = differenceInSeconds(holdTargetDateForDisplay, baseDateForSLA);
    const elapsedHoldDurationForDisplay = differenceInSeconds(now, baseDateForSLA);
    currentPercentage = totalHoldDurationForDisplay > 0 ? Math.max(0, Math.min(100, (elapsedHoldDurationForDisplay / totalHoldDurationForDisplay) * 100)) : 100;
     if (isAfter(now, holdTargetDateForDisplay)) { // Ensure overdue status is correct for On Hold display
        currentIsOverdue = true;
        const timeOverHold = formatDistanceToNowStrict(holdTargetDateForDisplay, { addSuffix: false });
        currentDisplayText = `Hold overdue by ${timeOverHold}`;
        progressColorClass = 'bg-destructive';
        currentPercentage = 100;
    }
  }

  if (slaStageName && !currentIsOverdue && status !== 'On Hold') {
    currentDisplayText += slaStageName;
  } else if (currentIsOverdue && slaStageName && status !== 'On Hold') {
     currentDisplayText += slaStageName;
  }


  return {
    showProgressBar,
    percentage: Math.round(currentPercentage),
    displayText: currentDisplayText,
    isOverdue: currentIsOverdue,
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
    project.updatedAt || project.createdAt, 
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
                <StopwatchIcon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-medium text-muted-foreground truncate" title={displayText}>{displayText}</span>
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

