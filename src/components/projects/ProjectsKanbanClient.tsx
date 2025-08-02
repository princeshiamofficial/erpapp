
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Project, ProjectStatusType, CustomStatus, User, GlobalSettings } from '@/types'; 
import { KanbanColumn } from '@/components/projects/KanbanColumn';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { ProjectCard } from '@/components/projects/ProjectCard'; 
import { useAuth } from '@/contexts/auth-context';
import dynamic from 'next/dynamic'; 
import { CourierConfirmationDialog } from '@/components/projects/CourierConfirmationDialog';
import { getProjects } from '@/lib/project-service';
import { getStatuses } from '@/lib/status-service'; 
import { getGlobalSettings } from '@/lib/settings-service';
import type { TrackingLink } from '@/types';
import { Briefcase } from 'lucide-react';

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

interface ProjectsKanbanClientProps {
  initialProjects: Project[];
  initialStatuses: CustomStatus[];
  initialGlobalSettings: GlobalSettings;
  currentUser: User | null;
}

export function ProjectsKanbanClient({ initialProjects, initialStatuses, initialGlobalSettings, currentUser: serverUser }: ProjectsKanbanClientProps) {
  const { currentUser: authContextUser } = useAuth();
  const currentUser = authContextUser || serverUser;

  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>(initialStatuses); 
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(initialGlobalSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [endDateFilter, setEndDateFilter] = useState<string>('all');
  const { toast } = useToast();
  const [activeProject, setActiveProject] = useState<Project | null>(null); 

  const [selectedOrderForDrAssignment, setSelectedOrderForDrAssignment] = useState<TrackingLink | null>(null); 
  const [isAssignDrDialogOpen, setIsAssignDrDialogOpen] = useState(false); 
  const [projectToCourier, setProjectToCourier] = useState<Project | null>(null);

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

  const filteredProjects = useMemo(() => {
    let roleFilteredProjects = projects;
    
    if (currentUser?.role === 'CRM') {
      roleFilteredProjects = projects.filter(project => project.assigneeId === currentUser.id);
    } else if (currentUser?.role === 'DESIGNER_REPRESENTATIVE') {
      roleFilteredProjects = projects.filter(project => project.designerRepresentativeId === currentUser.id);
    }
    
    return roleFilteredProjects.filter(project => {
      const matchesSearchTerm = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.projectIdDisplay.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.assigneeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.designerRepresentativeName || '').toLowerCase().includes(searchTerm.toLowerCase());

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
  }, [projects, searchTerm, categoryFilter, endDateFilter, currentUser]);

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
    
    const settings = await getGlobalSettings();
    if (currentUser.role !== 'SYSTEM_ADMIN') {
        const permissions = settings.projectStageAccess;
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
    
    if (newStatus === 'Courier') {
      setProjectToCourier(project);
      return;
    }

    // Optimistically update the UI
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

  return (
    <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd} 
        onDragCancel={handleDragCancel}
        collisionDetection={closestCorners}
    >
      <div className="flex flex-col h-full gap-4">
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

        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex space-x-4 min-w-max px-4 sm:px-0 h-full">
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
    </DndContext>
  );
}
