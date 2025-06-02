
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
    if (minutes > 0 && days < 2) parts.push(`${minutes}m`); // Show minutes if less than 2 days
  } else if (hours > 0) {
    parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 && hours < 1) parts.push(`${seconds}s`); // Show seconds if less than 1 hour
  } else if (minutes > 0) {
    parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
  } else if (seconds > 0) {
    parts.push(`${seconds}s`);
  }
  
  if (parts.length === 0 && totalSeconds > 0) {
    return `<1s`; // Catch very small durations
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
  projectStatus: ProjectStatusType,
  createdAtIso: string | undefined,
  updatedAtIso: string | undefined,
  endDateIso: string | undefined,
  now: Date // Pass current time for consistent calculation
): ProgressInfo => {
  
  if (!createdAtIso || !updatedAtIso) {
    return { showProgressBar: true, percentage: 0, displayText: "Data missing", isOverdue: false, progressColorClass: "bg-muted" };
  }

  const baseDateForSLA = parseISO(updatedAtIso);

  let effectiveStartDate = parseISO(createdAtIso);
  let effectiveTargetDate = endDateIso ? parseISO(endDateIso) : now; 
  let slaStageName: string | null = null;
  let showProgressBar = true;
  let progressColorClass = 'progress-indicator-gradient'; 

  if (projectStatus === 'CR Cancel') {
    showProgressBar = false;
    return { showProgressBar, percentage: 0, displayText: "", isOverdue: false, progressColorClass: "" };
  }

  switch (projectStatus) {
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
      effectiveTargetDate = addDays(baseDateForSLA, 15); 
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
    projectStatus !== 'CR Clearance' && projectStatus !== 'On Design' && projectStatus !== 'Logistics' &&
    projectStatus !== 'Courier' && projectStatus !== 'On Hold' && 
    isBefore(now, effectiveStartDate)
  ) {
    const timeUntilStart = formatDistanceToNowStrict(effectiveStartDate, { addSuffix: false });
    currentDisplayText = `Starts in ${timeUntilStart}`;
    currentPercentage = 0;
  } else {
    const secondsRemaining = differenceInSeconds(effectiveTargetDate, now);
    if (secondsRemaining <= 0) {
      currentDisplayText = (projectStatus === 'On Hold') ? "Hold period ended" : "Stage due";
      currentPercentage = 100;
      progressColorClass = isAfter(now, effectiveTargetDate) ? 'bg-destructive' : 'bg-yellow-500';
    } else {
      currentDisplayText = `${formatDurationPrecise(secondsRemaining)} remaining`;
      const totalDurationSeconds = differenceInSeconds(effectiveTargetDate, effectiveStartDate);
      const elapsedDurationSeconds = differenceInSeconds(now, effectiveStartDate);
      currentPercentage = totalDurationSeconds > 0 ? Math.max(0, Math.min(100, (elapsedDurationSeconds / totalDurationSeconds) * 100)) : (isAfter(now, effectiveStartDate) ? 100 : 0);
    }
  }

  if (projectStatus === 'On Hold' && !currentIsOverdue) {
    currentDisplayText = "Max 15 Days on Hold";
    const holdTargetDateForDisplay = addDays(baseDateForSLA, 15);
    const totalHoldDurationForDisplay = differenceInSeconds(holdTargetDateForDisplay, baseDateForSLA);
    const elapsedHoldDurationForDisplay = differenceInSeconds(now, baseDateForSLA);
    currentPercentage = totalHoldDurationForDisplay > 0 ? Math.max(0, Math.min(100, (elapsedHoldDurationForDisplay / totalHoldDurationForDisplay) * 100)) : 100;
     if (isAfter(now, holdTargetDateForDisplay)) {
        currentIsOverdue = true;
        const timeOverHold = formatDistanceToNowStrict(holdTargetDateForDisplay, { addSuffix: false });
        currentDisplayText = `Hold overdue by ${timeOverHold}`;
        progressColorClass = 'bg-destructive';
        currentPercentage = 100;
    }
  }

  if (slaStageName && !currentIsOverdue && projectStatus !== 'On Hold') {
    currentDisplayText += slaStageName;
  } else if (currentIsOverdue && slaStageName && projectStatus !== 'On Hold') {
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
    calculateProgressInfo(
        project.status,
        project.createdAt,
        project.updatedAt || project.createdAt,
        project.endDate,
        new Date() 
    )
  );

  useEffect(() => {
    const updateInfo = () => {
        setProgressInfo(calculateProgressInfo(
            project.status,
            project.createdAt,
            project.updatedAt || project.createdAt,
            project.endDate,
            new Date()
        ));
    };
    updateInfo(); 

    const intervalId = setInterval(() => {
        updateInfo(); 
    }, 1000);

    return () => clearInterval(intervalId); 
  }, [project.status, project.createdAt, project.updatedAt, project.endDate]);


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

