
"use client";

import type { Project, CustomStatus, User } from '@/types'; 
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; 
import { CalendarDays, User as UserIconLucide, Folder, ReceiptText, UserCheck } from 'lucide-react'; // Added UserCheck
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { parseISO, differenceInSeconds, isAfter, isBefore, addHours, addDays, formatDistanceToNowStrict } from 'date-fns';
import React, { useState, useEffect } from 'react'; 
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  isOverlay?: boolean; 
  currentUser: User | null; 
  allStatuses: CustomStatus[]; 
  onOpenAssignDrDialog: (project: Project) => void; 
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
          crClearanceAt, onDesignAt, onHoldAt, logisticsAt, courierAt, cancelAt, deliveredAt
        } = project;

  let effectiveStartDateIso: string | undefined;

  if (status === 'CR Clearance') effectiveStartDateIso = crClearanceAt;
  else if (status === 'On Design') effectiveStartDateIso = onDesignAt;
  else if (status === 'On Hold') effectiveStartDateIso = onHoldAt;
  else if (status === 'Logistics') effectiveStartDateIso = logisticsAt;
  else if (status === 'Courier') effectiveStartDateIso = courierAt;
  else if (status === 'Cancel') effectiveStartDateIso = cancelAt;
  else if (status === 'Delivered') effectiveStartDateIso = deliveredAt;

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

  if (status === 'Cancel' || status === 'Delivered') {
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
    isBefore(now, effectiveStartDate) && status !== 'Cancel' && status !== 'On Hold' 
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

export function ProjectCard({ project, isOverlay = false, currentUser, allStatuses, onOpenAssignDrDialog }: ProjectCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
    data: { project },
    disabled: isOverlay, 
  });

  const style = !isOverlay && transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  const getInitials = (name: string | undefined) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + (names[names.length - 1] ? names[names.length - 1].charAt(0).toUpperCase() : '');
  };
  
  const [progressInfo, setProgressInfo] = useState<ProgressInfo>(() => 
    calculateProgressInfo(project, new Date())
  );

  useEffect(() => {
    const updateInfo = () => {
        setProgressInfo(calculateProgressInfo(project, new Date()));
    };
    updateInfo(); 
    const intervalId = setInterval(updateInfo, 5000); 
    return () => clearInterval(intervalId); 
  }, [project]);

  const canAssignDrPermission = (currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role === 'CRM');
  const canOpenDialogFromProjectCard = (project.status === 'CR Clearance' || project.status === 'On Design');

  const crmInfoClickable = canAssignDrPermission && canOpenDialogFromProjectCard && !project.designerRepresentativeName;
  const drInfoClickable = canAssignDrPermission && canOpenDialogFromProjectCard && !!project.designerRepresentativeName;

  const relevantDrStages: ProjectStatusType[] = ['On Design', 'On Hold', 'Logistics', 'Courier'];

  return (
    <motion.div
      ref={!isOverlay ? setNodeRef : null}
      style={style}
      {...(!isOverlay ? listeners : {})}
      {...(!isOverlay ? attributes : {})}
      animate={{
        scale: !isOverlay && isDragging ? 1.05 : (isOverlay ? 0.95 : 1),
        opacity: !isOverlay && isDragging ? 0.4 : 1,
        boxShadow: isOverlay
          ? "0px 10px 25px -5px rgba(0, 0, 0, 0.2), 0px 5px 10px -6px rgba(0, 0, 0, 0.2)" 
          : "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)", 
        rotate: isOverlay ? 2 : 0,
      }}
      transition={{ duration: 0.15, ease: "easeInOut" }}
      className={cn(
        "relative group mb-3",
        isOverlay ? "z-50" : (isDragging ? "z-50" : "")
      )}
    >
      <Card
        className={cn(
          "bg-card w-full shadow-none", 
           isOverlay ? "cursor-grabbing" : (isDragging ? "ring-2 ring-primary cursor-grabbing" : "cursor-grab active:cursor-grabbing")
        )}
      >
        <CardContent className="p-3 space-y-2.5">
          <div className={cn("flex justify-between items-start")}>
            <span className="text-sm font-semibold text-foreground">{project.projectIdDisplay}</span>
            {!isOverlay && (
                 <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title="View Invoice / Order Details"
                    onClick={(event) => {
                      event.stopPropagation();
                      event.preventDefault();
                      console.log(`[ProjectCard] ReceiptText icon clicked for project ${project.id}.`);
                      if (project && project.id) {
                          const url = `/track/${project.id}`;
                          console.log(`[ProjectCard] Attempting to open URL: ${url}`);
                          window.open(url, '_blank', 'noopener,noreferrer');
                      } else {
                          console.error('[ProjectCard] project.id is missing. Cannot open link.');
                      }
                    }}
                  >
                    <ReceiptText className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  </Button>
            )}
          </div>
          
          <p className={cn("text-xs font-medium text-muted-foreground truncate")} title={project.name}>{project.name}</p>

          <div className={cn("inline-flex items-center rounded-md border border-destructive/30 bg-destructive/20 px-2 py-0.5 text-xs font-semibold text-destructive transition-colors")}>
            <CalendarDays className="mr-1.5 h-3 w-3" />
            Target: {project.endDate ? parseISO(project.endDate).toLocaleDateString() : 'N/A'}
          </div>

          <div 
            className={cn(
              "flex items-center space-x-1.5 text-xs text-muted-foreground hover:bg-muted/50 p-1 -m-1 rounded-md transition-colors",
              crmInfoClickable && "cursor-pointer"
            )}
            title={crmInfoClickable ? `CRM: ${project.assigneeName} (Click to assign DR)` : `CRM: ${project.assigneeName}`}
            onClick={
              crmInfoClickable
                ? (e) => { 
                    e.stopPropagation();
                    console.log('[ProjectCard] CRM area clicked. Calling onOpenAssignDrDialog for project:', project.id);
                    onOpenAssignDrDialog(project);
                  }
                : undefined
            }
          >
            <UserIconLucide className="h-3.5 w-3.5" />
            <span className="truncate">CRM: {project.assigneeName}</span>
          </div>

          {project.designerRepresentativeName && relevantDrStages.includes(project.status) && (
            <div 
              className={cn(
                "flex items-center space-x-1.5 text-xs text-muted-foreground hover:bg-muted/50 p-1 -m-1 rounded-md transition-colors",
                drInfoClickable && "cursor-pointer"
              )}
              title={drInfoClickable ? `DR: ${project.designerRepresentativeName} (Click to re-assign DR)` : `DR: ${project.designerRepresentativeName}`}
              onClick={
                drInfoClickable
                  ? (e) => { 
                      e.stopPropagation();
                      console.log('[ProjectCard] DR Name area clicked. Calling onOpenAssignDrDialog for project:', project.id);
                      onOpenAssignDrDialog(project);
                    }
                  : undefined
              }
            >
              <UserCheck className="h-3.5 w-3.5 text-blue-500" />
              <span className="truncate text-blue-600 dark:text-blue-400">DR: {project.designerRepresentativeName}</span>
            </div>
          )}
          
          <div className={cn("flex items-center space-x-1.5 text-xs text-muted-foreground")}>
            <Folder className="h-3.5 w-3.5" />
            <span className="truncate" title={project.categoryTag}>{project.categoryTag}</span>
          </div>
          
          {progressInfo.showProgressBar && (
              <div className={cn("pt-1")}>
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

          <div className={cn("flex items-center justify-start mt-2")}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "hover:bg-muted/50 p-1 -m-1 rounded-md transition-colors",
                      crmInfoClickable && "cursor-pointer"
                    )}
                    onClick={
                      crmInfoClickable
                        ? (e) => { 
                            e.stopPropagation();
                            console.log('[ProjectCard] CRM AVATAR clicked. Calling onOpenAssignDrDialog for project:', project.id);
                            onOpenAssignDrDialog(project);
                          }
                        : undefined
                    }
                  >
                    <Avatar className="h-7 w-7 text-xs border bg-muted">
                      <AvatarImage src={project.assigneeAvatarUrl || undefined} alt={project.assigneeName} data-ai-hint="assignee avatar" />
                      <AvatarFallback className="text-muted-foreground font-semibold">{getInitials(project.assigneeInitials || project.assigneeName)}</AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>CRM: {project.assigneeName}</p>
                  {crmInfoClickable && <p className="text-xs text-primary">(Click to assign DR)</p>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {project.designerRepresentativeName && relevantDrStages.includes(project.status) && (
              <>
                <div className="w-px h-5 bg-border mx-1.5"></div> 
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                       <div
                          className={cn(
                            "hover:bg-muted/50 p-1 -m-1 rounded-md transition-colors",
                            drInfoClickable && "cursor-pointer"
                          )}
                          onClick={
                            drInfoClickable
                              ? (e) => {
                                  e.stopPropagation();
                                  console.log('[ProjectCard] DR AVATAR area clicked. Calling onOpenAssignDrDialog for project:', project.id);
                                  onOpenAssignDrDialog(project);
                                }
                              : undefined
                          }
                       >
                        <Avatar className="h-7 w-7 text-xs border border-blue-400 bg-muted">
                          <AvatarImage src={project.designerRepresentativeAvatarUrl || undefined} alt={project.designerRepresentativeName} data-ai-hint="designer avatar" />
                          <AvatarFallback className="text-blue-500 font-semibold">
                            {getInitials(project.designerRepresentativeName)}
                          </AvatarFallback>
                        </Avatar>
                       </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>DR: {project.designerRepresentativeName}</p>
                      {drInfoClickable && <p className="text-xs text-primary">(Click to re-assign DR)</p>}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
