
"use client";

import type { Lead, User } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Edit, CalendarDays, MapPin, StickyNote, Bot, Trash2 } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface LeadCardProps {
  lead: Lead;
  isOverlay?: boolean;
  currentUser: User | null;
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (lead: Lead) => void; // New prop
  crmAvatarUrl?: string;
  headerBgClass: string; 
}

const getInitials = (name: string | undefined) => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names[names.length - 1] ? names[names.length - 1].charAt(0).toUpperCase() : '');
};

const formatDateSafe = (dateString?: string) => {
  if (!dateString) return 'No Date';
  try {
    return format(parseISO(dateString), 'd MMM, yyyy');
  } catch (e) {
    return 'Invalid Date';
  }
};


export function LeadCard({ lead, isOverlay = false, currentUser, onEditLead, onDeleteLead, crmAvatarUrl, headerBgClass }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
    disabled: isOverlay,
  });

  const style = !isOverlay && transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;
  
  const canEdit = currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.id === lead.crmId;
  const canDelete = currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN';

  return (
    <motion.div
      ref={!isOverlay ? setNodeRef : null}
      style={style}
      {...(!isOverlay ? listeners : {})}
      {...(!isOverlay ? attributes : {})}
      animate={{
        scale: !isOverlay && isDragging ? 1.05 : (isOverlay ? 0.95 : 1),
        opacity: !isOverlay && isDragging ? 0.4 : 1,
        boxShadow: isOverlay ? "0px 10px 25px -5px rgba(0, 0, 0, 0.2)" : "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        rotate: isOverlay ? 2 : 0,
      }}
      transition={{ duration: 0.15, ease: "easeInOut" }}
      className={cn("relative group", isOverlay ? "z-50" : (isDragging ? "z-50" : ""))}
    >
      <Card
        className={cn(
          "bg-card w-full shadow-sm hover:shadow-md transition-shadow",
          isOverlay ? "cursor-grabbing" : (isDragging ? "ring-2 ring-primary cursor-grabbing" : "cursor-grab active:cursor-grabbing")
        )}
      >
        <CardContent className="p-3 space-y-2.5">
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-foreground truncate">{lead.contactName}</span>
            <div className="flex items-center">
              {canEdit && (
                  <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); onEditLead(lead); }}
                      title="Edit Lead"
                  >
                      <Edit className="h-3.5 w-3.5" />
                  </Button>
              )}
              {canDelete && (
                  <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); onDeleteLead(lead); }}
                      title="Delete Lead"
                  >
                      <Trash2 className="h-3.5 w-3.5" />
                  </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground truncate">{lead.businessName}</p>
          
          <div className="flex items-center justify-between">
            <div className={cn(
              "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors",
              headerBgClass ? `${headerBgClass} text-white/90 border-transparent` : "border-muted-foreground/30 bg-muted/50"
            )}>
              <CalendarDays className="mr-1.5 h-3 w-3" />
              <span>{formatDateSafe(lead.date)}</span>
            </div>
          </div>
           
           <div className="flex items-center text-xs text-muted-foreground pt-1">
            <Bot className="mr-1.5 h-3 w-3" />
            <span>Source: {lead.source}</span>
          </div>

          <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-start text-xs text-muted-foreground pt-1 cursor-help">
                        <MapPin className="mr-1.5 h-3 w-3 mt-0.5 shrink-0 text-primary" />
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="max-w-xs whitespace-pre-wrap">{lead.address}</p>
                </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {lead.schedule && (
            <div className="flex items-center text-xs text-blue-600 dark:text-blue-400 font-medium pt-1">
              <CalendarDays className="mr-1.5 h-3 w-3" />
              <span>Schedule: {formatDateSafe(lead.schedule)}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    <Avatar className="h-6 w-6 text-xs mr-2 cursor-pointer">
                      <AvatarImage src={crmAvatarUrl || undefined} alt={lead.crmName} />
                      <AvatarFallback>{getInitials(lead.crmName)}</AvatarFallback>
                    </Avatar>
                    <span>{lead.phone}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{lead.crmName}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {lead.notes && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => e.stopPropagation()}>
                                <StickyNote className="h-3.5 w-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="max-w-xs whitespace-pre-wrap">{lead.notes}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
