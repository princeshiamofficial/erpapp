
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { Project, ProjectStatusType, CustomStatus, User, GlobalSettings } from '@/types'; 
import { 
  ClipboardCheck,
  ClipboardX,
  DraftingCompass,
  PauseCircle,
  Truck,
  CheckCircle,
  PackageCheck
} from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, isSameWeek, isSameMonth, isSameYear } from 'date-fns';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent, 
  type DragCancelEvent, 
  closestCorners,
  DragOverlay, 
} from '@dnd-kit/core';
import { updateProjectStatusAction } from '@/app/(app)/projects/actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { CourierConfirmationDialog } from '@/components/projects/CourierConfirmationDialog';
import { FileUploadConfirmationDialog } from '@/components/projects/FileUploadConfirmationDialog'; 
import { HoldReasonDialog } from '@/components/projects/HoldReasonDialog'; 
import { getProjects } from '@/lib/project-service';
import { getStatuses } from '@/lib/status-service'; 
import { getGlobalSettings } from '@/lib/settings-service';
import type { TrackingLink } from '@/types';
import { Briefcase } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { KanbanColumn } from './KanbanColumn';

const AssignDrDialog = dynamic(() => import('@/components/orders/assign-dr-dialog').then(mod => mod.AssignDrDialog));
const ProjectCard = dynamic(() => import('@/components/projects/ProjectCard').then(mod => mod.ProjectCard), {
  ssr: false,
});


const KANBAN_COLUMNS_CONFIG: Array<{ title: string; status: ProjectStatusType; icon: React.ElementType; headerBgClass: string; headerIconClass?: string; headerTextClass?: string }> = [
  { title: 'CR Clearance', status: 'CR Clearance', icon: ClipboardCheck, headerBgClass: 'bg-sky-600', headerTextClass: 'text-sky-50' },
  { title: 'Cancel', status: 'Cancel', icon: ClipboardX, headerBgClass: 'bg-red-600', headerTextClass: 'text-red-50' },
  { title: 'On Design', status: 'On Design', icon: DraftingCompass, headerBgClass: 'bg-purple-600', headerTextClass: 'text-purple-50' },
  { title: 'On Hold', status: 'On Hold', icon: PauseCircle, headerBgClass: 'bg-yellow-500', headerTextClass: 'text-yellow-950' },
  { title: 'Logistics', status: 'Logistics', icon: Truck, headerBgClass: 'bg-orange-600', headerTextClass: 'text-orange-50' },
  { title: 'Courier', status: 'Courier', icon: CheckCircle, headerBgClass: 'bg-green-600', headerTextClass: 'text-green-50' },
  { title: 'Delivered', status: 'Delivered', icon: PackageCheck, headerBgClass: 'bg-emerald-600', headerTextClass: 'text-emerald-50' },
];

function KanbanSkeleton() {
   return (
      <div className="flex flex-col h-full space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4 sm:px-0">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
        </div>
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex space-x-4 min-w-max px-4 sm:px-0">
            {KANBAN_COLUMNS_CONFIG.map((col) => (
              <div key={col.status} className="flex-1 min-w-[280px] max-w-[320px] flex flex-col bg-muted/30 rounded-lg shadow-sm">
                <div className={`px-3 py-2.5 flex items-center justify-between ${col.headerBgClass} text-white rounded-t-lg`}>
                  <Skeleton className="h-5 w-32 bg-white/30" />
                  <Skeleton className="h-5 w-6 rounded-full bg-white/30" />
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

// No initial props are needed now, as the component fetches its own data.
export function ProjectsKanbanClient() {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>([]); 
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as true
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [endDateFilter, setEndDateFilter] = useState<string>('all');
  const { toast } = useToast();
  const [activeProject, setActiveProject] = useState<Project | null>(null); 

  const [selectedOrderForDrAssignment, setSelectedOrderForDrAssignment] = useState<TrackingLink | null>(null); 
  const [isAssignDrDialogOpen, setIsAssignDrDialogOpen] = useState(false); 
  const [projectToCourier, setProjectToCourier] = useState<Project | null>(null);
  
  const [projectToHold, setProjectToHold] = useState<Project | null>(null);
  const [isHoldReasonDialogOpen, setIsHoldReasonDialogOpen] = useState(false);
  
  const [projectForLogistics, setProjectForLogistics] = useState<Project | null>(null);
  const [isLogisticsConfirmDialogOpen, setIsLogisticsConfirmDialogOpen] = useState(false);


  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedProjects, fetchedStatuses, fetchedSettings] = await Promise.all([ 
        getProjects(),
        getStatuses(),
        getGlobalSettings()
      ]);
      setProjects(fetchedProjects);
      setAllStatuses(fetchedStatuses); 
      setGlobalSettings(fetchedSettings);
    } catch (error) {
      console.error("Failed to fetch projects or statuses:", error);
      toast({ title: "Error", description: "Could not load projects or status configurations.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  // Fetch data on component mount
  useEffect(() => {
    if (currentUser) {
        fetchData();
    }
  }, [currentUser, fetchData]);

  const filteredProjects = useMemo(() => {
    let roleFilteredProjects = projects;
    
    if (currentUser?.role === 'CRM') {
      roleFilteredProjects = projects.filter(project => project.assigneeId === currentUser.id);
    } else if (currentUser?.role === 'DESIGNER_REPRESENTATIVE') {
      roleFilteredProjects = projects.filter(project => project.designerRepresentativeId === currentUser.id);
    }
    
    return roleFilteredProjects.filter(project => {
      const matchesSearchTerm = debouncedSearchTerm.trim() === '' || 
        project.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        project.projectIdDisplay.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        project.assigneeName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (project.designerRepresentativeName || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());

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
  }, [projects, debouncedSearchTerm, categoryFilter, endDateFilter, currentUser]);

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
  
  const visibleKanbanColumns = useMemo(() => {
    if (!currentUser || !globalSettings?.projectStageAccess) {
      return [];
    }
    if (currentUser.role === 'SYSTEM_ADMIN') {
      return KANBAN_COLUMNS_CONFIG;
    }
    const userPermissions = globalSettings.projectStageAccess;
    return KANBAN_COLUMNS_CONFIG.filter(column => 
      userPermissions[column.status]?.includes(currentUser.role)
    );
  }, [currentUser, globalSettings]);

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
    
    if (currentUser.role !== 'SYSTEM_ADMIN' && globalSettings) {
        const permissions = globalSettings.projectStageAccess;
        if (permissions && permissions[newStatus] && !permissions[newStatus].includes(currentUser.role)) {
            toast({
                title: "Permission Denied",
                description: `You do not have permission to move projects to the '${newStatus}' stage.`,
                variant: "destructive"
            });
            return;
        }
    }


    if (newStatus === 'On Design' && !project.designerRepresentativeId) {
      handleOpenAssignDrDialog(project);
      return;
    }
    
    if (newStatus === 'On Hold') {
        setProjectToHold(project);
        setIsHoldReasonDialogOpen(true);
        return;
    }

    if (newStatus === 'Logistics') {
        setProjectForLogistics(project);
        setIsLogisticsConfirmDialogOpen(true);
        return;
    }
    
    if (newStatus === 'Courier') {
      setProjectToCourier(project);
      return;
    }

    // Optimistically update the UI for other statuses
    setProjects(prevProjects => {
      return prevProjects.map(p =>
        p.id === project.id ? { ...p, status: newStatus } : p
      );
    });

    // Call the server action
    const result = await updateProjectStatusAction(project, newStatus, currentUser);

    if (result.success) {
      toast({ title: "Project Updated", description: `Project '${project.name}' status changed to ${newStatus}.` });
      await fetchData(); // Re-fetch to confirm state
    } else {
      toast({ title: "Update Failed", description: result.error || `Could not update status for project '${project.name}'.`, variant: "destructive" });
      // Revert optimistic update on failure
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
  
  const handleConfirmStatusUpdate = async (project: Project, newStatus: ProjectStatusType, notes?: string) => {
    if (!currentUser) return;
    const originalStatus = project.status;
     setProjects(prevProjects => {
      return prevProjects.map(p =>
        p.id === project.id ? { ...p, status: newStatus } : p
      );
    });
    const result = await updateProjectStatusAction(project, newStatus, currentUser, notes);
    if (result.success) {
      toast({ title: "Project Updated", description: `Project '${project.name}' status changed to ${newStatus}.` });
      await fetchData();
    } else {
      toast({ title: "Update Failed", description: result.error || `Could not update status.`, variant: "destructive" });
      setProjects(prevProjects => {
        return prevProjects.map(p =>
          p.id === project.id ? { ...p, status: originalStatus } : p
        );
      });
    }
  }

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
        currentStatus: projectToAssign.status,
        designerRepresentativeId: projectToAssign.designerRepresentativeId || null,
        designerRepresentativeName: projectToAssign.designerRepresentativeName || null,
        address: '',
        phoneNumber: '',
        orderItems: [],
        crmUserId: projectToAssign.assigneeId,
        crmUserName: projectToAssign.assigneeName,
        createdAt: projectToAssign.createdAt || new Date().toISOString(),
        isPublic: false,
        statusHistory: [],
        comments: [],
        advancePayments: [],
    };
    setSelectedOrderForDrAssignment(projectShim);
    
    setIsAssignDrDialogOpen(true);
    console.log("[ProjectsPage] Dialog state set to open for order/project:", projectShim.id);

  }, [toast, currentUser]);


  const handleDrAssignmentSuccess = useCallback(async (updatedOrderFromDialog: TrackingLink) => {
    await fetchData(); 
    toast({ title: "DR Assigned", description: `${updatedOrderFromDialog.designerRepresentativeName} assigned to order ${updatedOrderFromDialog.id}.` });
  }, [fetchData, toast]);
  
  if (isLoading) {
    return <KanbanSkeleton />;
  }


  return (
    <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd} 
        onDragCancel={handleDragCancel}
        collisionDetection={closestCorners}
    >
      <div className="flex flex-col h-full">
        {/* Filter Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4 sm:px-0">
          <Input
            placeholder="Search projects (ID, Name, Assignee, DR)..."
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

        {/* Kanban Board Section */}
        <div className="flex-1 mt-4 overflow-x-auto pb-4">
          <div className="flex space-x-4 h-full min-w-max px-4 sm:px-0">
            {visibleKanbanColumns.map((col) => (
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
          allStatuses={allStatuses}
          onDrAssigned={handleDrAssignmentSuccess}
        />
      )}
      
      {projectToCourier && currentUser && (
        <CourierConfirmationDialog
          isOpen={!!projectToCourier}
          onOpenChange={(open) => {
            if (!open) setProjectToCourier(null);
          }}
          project={projectToCourier}
          currentUser={currentUser}
          onSuccess={fetchData}
        />
      )}
      
      {projectToHold && (
        <HoldReasonDialog
          isOpen={isHoldReasonDialogOpen}
          onOpenChange={setIsHoldReasonDialogOpen}
          onConfirm={(reason) => {
            handleConfirmStatusUpdate(projectToHold, 'On Hold', reason);
            setIsHoldReasonDialogOpen(false);
            setProjectToHold(null);
          }}
        />
      )}
      
      {projectForLogistics && (
          <FileUploadConfirmationDialog
            isOpen={isLogisticsConfirmDialogOpen}
            onOpenChange={(open) => {
              if(!open) {
                // If user closes dialog without confirming, revert the optimistic UI update
                const originalStatus = projects.find(p => p.id === projectForLogistics.id)?.status;
                if (originalStatus && originalStatus !== 'Logistics') {
                  setProjects(prev => prev.map(p => p.id === projectForLogistics.id ? {...p, status: originalStatus} : p));
                }
                setProjectForLogistics(null);
              }
              setIsLogisticsConfirmDialogOpen(open);
            }}
            onConfirm={(notes) => {
              handleConfirmStatusUpdate(projectForLogistics, 'Logistics', notes);
              setProjectForLogistics(null);
            }}
          />
      )}
    </DndContext>
  );
}
