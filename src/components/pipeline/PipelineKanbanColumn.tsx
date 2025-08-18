
"use client";

import dynamic from 'next/dynamic';
import type { Lead, User } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LucideIcon } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

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
  isLoading?: boolean;
  currentUser: User | null;
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (lead: Lead) => void;
  onTransferLead: (lead: Lead) => void; // New prop for transfer
  allCrmUsers: User[];
}

export function PipelineKanbanColumn({
  id,
  title,
  icon: Icon,
  leads,
  headerBgClass,
  isLoading = false,
  currentUser,
  onEditLead,
  onDeleteLead,
  onTransferLead, // New prop
  allCrmUsers,
}: PipelineKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-[280px] sm:w-[300px] shrink-0 flex flex-col bg-muted/30 rounded-lg overflow-hidden transition-all duration-200 ease-in-out h-full",
        isOver ? 'border-primary ring-2 ring-primary shadow-xl scale-[1.01]' : 'border-border/30 shadow-sm'
      )}
    >
      <div className={`px-3 py-2.5 flex items-center justify-between ${headerBgClass} text-white rounded-t-lg shrink-0`}>
        <div className="flex items-center">
          <Icon className="mr-2 h-4 w-4" />
          <h2 className="font-semibold text-sm tracking-wide">{title}</h2>
        </div>
        <span className="text-xs px-2 py-0.5 bg-black/20 rounded-full">{isLoading ? <Skeleton className="h-4 w-4 inline-block" /> : leads.length}</span>
      </div>
      <ScrollArea className="flex-1 bg-background/10 custom-scrollbar">
        <div className="space-y-3 p-3">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-md" />
              <Skeleton className="h-20 w-full rounded-md" />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-xs text-muted-foreground text-center italic">No leads in this category.</p>
            </div>
          ) : (
            leads.map(lead => {
              const crmUser = allCrmUsers.find(u => u.id === lead.crmId);
              return (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  currentUser={currentUser}
                  onEditLead={onEditLead}
                  onDeleteLead={onDeleteLead}
                  onTransferLead={onTransferLead}
                  crmAvatarUrl={crmUser?.avatarUrl || undefined}
                  headerBgClass={headerBgClass}
                />
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
