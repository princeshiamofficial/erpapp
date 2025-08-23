

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Lead, User, LeadCategory, LeadStatusType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { DndContext, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { closestCorners } from '@dnd-kit/core';
import { getLeads, updateLeadAction, deleteLeadAction } from '@/app/(app)/pipeline/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Search, FileSpreadsheet, UploadCloud, Download, Bot, ShoppingCart, PhoneCall, Briefcase, Users, User as UserIcon, BaggageClaim, AlertTriangle, Loader2, ChevronDown, Check, ChevronsUpDown, LayoutGrid, List, Calendar as CalendarIcon, Eye } from 'lucide-react';
import { PipelineKanbanColumn } from '@/components/pipeline/PipelineKanbanColumn';
import { LeadListView } from '@/components/pipeline/LeadListView'; 
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Papa from 'papaparse';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";
import { Skeleton } from '@/components/ui/skeleton';
import { DateRangePicker, type PredefinedRange } from '@/components/dashboard/date-range-picker';
import type { DateRange } from "react-day-picker";
import { isWithinInterval, parseISO, subDays, startOfDay, endOfDay } from 'date-fns';
import { LeadCalendarView } from './LeadCalendarView';
import { ViewLeadDialog } from './ViewLeadDialog';

const LeadCard = dynamic(() => import('@/components/pipeline/LeadCard').then(mod => mod.LeadCard), {
  ssr: false,
});
const AddEditLeadDialog = dynamic(() => import('@/components/pipeline/AddEditLeadDialog').then(mod => mod.AddEditLeadDialog));
const ImportLeadsDialog = dynamic(() => import('@/components/pipeline/ImportLeadsDialog').then(mod => mod.ImportLeadsDialog));
const TransferLeadDialog = dynamic(() => import('@/components/pipeline/TransferLeadDialog').then(mod => mod.TransferLeadDialog));


const KANBAN_COLUMNS_CONFIG: Array<{ title: string; category: LeadCategory; icon: React.ElementType; headerBgClass: string }> = [
  { title: 'POP', category: 'POP', icon: UserIcon, headerBgClass: 'bg-sky-600' },
  { title: 'POG', category: 'POG', icon: Users, headerBgClass: 'bg-blue-600' },
  { title: 'OC', category: 'OC', icon: BaggageClaim, headerBgClass: 'bg-purple-600' },
  { title: 'OD', category: 'OD', icon: Briefcase, headerBgClass: 'bg-green-600' },
  { title: 'ROD', category: 'ROD', icon: ShoppingCart, headerBgClass: 'bg-orange-600' },
];

const ITEMS_PER_PAGE = 12;

const LEAD_CATEGORIES: LeadCategory[] = ['POP', 'POG', 'OC', 'OD', 'ROD'];

interface PipelineClientProps {
  initialLeads: Lead[];
  allUsers: User[];
}

export function PipelineClient({ initialLeads, allUsers }: PipelineClientProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  const [allCrmUsers, setAllCrmUsers] = useState<User[]>([]);
  const [selectedCrmId, setSelectedCrmId] = useState<string>('all');
  const [isCrmFilterOpen, setIsCrmFilterOpen] = useState(false);
  const [crmSearchQuery, setCrmSearchQuery] = useState("");
  
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const [isImportOpen, setIsImportOpen] = useState(false);
  
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeletingLead, setIsDeletingLead] = useState(false);

  const [leadToTransfer, setLeadToTransfer] = useState<Lead | null>(null);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);

  const [leadToView, setLeadToView] = useState<Lead | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const fetchLeadsAndUsers = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const fetchedLeads = await getLeads();
      setLeads(fetchedLeads);
    } catch (error) {
      toast({ title: "Error fetching data", description: "Could not load pipeline or user data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, currentUser]);

  useEffect(() => {
    setAllCrmUsers(allUsers.filter(u => u.role === 'CRM' || u.role === 'ADMIN' || u.role === 'SYSTEM_ADMIN'));
  }, [allUsers]);

  const filteredLeads = useMemo(() => {
    let baseLeads = leads;

    if (currentUser?.role === 'CRM') {
      baseLeads = leads.filter(lead => lead.crmId === currentUser.id);
    } else if (selectedCrmId !== 'all') {
      baseLeads = leads.filter(lead => lead.crmId === selectedCrmId);
    }
    
    // Date filter
    if (selectedDateRange?.from && viewMode !== 'calendar') { // Calendar view handles its own date range
      const startDate = startOfDay(selectedDateRange.from);
      const endDate = endOfDay(selectedDateRange.to || selectedDateRange.from);
      baseLeads = baseLeads.filter(lead => {
        try {
          const leadDate = parseISO(lead.date);
          return isWithinInterval(leadDate, { start: startDate, end: endDate });
        } catch {
          return false;
        }
      });
    }

    // Category filter (only for list view)
    if (viewMode === 'list' && categoryFilter !== 'all') {
      baseLeads = baseLeads.filter(lead => lead.category === categoryFilter);
    }

    // Search term filter
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      baseLeads = baseLeads.filter(lead =>
          lead.contactName.toLowerCase().includes(lowercasedFilter) ||
          lead.businessName.toLowerCase().includes(lowercasedFilter) ||
          lead.phone.toLowerCase().includes(lowercasedFilter) ||
          lead.source.toLowerCase().includes(lowercasedFilter) ||
          (lead.crmName && lead.crmName.toLowerCase().includes(lowercasedFilter))
      );
    }

    return baseLeads;
  }, [leads, searchTerm, currentUser, selectedCrmId, selectedDateRange, categoryFilter, viewMode]);
  
  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);

  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLeads.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredLeads, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCrmId, viewMode, selectedDateRange, categoryFilter]);
  
  const selectedCrmName = useMemo(() => {
    if (selectedCrmId === 'all') return 'All CRMs';
    return allCrmUsers.find(u => u.id === selectedCrmId)?.name || 'Filter by CRM...';
  }, [selectedCrmId, allCrmUsers]);
  
  const filteredCrmUsersForDropdown = useMemo(() => {
    if (!crmSearchQuery) return allCrmUsers;
    return allCrmUsers.filter(user =>
      user.name.toLowerCase().includes(crmSearchQuery.toLowerCase())
    );
  }, [allCrmUsers, crmSearchQuery]);

  const leadsByCategory = useMemo(() => {
    const grouped: Record<LeadCategory, Lead[]> = {
      'POP': [], 'POG': [], 'OC': [], 'OD': [], 'ROD': []
    };
    filteredLeads.forEach(lead => {
      if (grouped[lead.category]) {
        grouped[lead.category].push(lead);
      }
    });
    return grouped;
  }, [filteredLeads]);

  const handleOpenAddDialog = () => {
    setEditingLead(null);
    setIsAddEditOpen(true);
  };
  
  const handleLeadSaved = (newLead?: Lead) => {
    setIsAddEditOpen(false);
    setEditingLead(null);
    if (newLead) {
        setLeads(prevLeads => [newLead, ...prevLeads]);
    } else {
        fetchLeadsAndUsers(); // Fallback to refetch if new lead data isn't returned (e.g., on edit)
    }
  };

  const handleLeadUpdatedFromView = () => {
    fetchLeadsAndUsers(); // Re-fetch to get latest data
  };
  
  const handleDeleteRequest = (lead: Lead) => {
    setLeadToDelete(lead);
  };
  
  const handleTransferRequest = (lead: Lead) => {
    setLeadToTransfer(lead);
    setIsTransferDialogOpen(true);
  };

  const handleLeadTransferred = () => {
    setIsTransferDialogOpen(false);
    setLeadToTransfer(null);
    fetchLeadsAndUsers();
  }

  const handleConfirmDelete = async () => {
    if (!leadToDelete) return;
    setIsDeletingLead(true);
    const result = await deleteLeadAction(leadToDelete.id);
    setIsDeletingLead(false);
    if (result.success) {
      toast({ title: "Lead Deleted", description: `Lead for "${leadToDelete.contactName}" was deleted.` });
      setLeads(prev => prev.filter(l => l.id !== leadToDelete.id));
    } else {
      toast({ title: "Error", description: result.error || "Could not delete the lead.", variant: "destructive" });
    }
    setLeadToDelete(null);
  };

  const handleUpdateLeadCategory = async (lead: Lead, newCategory: LeadCategory) => {
    const originalCategory = lead.category;
    if (newCategory === originalCategory) return;
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, category: newCategory } : l));
    const result = await updateLeadAction(lead.id, { category: newCategory });
    if (!result.success) {
      toast({ title: "Update Failed", description: result.error || "Could not update lead category.", variant: "destructive" });
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, category: originalCategory } : l));
    } else {
      toast({ title: "Lead Updated", description: `Lead "${lead.contactName}" moved to ${newCategory}.` });
    }
  };
  
  const handleExport = () => {
    if (filteredLeads.length === 0) {
      toast({ title: "No Data to Export", description: "There is no data matching the current filters." });
      return;
    }
    const dataToExport = filteredLeads.map(lead => ({
      date: lead.date, contactName: lead.contactName, businessName: lead.businessName, phone: lead.phone,
      source: lead.source, address: lead.address, category: lead.category, status: lead.status,
      notes: lead.notes, schedule: lead.schedule, crmName: lead.crmName
    }));
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'pipeline_leads_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Successful", description: "Lead data has been downloaded as a CSV file." });
  };

  const handleDragStart = (event: DragStartEvent) => { setActiveLead(event.active.data.current?.lead as Lead); };
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;
    if (!over || !active.data.current?.lead) return;
    const lead = active.data.current.lead as Lead;
    const newCategory = over.id as LeadCategory;
    await handleUpdateLeadCategory(lead, newCategory);
  };
  const handleDragCancel = () => { setActiveLead(null); };
  
  const renderPagination = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5; 
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      let startPage = Math.max(1, currentPage - 2); let endPage = Math.min(totalPages, currentPage + 2);
      if (currentPage < 3) endPage = maxPagesToShow; else if (currentPage > totalPages - 2) startPage = totalPages - maxPagesToShow + 1;
      if (startPage > 1) { pageNumbers.push(1); if (startPage > 2) pageNumbers.push('...'); }
      for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
      if (endPage < totalPages) { if (endPage < totalPages - 1) pageNumbers.push('...'); pageNumbers.push(totalPages); }
    }
    return pageNumbers.map((page, index) => (
        <PaginationItem key={index}>
        {page === '...' ? <PaginationEllipsis />
        : <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(page as number);}} className={cn(currentPage === page && 'bg-primary text-primary-foreground hover:bg-primary/90')}>
            {page}
          </PaginationLink>
        }
        </PaginationItem>
    ));
  };

  const handleDateRangeChange = (range: DateRange | undefined, displayLabel: string, predefinedValue: PredefinedRange | "custom" | null) => {
    setSelectedDateRange(range);
  };

  const openViewDialog = (lead: Lead) => {
    setLeadToView(lead);
    setIsViewDialogOpen(true);
  };
  
  const openEditDialogFromView = (lead: Lead) => {
    setIsViewDialogOpen(false);
    setLeadToView(null);
    setEditingLead(lead);
    setIsAddEditOpen(true);
  };


  if (!currentUser) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel} collisionDetection={closestCorners}>
      <div className="flex flex-col h-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header px-4 sm:px-0">
          <div><h1 className="page-title">Sales Pipeline</h1><p className="page-description">Track and manage potential sales leads and opportunities by category.</p></div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 mb-4 px-4 sm:px-0">
          <Input placeholder="Search leads..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-card border-border/50 focus:border-primary lg:max-w-xs" />
          <div className="flex-grow flex flex-col sm:flex-row items-center gap-2">
            {(currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN') && (
              <Popover open={isCrmFilterOpen} onOpenChange={setIsCrmFilterOpen}><PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={isCrmFilterOpen} className="w-full sm:w-auto justify-between bg-card border-border/50 focus:border-primary h-10"><span className="truncate">{selectedCrmName}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button>
              </PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width)] p-0"><Command><CommandInput placeholder="Search CRM..." value={crmSearchQuery} onValueChange={setCrmSearchQuery} />
                <CommandList><CommandEmpty>No CRM found.</CommandEmpty><CommandGroup>
                  <CommandItem value="all" onSelect={() => { setSelectedCrmId('all'); setIsCrmFilterOpen(false); }}><Check className={cn("mr-2 h-4 w-4", selectedCrmId === 'all' ? "opacity-100" : "opacity-0")} />All CRMs</CommandItem>
                  {filteredCrmUsersForDropdown.map(crm => (<CommandItem key={crm.id} value={crm.name} onSelect={() => { setSelectedCrmId(crm.id); setIsCrmFilterOpen(false); }}><Check className={cn("mr-2 h-4 w-4", crm.id === selectedCrmId ? "opacity-100" : "opacity-0")} />{crm.name}</CommandItem>))}
                </CommandGroup></CommandList></Command></PopoverContent>
              </Popover>
            )}
            {viewMode !== 'calendar' && (
              <DateRangePicker initialRange={selectedDateRange} onDateRangeChange={handleDateRangeChange} />
            )}
            {viewMode === 'list' && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px] bg-card border-border/50 focus:border-primary h-10"><SelectValue placeholder="Filter by category..." /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Categories</SelectItem>{LEAD_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <div className="flex items-center bg-muted p-1 rounded-md ml-auto">
              <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="h-8"><List className="h-4 w-4" /></Button>
              <Button variant={viewMode === 'kanban' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')} className="h-8"><LayoutGrid className="h-4 w-4" /></Button>
              <Button variant={viewMode === 'calendar' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('calendar')} className="h-8"><CalendarIcon className="h-4 w-4" /></Button>
            </div>
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto h-10">Actions <ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setIsImportOpen(true)}><FileSpreadsheet className="mr-2 h-4 w-4" />Import Leads</DropdownMenuItem>
                <DropdownMenuItem onSelect={handleExport} disabled={filteredLeads.length === 0}><Download className="mr-2 h-4 w-4" />Export Leads</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleOpenAddDialog} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground h-10"><PlusCircle className="mr-2 h-5 w-5" />Add Lead</Button>
          </div>
        </div>

        {viewMode === 'kanban' ? (
          <div className="flex-1 mt-4 overflow-x-auto pb-4"><div className="flex space-x-4 h-full min-w-max px-4 sm:px-0">
            {KANBAN_COLUMNS_CONFIG.map((col) => (
              <PipelineKanbanColumn
                key={col.category} id={col.category} title={col.title} icon={col.icon}
                leads={leadsByCategory[col.category] || []} headerBgClass={col.headerBgClass}
                isLoading={isLoading} currentUser={currentUser}
                onViewLead={openViewDialog} onDeleteLead={handleDeleteRequest} onTransferLead={handleTransferRequest} allCrmUsers={allCrmUsers}
              />
            ))}
          </div></div>
        ) : viewMode === 'list' ? (
          <>
            <LeadListView
               leads={paginatedLeads} isLoading={isLoading} currentUser={currentUser}
               onViewLead={openViewDialog} onDeleteLead={handleDeleteRequest} onTransferLead={handleTransferRequest}
               onUpdateLeadCategory={handleUpdateLeadCategory} allCrmUsers={allCrmUsers}
            />
            {totalPages > 1 && (
              <div className="mt-4 flex justify-center"><Pagination><PaginationContent>
                <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }} aria-disabled={currentPage === 1} className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}/></PaginationItem>
                {renderPagination()}
                <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }} aria-disabled={currentPage === totalPages} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}/></PaginationItem>
              </PaginationContent></Pagination></div>
            )}
          </>
        ) : (
          <div className="flex-1 mt-4 flex flex-col">
            <LeadCalendarView 
              leads={filteredLeads} 
              onViewLead={openViewDialog}
            />
          </div>
        )}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeLead ? <LeadCard lead={activeLead} isOverlay currentUser={currentUser} onViewLead={() => {}} onDeleteLead={() => {}} onTransferLead={() => {}} crmAvatarUrl={allCrmUsers.find(u => u.id === activeLead.crmId)?.avatarUrl} headerBgClass={KANBAN_COLUMNS_CONFIG.find(c => c.category === activeLead.category)?.headerBgClass || 'bg-gray-500'} /> : null}
      </DragOverlay>

      <AddEditLeadDialog isOpen={isAddEditOpen} onOpenChange={setIsAddEditOpen} onLeadSaved={handleLeadSaved} lead={editingLead} currentUser={currentUser} />
      <ImportLeadsDialog isOpen={isImportOpen} onOpenChange={setIsImportOpen} onLeadsImported={handleLeadSaved} currentUser={currentUser} />
      {leadToTransfer && (<TransferLeadDialog isOpen={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen} onLeadTransferred={handleLeadTransferred} lead={leadToTransfer} allCrmUsers={allCrmUsers.filter(u => u.id !== leadToTransfer.crmId)} currentUser={currentUser}/>)}
      {leadToView && (<ViewLeadDialog isOpen={isViewDialogOpen} onOpenChange={setIsViewDialogOpen} onLeadUpdated={handleLeadUpdatedFromView} onEditRequest={openEditDialogFromView} lead={leadToView} currentUser={currentUser} />)}
      {leadToDelete && (
        <AlertDialog open={!!leadToDelete} onOpenChange={() => setLeadToDelete(null)}>
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-destructive" /> Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the lead for "<span className="font-semibold">{leadToDelete.contactName}</span>".</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel disabled={isDeletingLead}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={handleConfirmDelete} disabled={isDeletingLead}>{isDeletingLead ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Yes, delete lead"}</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </DndContext>
  );
}
