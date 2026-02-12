
"use client";

import dynamic from 'next/dynamic';
import type { Lead, User } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LucideIcon } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Loader2 } from 'lucide-react';


const LeadCard = dynamic(() => import('@/components/pipeline/LeadCard').then(mod => mod.LeadCard), {
  ssr: false,
  loading: () => <Skeleton className="h-20 w-full rounded-md" />
});

interface PipelineKanbanColumnProps {
  id: string;
  title: string;
  icon: LucideIcon;
  leads: Lead[];
  headerBgClass: string;
  headerTextClass?: string;
  headerIconClass?: string;
  isLoading?: boolean;
  currentUser: User | null;
  onViewLead: (lead: Lead) => void;
  onDeleteLead: (lead: Lead) => void;
  onTransferLead: (lead: Lead) => void;
  allUsers: User[];
}

const LEADS_PER_PAGE = 20;

export function PipelineKanbanColumn({
  id,
  title,
  icon: Icon,
  leads,
  headerBgClass,
  headerTextClass = "text-white",
  headerIconClass = "text-white",
  isLoading = false,
  currentUser,
  onViewLead,
  onDeleteLead,
  onTransferLead,
  allUsers,
}: PipelineKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [visibleCount, setVisibleCount] = useState(LEADS_PER_PAGE);

  // Reset visible count when the underlying leads array changes (e.g., due to filtering)
  useEffect(() => {
    setVisibleCount(LEADS_PER_PAGE);
  }, [leads]);

  const handleLoadMore = () => {
    setVisibleCount(prevCount => prevCount + LEADS_PER_PAGE);
  };

  const visibleLeads = useMemo(() => leads.slice(0, visibleCount), [leads, visibleCount]);
  const hasMoreLeads = visibleCount < leads.length;

  const { ref: observerRef, inView } = useInView({
    threshold: 0.1,
  });

  useEffect(() => {
    if (inView && hasMoreLeads) {
      handleLoadMore();
    }
  }, [inView, hasMoreLeads]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-[280px] sm:w-[300px] shrink-0 flex flex-col bg-muted/30 rounded-lg overflow-hidden transition-all duration-200 ease-in-out h-full",
        isOver ? 'border-primary ring-2 ring-primary shadow-xl scale-[1.01]' : 'border-border/30 shadow-sm'
      )}
    >
      <div className={cn(
        `px-3 py-2.5 flex items-center justify-between rounded-t-lg shrink-0 sticky top-0 z-10`,
        headerBgClass,
        headerTextClass
      )}>
        <div className="flex items-center">
          <Icon className={cn(`mr-2 h-4 w-4`, headerIconClass)} />
          <h2 className="font-semibold text-sm tracking-wide">{title}</h2>
        </div>
        <span className="text-xs px-2 py-0.5 bg-black/20 rounded-full">{isLoading ? <Skeleton className="h-4 w-4 inline-block" /> : leads.length}</span>
      </div>
      <ScrollArea className="flex-1 bg-background/10 custom-scrollbar">
        <div className="space-y-3 p-3">
          {isLoading && leads.length === 0 ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-md" />
              <Skeleton className="h-20 w-full rounded-md" />
              <Skeleton className="h-20 w-full rounded-md" />
            </div>
          ) : visibleLeads.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-xs text-muted-foreground text-center italic">No leads in this category.</p>
            </div>
          ) : (
            <AnimatePresence>
              {visibleLeads.map((lead, index) => (
                <motion.div
                  key={lead.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, delay: (index % LEADS_PER_PAGE) * 0.03 }}
                >
                  <LeadCard
                    lead={lead}
                    currentUser={currentUser}
                    onViewLead={onViewLead}
                    onDeleteLead={onDeleteLead}
                    onTransferLead={onTransferLead}
                    allUsers={allUsers}
                    headerBgClass={headerBgClass}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {hasMoreLeads && (
            <div ref={observerRef} className="flex justify-center p-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
