
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Project, ProjectStatusType, CustomStatus, User, GlobalSettings } from '@/types'; 
import { 
  ClipboardCheck,
  ClipboardX,
  DraftingCompass,
  PauseCircle,
  Truck,
  CheckCircle,
  PackageCheck,
  AlertTriangle,
  ClipboardList,
  Search,
  EyeOff
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
import { HoldReasonDialog } from '@/components/projects/HoldReasonDialog'; 
import { FileUploadConfirmationDialog } from '@/components/projects/FileUploadConfirmationDialog';
import { getProjects } from '@/lib/project-service';
import { getStatuses } from '@/lib/status-service'; 
import { getGlobalSettings } from '@/lib/settings-service';
import { getUsers } from '@/lib/user-service';
import type { TrackingLink } from '@/types';
import { Briefcase } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { KanbanColumn } from './KanbanColumn';
import { getOrderById } from '@/lib/order-service';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { DocsCompleteDialog } from '@/components/projects/DocsCompleteDialog';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';


const AssignDrDialog = dynamic(() => import('@/components/orders/assign-dr-dialog').then(mod => mod.AssignDrDialog));
const ProjectCard = dynamic(() => import('@/components/projects/ProjectCard').then(mod => mod.ProjectCard), {
  ssr: false,
});


const KANBAN_COLUMNS_CONFIG: Array<{ title: string; status: ProjectStatusType; icon: React.ElementType; headerBgClass: string; headerIconClass?: string; headerTextClass?: string }> = [
  { title: 'CR Clearance', status: 'CR Clearance', icon: ClipboardCheck, headerBgClass: 'bg-sky-600', headerTextClass: 'text-sky-50' },
  { title: 'CO Clearance', status: 'CO Clearance', icon: ClipboardList, headerBgClass: 'bg-teal-600', headerTextClass: 'text-teal-50' },
  { title: 'On Design', status: 'On Design', icon: DraftingCompass, headerBgClass: 'bg-purple-600', headerTextClass: 'text-purple-50' },
  { title: 'On Hold', status: 'On Hold', icon: PauseCircle, headerBgClass: 'bg-yellow-500', headerTextClass: 'text-yellow-950' },
  { title: 'Logistics', status: 'Logistics', icon: Truck, headerBgClass: 'bg-orange-600', headerTextClass: 'text-orange-50' },
  { title: 'Courier', status: 'Courier', icon: CheckCircle, headerBgClass: 'bg-green-600', headerTextClass: 'text-green-50' },
  { title: 'Delivered', status: 'Delivered', icon: PackageCheck, headerBgClass: 'bg-emerald-600', headerTextClass: 'text-emerald-50' },
  { title: 'Cancel', status: 'Cancel', icon: ClipboardX, headerBgClass: 'bg-red-600', headerTextClass: 'text-red-50' },
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
  const [allUsers, setAllUsers] = useState<User[]>([]);
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
  const [paymentValidationError, setPaymentValidationError] = useState<string | null>(null);
  const [projectForDocsComplete, setProjectForDocsComplete] = useState<Project | null>(null);
  const [isDocsCompleteDialogOpen, setIsDocsCompleteDialogOpen] = useState(false);
  
  const [projectOwnerFilter, setProjectOwnerFilter] = useState<'my' | 'all'>('my');

  const [isReadOnly, setIsReadOnly] = useState(false);
  const [hashId, setHashId] = useState<string | null>(null);


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
      const [fetchedProjects, fetchedStatuses, fetchedSettings, fetchedUsers] = await Promise.all([ 
        getProjects(),
        getStatuses(),
        getGlobalSettings(),
        getUsers()
      ]);
      setProjects(fetchedProjects);
      setAllStatuses(fetchedStatuses); 
      setGlobalSettings(fetchedSettings);
      setAllUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to fetch projects or statuses:", error);
      toast({ title: "Error", description: "Could not load projects or status configurations.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentHash = window.location.hash.substring(1);
      if (currentHash) {
        setHashId(currentHash);
        if (!currentUser) {
          setIsReadOnly(true);
        }
      }
    }
    fetchData();
  }, [fetchData, currentUser]);
  

  const filteredProjects = useMemo(() => {
    let baseProjects = projects;
    
    // Filter for hash-based public view
    if (hashId) {
      baseProjects = baseProjects.filter(project => project.id === hashId);
    } else {
        // Apply role-based filters only if not in single-project (hash) view
        if (currentUser?.role === 'CRM') {
            if (currentUser.isLeader) {
                if (projectOwnerFilter === 'my') {
                    baseProjects = projects.filter(project => project.assigneeId === currentUser.id);
                }
                // 'all' filter means we don't filter by user, so use 'projects'
            } else {
                baseProjects = projects.filter(project => project.assigneeId === currentUser.id);
            }
        } else if (currentUser?.role === 'DESIGNER_REPRESENTATIVE') {
          baseProjects = projects.filter(project => project.designerRepresentativeId === currentUser.id);
        }
    }

    return baseProjects.filter(project => {
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
  }, [projects, debouncedSearchTerm, categoryFilter, endDateFilter, currentUser, projectOwnerFilter, hashId]);

  const projectsByStatus = useMemo(() => {
    const grouped: Record<ProjectStatusType, Project[]> = {
      'CR Clearance': [], 'CO Clearance': [], 'Cancel': [], 'On Design': [],
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
    if (isReadOnly) { // Show all columns in read-only mode
        return KANBAN_COLUMNS_CONFIG;
    }
    if (!currentUser || !globalSettings?.projectStageAccess) {
      return [];
    }
    if (currentUser.role === 'SYSTEM_ADMIN' || (currentUser.role === 'CRM' && currentUser.isLeader)) {
      return KANBAN_COLUMNS_CONFIG;
    }
    
    const userPermissions = globalSettings.projectStageAccess;
    return KANBAN_COLUMNS_CONFIG.filter(column => 
      userPermissions[column.status]?.includes(currentUser.role)
    );
  }, [currentUser, globalSettings, isReadOnly]);

  const handleDragStart = (event: DragStartEvent) => {
    if (isReadOnly) return;
    const { active } = event;
    if (active.data.current?.project) {
      setActiveProject(active.data.current.project as Project);
    }
  };

  const handleConfirmStatusUpdate = useCallback(async (project: Project, newStatus: ProjectStatusType, notes?: string) => {
    if (!currentUser || isReadOnly) return;
    const originalStatus = project.status;
    
    setProjects(prevProjects => {
      return prevProjects.map(p =>
        p.id === project.id ? { ...p, status: newStatus } : p
      );
    });

    const result = await updateProjectStatusAction(project, newStatus, currentUser, notes);
    
    if (!result.success) {
      toast({ title: "Update Failed", description: result.error || `Could not update status.`, variant: "destructive" });
      setProjects(prevProjects => {
        return prevProjects.map(p =>
          p.id === project.id ? { ...p, status: originalStatus } : p
        );
      });
    } else {
      toast({ title: "Project Updated", description: `Project '${project.name}' status changed to ${newStatus}.` });
    }
  }, [currentUser, toast, isReadOnly]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveProject(null);
    if (isReadOnly) return;

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
  
    if (newStatus === 'On Design' && project.status !== 'On Design') {
      if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM_ADMIN') {
        setProjectForDocsComplete(project);
        setIsDocsCompleteDialogOpen(true);
        return; 
      }
    }
  
    if (newStatus === 'Logistics' && project.status !== 'Logistics' && globalSettings?.isPaymentValidationEnabled && currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM_ADMIN') {
      setIsLoading(true);
      const order = await getOrderById(project.id);
      setIsLoading(false);
  
      if (!order) {
        toast({ title: "Error", description: "Could not retrieve order details for validation.", variant: "destructive" });
        return;
      }
  
      const orderSubtotal = (order.orderItems || []).reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0);
      const effectiveDiscount = order.specialClientDiscount || 0;
      const netPayable = orderSubtotal - effectiveDiscount;
      const totalAdvancePaid = (order.advancePayments || []).reduce((sum, record) => sum + record.amount, 0);
      const paymentPercentage = netPayable > 0 ? (totalAdvancePaid / netPayable) * 100 : 100;
  
      if (paymentPercentage < 45) {
        setPaymentValidationError(`Payment is only ${paymentPercentage.toFixed(1)}%. At least 45% is required to move to Logistics.`);
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
  
    handleConfirmStatusUpdate(project, newStatus);
  }, [currentUser, globalSettings, toast, handleConfirmStatusUpdate, isReadOnly]);
  
  const handleDragCancel = () => {
    setActiveProject(null);
  };
  
  const handleOpenAssignDrDialog = useCallback(async (projectToAssign: Project) => {
    if (isReadOnly || !currentUser) {
        toast({ title: "Read-Only Mode", description: "Actions are disabled.", variant: "default" });
        return;
    }
    
    const projectShim: TrackingLink = {
        id: projectToAssign.id,
        companyName: projectToAssign.name,
        currentStatus: projectToAssign.status,
        designerRepresentativeId: projectToAssign.designerRepresentativeId || null,
        designerRepresentativeName: projectToAssign.designerRepresentativeName || null,
        address: '', phoneNumber: '', orderItems: [],
        crmUserId: projectToAssign.assigneeId,
        crmUserName: projectToAssign.assigneeName,
        createdAt: projectToAssign.createdAt || new Date().toISOString(),
        isPublic: false, statusHistory: [], comments: [], advancePayments: [],
    };
    
    if (!projectToAssign.designerRepresentativeId) {
      setProjectForDocsComplete(projectToAssign);
      setIsDocsCompleteDialogOpen(true);
    } else {
      setSelectedOrderForDrAssignment(projectShim);
      setIsAssignDrDialogOpen(true);
    }

  }, [toast, currentUser, isReadOnly]);


  const handleDrAssignmentSuccess = useCallback(async (updatedOrderFromDialog: TrackingLink) => {
    setProjects(prev => prev.map(p => p.id === updatedOrderFromDialog.id ? {
      ...p,
      status: 'On Design',
      designerRepresentativeId: updatedOrderFromDialog.designerRepresentativeId,
      designerRepresentativeName: updatedOrderFromDialog.designerRepresentativeName,
      assigneeAvatarUrl: updatedOrderFromDialog.assigneeAvatarUrl,
    } : p));
    toast({ title: "DR Assigned", description: `${updatedOrderFromDialog.designerRepresentativeName} assigned to order ${updatedOrderFromDialog.id}.` });
  }, [toast]);
  
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
      <div className="flex flex-col h-full space-y-4">
        {isReadOnly && (
          <div className="flex items-center justify-center gap-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-md text-sm font-medium">
            <EyeOff className="h-4 w-4" />
            Read-Only View
          </div>
        )}

        {!isReadOnly && (
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
        )}
        
        {currentUser?.isLeader && currentUser?.role === 'CRM' && !isReadOnly && (
          <div className="px-4 sm:px-0">
            <Select value={projectOwnerFilter} onValueChange={(value) => setProjectOwnerFilter(value as 'my' | 'all')}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select view..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="my">My Projects</SelectItem>
                <SelectItem value="all">All Projects</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar-hidden">
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
                allUsers={allUsers}
                onOpenAssignDrDialog={handleOpenAssignDrDialog}
                isSearching={!!debouncedSearchTerm}
                isReadOnly={isReadOnly}
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
            allUsers={allUsers}
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

      {projectForDocsComplete && (
        <DocsCompleteDialog
          isOpen={isDocsCompleteDialogOpen}
          onOpenChange={setIsDocsCompleteDialogOpen}
          onConfirm={(notes) => {
            setIsDocsCompleteDialogOpen(false);
            const projectShim: TrackingLink = {
              id: projectForDocsComplete.id,
              companyName: projectForDocsComplete.name,
              currentStatus: projectForDocsComplete.status,
              designerRepresentativeId: projectForDocsComplete.designerRepresentativeId || null,
              designerRepresentativeName: projectForDocsComplete.designerRepresentativeName || null,
              address: '', phoneNumber: '', orderItems: [],
              crmUserId: projectForDocsComplete.assigneeId,
              crmUserName: projectForDocsComplete.assigneeName,
              createdAt: projectForDocsComplete.createdAt || new Date().toISOString(),
              isPublic: false, statusHistory: [], comments: [], advancePayments: [],
            };
            setSelectedOrderForDrAssignment(projectShim);
            setIsAssignDrDialogOpen(true);
            setProjectForDocsComplete(null);
          }}
        />
      )}

      {paymentValidationError && (
        <AlertDialog open={!!paymentValidationError} onOpenChange={() => setPaymentValidationError(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                        Payment Incomplete
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {paymentValidationError}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setPaymentValidationError(null)}>
                        OK
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </DndContext>
  );
}

```
- src/components/projects/KanbanColumn.tsx:
```tsx

"use client";

import dynamic from 'next/dynamic';
import type { Project, CustomStatus, User } from '@/types'; 
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LucideIcon } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';


const ProjectCard = dynamic(() => import('@/components/projects/ProjectCard').then(mod => mod.ProjectCard), {
  ssr: false,
});

interface KanbanColumnProps {
  id: string; 
  title: string;
  icon: LucideIcon;
  projects: Project[];
  headerBgClass: string;
  headerTextClass?: string;
  headerIconClass?: string;
  isLoading?: boolean;
  currentUser: User | null; 
  allStatuses: CustomStatus[]; 
  allUsers: User[]; 
  onOpenAssignDrDialog: (project: Project) => void;
  isSearching?: boolean;
  isReadOnly?: boolean; // New prop for read-only mode
}

const PROJECTS_PER_PAGE = 20;

export function KanbanColumn({ 
  id,
  title, 
  icon: Icon, 
  projects, 
  headerBgClass, 
  headerTextClass = "text-white",
  headerIconClass = "text-white",
  isLoading = false,
  currentUser,
  allStatuses,
  allUsers,
  onOpenAssignDrDialog,
  isSearching = false,
  isReadOnly = false, // New prop with default value
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: isReadOnly }); // Disable droppable in read-only mode
  const [visibleCount, setVisibleCount] = useState(PROJECTS_PER_PAGE);

  useEffect(() => {
    setVisibleCount(PROJECTS_PER_PAGE);
  }, [projects]);
  
  const handleLoadMore = () => {
    setVisibleCount(prevCount => prevCount + PROJECTS_PER_PAGE);
  };
  
  const visibleProjects = useMemo(() => projects.slice(0, visibleCount), [projects, visibleCount]);
  const hasMoreProjects = visibleCount < projects.length;


  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "w-[280px] sm:w-[300px] shrink-0 flex flex-col bg-muted/30 rounded-lg overflow-hidden transition-all duration-200 ease-in-out h-full",
        isOver && !isReadOnly ? 'border-primary ring-2 ring-primary shadow-xl scale-[1.01]' : 'border-border/30 shadow-sm' 
      )}
    >
      <div className={`px-3 py-2.5 flex items-center justify-between ${headerBgClass} ${headerTextClass} rounded-t-lg shrink-0`}>
        <div className="flex items-center">
          <Icon className={`mr-2 h-4 w-4 ${headerIconClass}`} />
          <h2 className="font-semibold text-sm tracking-wide">{title}</h2>
        </div>
        <span className="text-xs px-2 py-0.5 bg-black/20 rounded-full">{isLoading ? <Skeleton className="h-4 w-4 inline-block" /> : projects.length}</span>
      </div>
      <ScrollArea className="flex-1 bg-background/10 custom-scrollbar">
        <div className="space-y-3 p-3">
        {isLoading && projects.length === 0 ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-20 w-full rounded-md" />
          </div>
        ) : visibleProjects.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-xs text-muted-foreground text-center italic">No projects in this stage.</p>
          </div>
        ) : (
          <AnimatePresence>
            {visibleProjects.map((project, index) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: (index % PROJECTS_PER_PAGE) * 0.03 }}
              >
                  <ProjectCard 
                    key={project.id} 
                    project={project} 
                    currentUser={currentUser}
                    allStatuses={allStatuses}
                    allUsers={allUsers}
                    onOpenAssignDrDialog={onOpenAssignDrDialog}
                    isReadOnly={isReadOnly}
                  />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        {hasMoreProjects && (
          <div className="text-center pt-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8"
              onClick={handleLoadMore}
            >
              Load More ({projects.length - visibleCount} remaining)
            </Button>
          </div>
        )}
        </div>
      </ScrollArea>
    </div>
  );
}
```
- src/components/projects/ProjectCard.tsx:
```tsx

"use client";

import type { Project, CustomStatus, User } from '@/types'; 
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; 
import { CalendarDays, User as UserIconLucide, Folder, ReceiptText, UserCheck } from 'lucide-react'; // Added UserCheck
import { Button, buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
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
  allUsers: User[]; // Added
  onOpenAssignDrDialog: (project: Project) => void; 
  isReadOnly?: boolean; // New prop for read-only mode
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
  else if (status === 'CO Clearance') effectiveStartDateIso = project.coClearanceAt || onDesignAt;

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
    case 'CO Clearance':
      effectiveTargetDate = addHours(effectiveStartDate, 24);
      slaStageName = " (24H SLA)";
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

export function ProjectCard({ 
  project, 
  isOverlay = false, 
  currentUser, 
  allStatuses, 
  allUsers, 
  onOpenAssignDrDialog,
  isReadOnly = false // Default to false
}: ProjectCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
    data: { project },
    disabled: isOverlay || isReadOnly, // Disable dragging in read-only mode 
  });
  
  const crmUser = allUsers.find(u => u.id === project.assigneeId);
  const drUser = project.designerRepresentativeId ? allUsers.find(u => u.id === project.designerRepresentativeId) : null;

  const style = !isOverlay && transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  const getInitials = (name: string | undefined): string => {
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
  
  const truncatedProjectName = project.name.length > 35 
    ? `${project.name.substring(0, 35)}...` 
    : project.name;

  const canAssignDrPermission = !isReadOnly && (currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.role === 'CRM');
  const canOpenDialogFromProjectCard = (project.status === 'CR Clearance' || project.status === 'On Design' || project.status === 'CO Clearance');

  const crmInfoClickable = canAssignDrPermission && canOpenDialogFromProjectCard && !project.designerRepresentativeName;
  const drInfoClickable = canAssignDrPermission && canOpenDialogFromProjectCard && !!project.designerRepresentativeName;

  const handleCardClick = (e: React.MouseEvent) => {
    if (isReadOnly) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Default click behavior (opening tracking page) happens via the Link component
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isReadOnly) {
        e.preventDefault();
        e.stopPropagation();
    }
  }

  const cursorClass = isReadOnly 
    ? "cursor-default" 
    : (isDragging ? "cursor-grabbing" : "cursor-grab active:cursor-grabbing");

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
        "relative group",
        isOverlay ? "z-50" : (isDragging ? "z-50" : "")
      )}
      onClick={handleCardClick}
    >
      <Card
        className={cn(
          "bg-card w-full shadow-none", 
          cursorClass,
          isDragging && "ring-2 ring-primary"
        )}
      >
        <CardContent className="p-3 space-y-2.5">
          <div className="flex justify-between items-start">
            <span className="text-sm font-semibold text-foreground truncate">{project.projectIdDisplay}</span>
            {!isOverlay && (
                 <Link
                    href={`/track/${project.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), "h-6 w-6", isReadOnly && "pointer-events-none")}
                    onClick={handleLinkClick}
                    title="View Invoice / Order Details"
                  >
                    <ReceiptText className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  </Link>
            )}
          </div>
          
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground" title={project.name}>{truncatedProjectName}</p>
          </div>

          <Link
            href={`/track/${project.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLinkClick}
            title="View Public Tracking Page"
            className={cn(isReadOnly && "pointer-events-none")}
          >
            <div className={cn(
                "inline-flex items-center rounded-md border border-destructive/30 bg-destructive/20 px-2 py-0.5 text-xs font-semibold text-destructive transition-colors",
                !isReadOnly && "hover:bg-destructive/30"
            )}>
              <CalendarDays className="mr-1.5 h-3 w-3" />
              Target: {project.endDate ? parseISO(project.endDate).toLocaleDateString() : 'N/A'}
            </div>
          </Link>
          
          {progressInfo.showProgressBar && (
              <div className="pt-1">
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

          <div className="flex items-center justify-start mt-2">
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
                      <AvatarImage src={crmUser?.avatarUrl || undefined} alt={project.assigneeName} data-ai-hint="assignee avatar" />
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

            {project.designerRepresentativeName && (
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
                          <AvatarImage src={drUser?.avatarUrl || undefined} alt={project.designerRepresentativeName} data-ai-hint="designer avatar" />
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
```