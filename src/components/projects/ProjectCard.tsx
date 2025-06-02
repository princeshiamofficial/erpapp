
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
import React, { useState, useEffect, useCallback } from 'react';

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
  const seconds = Math.floor(totalSeconds % 60);

  let parts: string[] = [];
  if (days > 0) {
    parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 && days < 1) parts.push(`${minutes}m`);
  } else if (hours > 0) {
    parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 && hours < 1) parts.push(`${seconds}s`);
  } else if (minutes > 0) {
    parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
  } else if (seconds > 0) {
    parts.push(`${seconds}s`);
  } else {
     return "<1s";
  }
  
  if (parts.length === 0) {
     return "Due";
  }

  return parts.join(' ');
}

interface ProgressInfo {
  showProgressBar: boolean;
  percentage: number;
  displayText: string;
  isOverdue: boolean;
  progressColorClass: string;
}

const calculateProgressInfo = (
  project: Project,
  now: Date
): ProgressInfo => {
  
  const { status, createdAt, updatedAt, endDate, 
          crClearanceAt, onDesignAt, onHoldAt, logisticsAt, courierAt, crCancelAt 
        } = project;

  let effectiveStartDateIso: string | undefined;

  // Prioritize status-specific timestamp for the current status
  if (status === 'CR Clearance') effectiveStartDateIso = crClearanceAt;
  else if (status === 'On Design') effectiveStartDateIso = onDesignAt;
  else if (status === 'On Hold') effectiveStartDateIso = onHoldAt;
  else if (status === 'Logistics') effectiveStartDateIso = logisticsAt;
  else if (status === 'Courier') effectiveStartDateIso = courierAt;
  else if (status === 'CR Cancel') effectiveStartDateIso = crCancelAt;

  // Fallback if specific status timestamp isn't set
  if (!effectiveStartDateIso) {
    effectiveStartDateIso = updatedAt || createdAt;
  }
  
  if (!effectiveStartDateIso) {
    return { showProgressBar: true, percentage: 0, displayText: "Start date missing", isOverdue: false, progressColorClass: "bg-muted" };
  }

  const effectiveStartDate = parseISO(effectiveStartDateIso);
  let effectiveTargetDate = endDate ? parseISO(endDate) : now; 
  let slaStageName: string | null = null;
  let showProgressBar = true;
  let progressColorClass = 'progress-indicator-gradient'; 

  if (status === 'CR Cancel') {
    showProgressBar = false;
    return { showProgressBar, percentage: 0, displayText: "", isOverdue: false, progressColorClass: "" };
  }

  switch (status) {
    case 'CR Clearance':
      effectiveTargetDate = addHours(effectiveStartDate, 24);
      slaStageName = " (24H SLA)";
      break;
    case 'On Design':
      effectiveTargetDate = addHours(effectiveStartDate, 48);
      slaStageName = " (48H SLA)";
      break;
    case 'On Hold':
      effectiveTargetDate = addDays(effectiveStartDate, 15); 
      slaStageName = " (Max 15 Days)";
      break;
    case 'Logistics':
      effectiveTargetDate = addHours(effectiveStartDate, 24);
      slaStageName = " (24H SLA)";
      break;
    case 'Courier':
      effectiveTargetDate = addHours(effectiveStartDate, 6);
      slaStageName = " (6H SLA)";
      break;
    default:
      if (!endDate) {
          showProgressBar = false;
          return { showProgressBar, percentage:0, displayText: "No target date", isOverdue: false, progressColorClass:"" };
      }
      effectiveTargetDate = parseISO(endDate);
      break;
  }

  let currentPercentage: number;
  let currentDisplayText: string;
  let currentIsOverdue = false;

  if (isAfter(now, effectiveTargetDate)) {
    currentIsOverdue = true;
    const timeOver = formatDistanceToNowStrict(effectiveTargetDate, { addSuffix: false });
    currentDisplayText = `Overdue by ${timeOver}`;
    progressColorClass = 'bg-destructive';
    currentPercentage = 100;
  } else if (
    isBefore(now, effectiveStartDate) && status !== 'CR Cancel' && status !== 'On Hold' 
    // For 'On Hold', we always calculate progress towards its own 15-day limit from when it was put on hold.
    // For other SLA stages, if 'now' is before 'effectiveStartDate' (which is the status entry time), it means it hasn't "started" yet.
    // This condition primarily applies if a project status is set, but its effective start time (the status entry time) is in the future.
  ) {
    const timeUntilStart = formatDistanceToNowStrict(effectiveStartDate, { addSuffix: false });
    currentDisplayText = `Starts in ${timeUntilStart}`;
    currentPercentage = 0;
  } else {
    const secondsRemaining = differenceInSeconds(effectiveTargetDate, now);
    if (secondsRemaining <= 0) {
      currentDisplayText = (status === 'On Hold') ? "Hold period ended" : "Stage due";
      currentPercentage = 100;
      progressColorClass = isAfter(now, effectiveTargetDate) ? 'bg-destructive' : 'bg-yellow-500';
    } else {
      currentDisplayText = `${formatDurationPrecise(secondsRemaining)} remaining`;
      const totalDurationSeconds = differenceInSeconds(effectiveTargetDate, effectiveStartDate);
      const elapsedDurationSeconds = differenceInSeconds(now, effectiveStartDate);
      currentPercentage = totalDurationSeconds > 0 ? Math.max(0, Math.min(100, (elapsedDurationSeconds / totalDurationSeconds) * 100)) : (isAfter(now, effectiveStartDate) ? 100 : 0);
    }
  }

  if (slaStageName && !currentIsOverdue) {
    currentDisplayText += slaStageName;
  } else if (currentIsOverdue && slaStageName) {
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
  
  const [progressInfo, setProgressInfo] = useState<ProgressInfo>(() => 
    calculateProgressInfo(project, new Date())
  );

  useEffect(() => {
    const updateInfo = () => {
        setProgressInfo(calculateProgressInfo(project, new Date()));
    };
    // Initial calculation
    updateInfo(); 

    // Set up interval to update every second
    const intervalId = setInterval(updateInfo, 1000);

    // Cleanup interval on component unmount or when project data changes
    return () => clearInterval(intervalId); 
  }, [project]); // Re-run if project data itself changes (e.g., status, updatedAt)


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
        
        {progressInfo.showProgressBar && (
            <div className="ml-6 pt-1">
            <div className="flex items-center space-x-2 mb-1">
                <StopwatchIcon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-medium text-muted-foreground truncate" title={progressInfo.displayText}>{progressInfo.displayText}</span>
            </div>
            <Progress 
                value={progressInfo.percentage} 
                className="h-2.5 rounded-full bg-secondary shadow-inner" 
                indicatorClassName={progressInfo.progressColorClass}
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
