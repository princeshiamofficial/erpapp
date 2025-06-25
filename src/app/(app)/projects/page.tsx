
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Project, ProjectStatusType, CustomStatus, User, TrackingLink } from '@/types'; 
import { getProjects } from '@/lib/project-service';
import { getStatuses, ORDER_SUBMITTED_ID, READY_FOR_DESIGN_STATUS_ID } from '@/lib/status-service'; 
import { KanbanColumn } from '@/components/projects/KanbanColumn';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, ClipboardCheck, ClipboardX, DraftingCompass, PauseCircle, Truck, CheckCircle, RefreshCw, PackageCheck } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, isSameWeek, isSameMonth, isSameYear } from 'date-fns';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent, 
  type DragCancelEvent, 
  closestCorners,
  DragOverlay, 
} from '@dnd-kit/core';
import { updateProjectStatusAction } from './actions';
import { useToast } from '@/hooks/use-toast';
import { ProjectCard } from '@/components/projects/ProjectCard'; 
import { useAuth } from '@/contexts/auth-context';
import dynamic from 'next/dynamic'; 

const AssignDrDialog = dynamic(() => import('@/components/orders/assign-dr-dialog').then(mod => mod.AssignDrDialog));


const KANBAN_COLUMNS_CONFIG: Array<{ title: string; status: ProjectStatusType; icon: React.ElementType; headerBgClass: string; headerIconClass?: string; headerTextClass?: string }> = [
  { title: 'CR Clearance', status: 'CR Clearance', icon: ClipboardCheck, headerBgClass: 'bg-sky-600', headerTextClass: 'text-sky-50' },
  { title: 'Cancel', status: 'Cancel', icon: ClipboardX, headerBgClass: 'bg-red-600', headerTextClass: 'text-red-50' },
  { title: 'On Design', status: 'On Design', icon: DraftingCompass, headerBgClass: 'bg-purple-600', headerTextClass: 'text-purple-50' },
  { title: 'On Hold', status: 'On Hold', icon: PauseCircle, headerBgClass: 'bg-yellow-500', headerTextClass: 'text-yellow-950' },
  { title: 'Logistics', status: 'Logistics', icon: Truck, headerBgClass: 'bg-orange-600', headerTextClass: 'text-orange-50' },
  { title: 'Courier', status: 'Courier', icon: CheckCircle, headerBgClass: 'bg-green-600', headerTextClass: 'text-green-50' },
  { title: 'Delivered', status: 'Delivered', icon: PackageCheck, headerBgClass: 'bg-emerald-600', headerTextClass: 'text-emerald-50' },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [endDateFilter, setEndDateFilter] = useState<string>('all');
  const { toast } = useToast();
  const [activeProject, setActiveProject] = useState<Project | null>(null); 
  const { currentUser } = useAuth();

  const [selectedOrderForDrAssignment, setSelectedOrderForDrAssignment] = useState<TrackingLink | null>(null); 
  const [isAssignDrDialogOpen, setIsAssignDrDialogOpen] = useState(false); 

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedProjects, fetchedStatuses] = await Promise.all([ 
        getProjects(),
        getStatuses()
      ]);
      setProjects(fetchedProjects);
      setAllStatuses(fetchedStatuses); 
    } catch (error) {
      console.error("Failed to fetch projects or statuses:", error);
      toast({ title: "Error", description: "Could not load projects or status configurations.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearchTerm = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.projectIdDisplay.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.assigneeName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || project.categoryTag === categoryFilter;

      let matchesEndDate = true;
      if (endDateFilter !== 'all' && project.endDate) {
        try {
          const projectEndDate = parseISO(project.endDate);
          const now = new Date();
          if (endDateFilter === 'this_week') {
            matchesEndDate = isSameWeek(projectEndDate, now, { weekStartsOn: 1 });
          } else if (endDateFilter === 'this_month') {
            matchesEndDate = isSameMonth(projectEndDate, now);
          } else if (endDateFilter === 'this_year') {
            matchesEndDate = isSameYear(projectEndDate, now);
          }
        } catch (e) {
          console.warn("Error parsing project end date:", project.endDate, e);
          matchesEndDate = false;
        }
      }
      return matchesSearchTerm && matchesCategory && matchesEndDate;
    });
  }, [projects, searchTerm, categoryFilter, endDateFilter]);

  const projectsByStatus = useMemo(() => {
    const grouped: Record<ProjectStatusType, Project[]> = {
      'CR Clearance': [], 'Cancel': [], 'On Design': [],
      'On Hold': [], 'Logistics': [], 'Courier': [], 'Delivered': [],
    };
    filteredProjects.forEach(project => {
      if (grouped[project.status]) {
        grouped[project.status].push(project);
      }
    });
    return grouped;
  }, [filteredProjects]);

  const categoryOptions = useMemo(() => {
    const categories = new Set(projects.map(p => p.categoryTag).filter(Boolean));
    return Array.from(categories).sort();
  }, [projects]);

  const endDateOptions = [
    { label: 'All Dates', value: 'all' },
    { label: 'This Week', value: 'this_week' },
    { label: 'This Month', value: 'this_month' },
    { label: 'This Year', value: 'this_year' },
  ];

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.project) {
      setActiveProject(active.data.current.project as Project);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveProject(null); 
    const { active, over } = event;

    if (!currentUser) {
      toast({ title: "Authentication Error", description: "Cannot update project, user not authenticated.", variant: "destructive" });
      return;
    }

    if (!over || !active.data.current?.project) {
      return;
    }

    const project = active.data.current.project as Project;
    const newStatus = over.id as ProjectStatusType;
    const originalStatus = project.status;

    if (newStatus === originalStatus) {
      return;
    }

    setProjects(prevProjects => {
      return prevProjects.map(p =>
        p.id === project.id ? { ...p, status: newStatus } : p
      );
    });

    const result = await updateProjectStatusAction(project, newStatus, currentUser);

    if (result.success) {
      toast({ title: "Project Updated", description: `Project '${project.name}' status changed to ${newStatus}.` });
      await fetchData(); 
    } else {
      toast({ title: "Update Failed", description: result.error || `Could not update status for project '${project.name}'.`, variant: "destructive" });
      setProjects(prevProjects => {
        return prevProjects.map(p =>
          p.id === project.id ? { ...p, status: originalStatus } : p
        );
      });
    }
  };
  
  const handleDragCancel = () => {
    setActiveProject(null);
  };

  const handleOpenAssignDrDialog = useCallback(async (projectToAssign: Project) => {
    console.log("[ProjectsPage] handleOpenAssignDrDialog called for project:", projectToAssign.id);
    if (!currentUser) {
        toast({ title: "Error", description: "User not authenticated. Cannot assign DR.", variant: "destructive" });
        console.error("[ProjectsPage] currentUser is null in handleOpenAssignDrDialog");
        return;
    }

    const projectShim: TrackingLink = {
        id: projectToAssign.id,
        companyName: projectToAssign.name,
        currentStatus: projectToAssign.status as string,
        designerRepresentativeId: projectToAssign.designerRepresentativeId || null,
        designerRepresentativeName: projectToAssign.designerRepresentativeName || null,
        address: '',
        phoneNumber: '',
        orderItems: [],
        crmUserId: projectToAssign.assigneeName,
        crmUserName: projectToAssign.assigneeName,
        createdAt: projectToAssign.createdAt || new Date().toISOString(),
        isPublic: false,
        statusHistory: [],
        comments: [],
        advancePayments: [],
    };
    setSelectedOrderForDrAssignment(projectShim);

    let effectiveStatuses = allStatuses;
    if (!effectiveStatuses || effectiveStatuses.length === 0) {
        console.warn("[ProjectsPage] allStatuses is empty in handleOpenAssignDrDialog. Attempting to fetch fresh statuses...");
        try {
            effectiveStatuses = await getStatuses();
            if (!effectiveStatuses || effectiveStatuses.length === 0) {
                console.error("[ProjectsPage] Freshly fetched allStatuses is still empty. Aborting DR assignment.");
                toast({ title: "Data Error", description: "Status configuration is not loaded. Please refresh the page or try again.", variant: "destructive" });
                setSelectedOrderForDrAssignment(null); // Clear selection if data fails
                return;
            }
            setAllStatuses(effectiveStatuses); // Update state, will trigger re-render
            console.log("[ProjectsPage] Successfully fetched fresh statuses. Count:", effectiveStatuses.length);
        } catch (fetchErr) {
            console.error("[ProjectsPage] Error fetching fresh statuses:", fetchErr);
            toast({ title: "Data Error", description: "Failed to load status configuration. Please refresh or try again.", variant: "destructive" });
            setSelectedOrderForDrAssignment(null); // Clear selection
            return;
        }
    }
    
    console.log("[ProjectsPage] Using allStatuses (count):", effectiveStatuses.length, "IDs:", effectiveStatuses.map(s => s.id).join(', '));

    const rfdCheck = effectiveStatuses.find(s => s.id === READY_FOR_DESIGN_STATUS_ID);
    if (!rfdCheck) {
        console.error("[ProjectsPage] CRITICAL - 'ready-for-design' status (ID: 'ready-for-design') NOT FOUND in effectiveStatuses.");
        toast({
            title: "Configuration Error",
            description: `The required system status '${READY_FOR_DESIGN_STATUS_ID}' (typically 'Ready for Design') is missing. Please ensure it's configured. Assignment not possible.`,
            variant: "destructive",
            duration: 10000,
        });
        setSelectedOrderForDrAssignment(null); // Clear selection
        return;
    }
    console.log("[ProjectsPage] 'ready-for-design' status check PASSED.");
    
    setIsAssignDrDialogOpen(true);
    console.log("[ProjectsPage] Dialog state set to open for order/project:", projectShim.id);

  }, [toast, allStatuses, currentUser, setAllStatuses]);


  const handleDrAssignmentSuccess = useCallback(async (updatedOrderFromDialog: TrackingLink) => {
    await fetchData(); 
    toast({ title: "DR Assigned", description: `${updatedOrderFromDialog.designerRepresentativeName} assigned to order ${updatedOrderFromDialog.id}.` });
  }, [fetchData, toast]);


  if (isLoading && projects.length === 0) {
    return (
      <div className="flex flex-col h-full p-0 sm:p-6 lg:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header pb-2 px-4 sm:px-0">
             <div className="flex items-baseline gap-2">
                <Briefcase className="h-7 w-7 text-primary"/>
                <h1 className="page-title text-2xl sm:text-3xl">Projects Kanban</h1>
            </div>
             <Skeleton className="h-10 w-10 rounded-md" /> 
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4 sm:px-0">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex space-x-4 min-w-max px-4 sm:px-0">
            {KANBAN_COLUMNS_CONFIG.map((col) => (
              <div key={col.status} className="flex-1 min-w-[280px] max-w-[320px] flex flex-col bg-muted/30 rounded-lg shadow-sm">
                <div className={`px-3 py-2.5 flex items-center justify-between ${col.headerBgClass} ${col.headerTextClass || 'text-white'} rounded-t-lg`}>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-6 rounded-full" />
                </div>
                <div className="flex-1 p-3 space-y-3">
                  <Skeleton className="h-20 w-full rounded-md" />
                  <Skeleton className="h-20 w-full rounded-md" />
                  <Skeleton className="h-20 w-full rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd} 
        onDragCancel={handleDragCancel}
        collisionDetection={closestCorners}
    >
      <div className="flex flex-col h-full p-0 sm:p-6 lg:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header pb-2 px-4 sm:px-0">
          <div className="flex items-baseline gap-2">
              <Briefcase className="h-7 w-7 text-primary"/>
              <h1 className="page-title text-2xl sm:text-3xl">Projects Kanban</h1>
          </div>
          <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading} className="h-10 w-10" title="Refresh Projects">
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4 sm:px-0">
          <Input
            placeholder="Search projects (ID, Name, Assignee)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-card border-border/50 focus:border-primary"
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-card border-border/50 focus:border-primary">
              <SelectValue placeholder="Filter by category..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categoryOptions.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={endDateFilter} onValueChange={setEndDateFilter}>
            <SelectTrigger className="bg-card border-border/50 focus:border-primary">
              <SelectValue placeholder="Filter by end date..." />
            </SelectTrigger>
            <SelectContent>
              {endDateOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex space-x-4 min-w-max px-4 sm:px-0">
            {KANBAN_COLUMNS_CONFIG.map((col) => (
              <KanbanColumn
                key={col.status}
                id={col.status} 
                title={col.title}
                icon={col.icon}
                projects={projectsByStatus[col.status] || []}
                headerBgClass={col.headerBgClass}
                headerTextClass={col.headerTextClass}
                headerIconClass={col.headerIconClass}
                isLoading={isLoading}
                currentUser={currentUser}
                allStatuses={allStatuses}
                onOpenAssignDrDialog={handleOpenAssignDrDialog}
              />
            ))}
          </div>
          {projects.length === 0 && !isLoading && (
            <div className="text-center py-10 text-muted-foreground mt-8">
              <Briefcase className="mx-auto h-16 w-16 opacity-30 mb-4" />
              <p className="text-xl font-semibold">No projects found.</p>
              <p className="text-sm">
                {searchTerm || categoryFilter !== 'all' || endDateFilter !== 'all'
                  ? "Try adjusting your filters or search term."
                  : "Get started by adding new projects."}
              </p>
            </div>
          )}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeProject ? (
          <ProjectCard 
            project={activeProject} 
            isOverlay 
            currentUser={currentUser}
            allStatuses={allStatuses}
            onOpenAssignDrDialog={handleOpenAssignDrDialog} 
          />
        ) : null}
      </DragOverlay>

      {selectedOrderForDrAssignment && currentUser && allStatuses.length > 0 && isAssignDrDialogOpen && (
        <AssignDrDialog
          isOpen={isAssignDrDialogOpen}
          onOpenChange={(open) => {
            setIsAssignDrDialogOpen(open);
            if (!open) setSelectedOrderForDrAssignment(null);
          }}
          order={selectedOrderForDrAssignment} 
          currentUser={currentUser}
          allStatuses={allStatuses} // Pass the state variable `allStatuses`
          onDrAssigned={handleDrAssignmentSuccess}
        />
      )}
    </DndContext>
  );
}
