
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Lead, User, LeadStatusType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { DndContext, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { closestCorners } from '@dnd-kit/core';
import { getLeads, updateLeadAction } from './actions';
import { getUsers } from '@/lib/user-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Search, FileSpreadsheet, UploadCloud, Download, Bot, UserCheck, MessageSquare, PhoneCall, Briefcase } from 'lucide-react';
import { PipelineKanbanColumn } from '@/components/pipeline/PipelineKanbanColumn';
import { LeadCard } from '@/components/pipeline/LeadCard';

const AddEditLeadDialog = dynamic(() => import('@/components/pipeline/AddEditLeadDialog').then(mod => mod.AddEditLeadDialog));
const ImportLeadsDialog = dynamic(() => import('@/components/pipeline/ImportLeadsDialog').then(mod => mod.ImportLeadsDialog));

const KANBAN_COLUMNS_CONFIG: Array<{ title: string; status: LeadStatusType; icon: React.ElementType; headerBgClass: string }> = [
  { title: 'New Lead', status: 'New Lead', icon: Bot, headerBgClass: 'bg-sky-600' },
  { title: 'Contacted', status: 'Contacted', icon: PhoneCall, headerBgClass: 'bg-blue-600' },
  { title: 'Qualified', status: 'Qualified', icon: UserCheck, headerBgClass: 'bg-purple-600' },
  { title: 'Proposal', status: 'Proposal', icon: MessageSquare, headerBgClass: 'bg-orange-600' },
  { title: 'Closed', status: 'Closed', icon: Briefcase, headerBgClass: 'bg-green-600' },
];

export default function PipeLinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  const [allCrmUsers, setAllCrmUsers] = useState<User[]>([]);
  const [selectedCrmId, setSelectedCrmId] = useState<string>('all');
  
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const [isImportOpen, setIsImportOpen] = useState(false);
  
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const fetchLeadsAndUsers = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const promises: [Promise<Lead[]>, Promise<User[]>?] = [getLeads()];
      if (currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN') {
        promises.push(getUsers());
      }
      const [fetchedLeads, fetchedUsers] = await Promise.all(promises);
      setLeads(fetchedLeads);
      if (fetchedUsers) {
        setAllCrmUsers(fetchedUsers.filter(u => u.role === 'CRM'));
      }
    } catch (error) {
      toast({ title: "Error fetching data", description: "Could not load pipeline or user data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentUser]);

  useEffect(() => {
    fetchLeadsAndUsers();
  }, [fetchLeadsAndUsers]);

  const filteredLeads = useMemo(() => {
    let baseLeads = leads;
    if (currentUser?.role === 'CRM') {
      baseLeads = leads.filter(lead => lead.crmId === currentUser.id);
    } else if (selectedCrmId !== 'all') {
      baseLeads = leads.filter(lead => lead.crmId === selectedCrmId);
    }
    
    if (!searchTerm) return baseLeads;
    const lowercasedFilter = searchTerm.toLowerCase();
    return baseLeads.filter(lead =>
        lead.contactName.toLowerCase().includes(lowercasedFilter) ||
        lead.businessName.toLowerCase().includes(lowercasedFilter) ||
        lead.phone.toLowerCase().includes(lowercasedFilter) ||
        lead.source.toLowerCase().includes(lowercasedFilter) ||
        (lead.crmName && lead.crmName.toLowerCase().includes(lowercasedFilter))
    );
  }, [leads, searchTerm, currentUser, selectedCrmId]);

  const leadsByStatus = useMemo(() => {
    const grouped: Record<LeadStatusType, Lead[]> = {
      'New Lead': [], 'Contacted': [], 'Qualified': [], 'Proposal': [], 'Closed': []
    };
    filteredLeads.forEach(lead => {
      const status = lead.status || 'New Lead';
      if (grouped[status]) {
        grouped[status].push(lead);
      } else {
        grouped['New Lead'].push(lead);
      }
    });
    return grouped;
  }, [filteredLeads]);

  const handleOpenAddDialog = () => {
    setEditingLead(null);
    setIsAddEditOpen(true);
  };
  
  const handleLeadSaved = () => {
    setIsAddEditOpen(false);
    setEditingLead(null);
    fetchLeadsAndUsers();
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveLead(event.active.data.current?.lead as Lead);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;

    if (!over || !active.data.current?.lead) return;
    
    const lead = active.data.current.lead as Lead;
    const newStatus = over.id as LeadStatusType;
    const originalStatus = lead.status || 'New Lead';

    if (newStatus === originalStatus) return;

    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: newStatus } : l));

    const result = await updateLeadAction(lead.id, { status: newStatus });
    if (!result.success) {
      toast({ title: "Update Failed", description: result.error || "Could not update lead status.", variant: "destructive" });
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: originalStatus } : l));
    } else {
      toast({ title: "Lead Updated", description: `Lead "${lead.contactName}" moved to ${newStatus}.` });
    }
  };

  if (!currentUser) return null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
      <div className="flex flex-col h-full p-1 sm:p-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
          <div>
            <h1 className="page-title">Sales Pipeline</h1>
            <p className="page-description">Track and manage potential sales leads and opportunities.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 px-4 sm:px-0">
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-card border-border/50 focus:border-primary"
          />
           {(currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN') && (
            <Select value={selectedCrmId} onValueChange={setSelectedCrmId}>
              <SelectTrigger className="bg-card border-border/50 focus:border-primary">
                <SelectValue placeholder="Filter by CRM..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All CRMs</SelectItem>
                {allCrmUsers.map(crm => <SelectItem key={crm.id} value={crm.id}>{crm.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
           <div className="flex items-center gap-2">
             <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-10"
              onClick={() => setIsImportOpen(true)}
             >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Import
            </Button>
            <Button
              size="lg"
              onClick={handleOpenAddDialog}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground h-10"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Add Lead
            </Button>
           </div>
        </div>

        <div className="flex-1 mt-4 overflow-x-auto pb-4">
          <div className="flex space-x-4 h-full min-w-max px-4 sm:px-0">
            {KANBAN_COLUMNS_CONFIG.map((col) => (
              <PipelineKanbanColumn
                key={col.status}
                id={col.status}
                title={col.title}
                icon={col.icon}
                leads={leadsByStatus[col.status] || []}
                headerBgClass={col.headerBgClass}
                isLoading={isLoading}
                currentUser={currentUser}
                onEditLead={(lead) => { setEditingLead(lead); setIsAddEditOpen(true); }}
              />
            ))}
          </div>
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeLead ? <LeadCard lead={activeLead} isOverlay currentUser={currentUser} onEditLead={() => {}} /> : null}
      </DragOverlay>

      <AddEditLeadDialog
        isOpen={isAddEditOpen}
        onOpenChange={setIsAddEditOpen}
        onLeadSaved={handleLeadSaved}
        lead={editingLead}
        currentUser={currentUser}
      />
      
      <ImportLeadsDialog
        isOpen={isImportOpen}
        onOpenChange={setIsImportOpen}
        onLeadsImported={handleLeadSaved}
        currentUser={currentUser}
      />
    </DndContext>
  );
}
