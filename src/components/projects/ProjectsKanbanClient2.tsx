"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { Project, ProjectStatusType, CustomStatus, User, GlobalSettings, TrackingLink, UserRole } from '@/types';
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
  EyeOff,
  Download,
  Loader2,
  User as UserIcon,
  Users as UsersIcon,
  ChevronsUpDown,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  closestCorners,
  DragOverlay,
} from '@dnd-kit/core';
import { updateProjectStatusAction } from '@/app/(app)/projects/actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useSocket } from '@/contexts/socket-context';
import { CourierConfirmationDialog } from '@/components/projects/CourierConfirmationDialog';
import { HoldReasonDialog } from '@/components/projects/HoldReasonDialog';
import { FileUploadConfirmationDialog } from '@/components/projects/FileUploadConfirmationDialog';
import { getProjects } from '@/lib/project-service';
import { getStatuses } from '@/lib/status-service';
import { DELIVERED_STATUS_ID } from '@/lib/status-constants';
import { getGlobalSettings } from '@/lib/settings-service';
import { getUsers } from '@/lib/user-service';
import { getOrderById } from '@/lib/order-service';
import { KanbanColumn } from '@/components/projects/KanbanColumn';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { DocsCompleteDialog } from '@/components/projects/DocsCompleteDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { DateRangePicker, type PredefinedRange } from '@/components/dashboard/date-range-picker';
import type { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Papa from 'papaparse';

const AssignDrDialog = dynamic(() => import('@/components/orders/assign-dr-dialog').then(mod => mod.AssignDrDialog));
const ProjectCard = dynamic(() => import('@/components/projects/ProjectCard').then(mod => mod.ProjectCard), {
  ssr: false,
});

const KANBAN_COLUMNS_CONFIG: Array<{ title: string; status: ProjectStatusType; icon: LucideIcon; headerBgClass: string; headerIconClass?: string; headerTextClass?: string }> = [
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

const getInitials = (name: string | undefined): string => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names[names.length - 1] ? names[names.length - 1].charAt(0).toUpperCase() : '');
};


export function ProjectsKanbanClient() {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataFetching, setIsDataFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
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

  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>();

  const [selectedUserIdFilter, setSelectedUserIdFilter] = useState<string>('all');
  const [isUserFilterOpen, setIsUserFilterOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");


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
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const { socket } = useSocket();

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setIsDataFetching(true);
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
      setIsDataFetching(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!socket) return;

    socket.on("project-updated", (data: any) => {
      console.log("Project updated remotely:", data);
      fetchData(true);
    });

    return () => {
      socket.off("project-updated");
    };
  }, [socket, fetchData]);

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

    const intervalId = setInterval(() => {
      fetchData(true);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [fetchData, currentUser]);

  const handleDateRangeChange = (
    range: DateRange | undefined,
    displayLabel: string,
    predefinedValue: PredefinedRange | "custom" | null
  ) => {
    setSelectedDateRange(range);
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

  const handleConfirmStatusUpdate = useCallback(async (project: Project, newStatus: ProjectStatusType, notes?: string) => {
    if (!currentUser || isReadOnly) return;
    const originalStatus = project.status;

    // Optimistic update
    setProjects(prevProjects => {
      return prevProjects.map(p =>
        p.id === project.id ? { ...p, status: newStatus } : p
      );
    });

    const result = await updateProjectStatusAction(project, newStatus, currentUser, notes);

    if (!result.success) {
      toast({ title: "Update Failed", description: result.error || `Could not update status.`, variant: "destructive" });
      // Revert if failed
      setProjects(prevProjects => {
        return prevProjects.map(p =>
          p.id === project.id ? { ...p, status: originalStatus } : p
        );
      });
    } else {
      toast({ title: "Project Updated", description: `Project '${project.name}' status changed to ${newStatus}.` });
    }
  }, [currentUser, toast, isReadOnly]);

  const handleDragStart = (event: DragStartEvent) => {
    if (isReadOnly) return;
    const { active } = event;
    if (active.data.current?.project) {
      setActiveProject(active.data.current.project as Project);
    }
  };

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
      const order = await getOrderById(project.id);

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
  }, [currentUser, globalSettings, toast, handleConfirmStatusUpdate, isReadOnly, handleOpenAssignDrDialog]);

  const handleDragCancel = () => {
    setActiveProject(null);
  };

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

  const handleExport = async () => {
    const deliveredProjects = projects.filter(p => p.status === 'Delivered');

    if (deliveredProjects.length === 0) {
      toast({ title: "No Data", description: "There are no projects in the 'Delivered' stage to export." });
      return;
    }

    setIsDataFetching(true);

    const ordersDataPromises = deliveredProjects.map(p => getOrderById(p.id));
    const ordersResults = await Promise.all(ordersDataPromises);
    const ordersMap = new Map(ordersResults.filter(o => o).map(o => [o!.id, o]));

    setIsDataFetching(false);

    const dataToExport = deliveredProjects.map(p => {
      const order = ordersMap.get(p.id);
      const deliveredLog = order?.statusHistory.find(h => h.status === DELIVERED_STATUS_ID);
      const deliveryDate = deliveredLog ? format(parseISO(deliveredLog.timestamp), 'yyyy-MM-dd HH:mm') : 'N/A';
      const nameParts = (p.name || '').split(' • ');
      const jobId = nameParts.length > 1 ? nameParts[0].trim() : p.projectIdDisplay;
      const companyName = nameParts.length > 1 ? nameParts.slice(1).join(' • ').trim() : p.name;

      return {
        'Job ID': jobId,
        'Company Name': companyName,
        'Phone': order?.phoneNumber || 'N/A',
        'Address': order?.address || 'N/A',
        'Delivery Date': deliveryDate,
      };
    });

    const csv = Papa.unparse(dataToExport, {
      header: true,
      columns: ["Job ID", "Company Name", "Phone", "Address", "Delivery Date"]
    });

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'delivered_projects_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Export Started", description: "Your delivered projects data is being downloaded." });
  };

  const canFilterUsers = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN' || (currentUser.role === 'DESIGNER_REPRESENTATIVE' && currentUser.isLeader);
  }, [currentUser]);

  const usersForFilter = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN') {
      return allUsers.filter(u => ['CRM', 'DESIGNER_REPRESENTATIVE'].includes(u.role));
    }
    if (currentUser.role === 'DESIGNER_REPRESENTATIVE' && currentUser.isLeader) {
      return allUsers.filter(u => u.role === 'DESIGNER_REPRESENTATIVE');
    }
    return [];
  }, [allUsers, currentUser]);

  const selectedUser = useMemo(() => {
    if (selectedUserIdFilter === 'all') return null;
    return allUsers.find(u => u.id === selectedUserIdFilter);
  }, [selectedUserIdFilter, allUsers]);

  const selectedUserName = useMemo(() => {
    if (selectedUserIdFilter === 'all') {
      if (currentUser?.role === 'DESIGNER_REPRESENTATIVE' && currentUser.isLeader) return 'All DRs';
      return 'All Users';
    }
    return selectedUser?.name || 'Select User';
  }, [selectedUserIdFilter, selectedUser, currentUser]);


  const filteredUsersForDropdown = useMemo(() => {
    if (!userSearchQuery) return usersForFilter;
    return usersForFilter.filter(user =>
      user.name.toLowerCase().includes(userSearchQuery.toLowerCase())
    );
  }, [usersForFilter, userSearchQuery]);

  const visibleKanbanColumns = useMemo(() => {
    if (isReadOnly) {
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


  const filteredProjects = useMemo(() => {
    let baseProjects = projects;

    if (hashId) {
      baseProjects = baseProjects.filter(project => project.id === hashId);
    } else {
      if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN') {
        if (selectedUserIdFilter !== 'all') {
          const user = allUsers.find(u => u.id === selectedUserIdFilter);
          if (user?.role === 'CRM') {
            baseProjects = projects.filter(project => project.assigneeId === selectedUserIdFilter);
          } else if (user?.role === 'DESIGNER_REPRESENTATIVE') {
            baseProjects = projects.filter(project => project.designerRepresentativeId === selectedUserIdFilter);
          }
        }
      } else if (currentUser?.role === 'CRM') {
        if (currentUser.isLeader) {
          if (projectOwnerFilter === 'my') {
            baseProjects = projects.filter(project => project.assigneeId === currentUser.id);
          }
        } else {
          baseProjects = projects.filter(project => project.assigneeId === currentUser.id);
        }
      } else if (currentUser?.role === 'DESIGNER_REPRESENTATIVE') {
        if (currentUser.isLeader) {
          const allowedStatusesForDr = Object.entries(globalSettings?.projectStageAccess || {})
            .filter(([_, roles]) => (roles as UserRole[]).includes('DESIGNER_REPRESENTATIVE'))
            .map(([status]) => status);
          if (selectedUserIdFilter !== 'all') {
            baseProjects = projects.filter(project =>
              project.designerRepresentativeId === selectedUserIdFilter
            );
          } else {
            baseProjects = projects.filter(project =>
              project.designerRepresentativeId && allowedStatusesForDr.includes(project.status)
            );
          }
        } else {
          baseProjects = projects.filter(project => project.designerRepresentativeId === currentUser.id);
        }
      }
    }

    return baseProjects.filter(project => {
      const matchesSearchTerm = debouncedSearchTerm.trim() === '' ||
        project.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        project.projectIdDisplay.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        project.assigneeName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (project.designerRepresentativeName || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || project.categoryTag === categoryFilter;

      let matchesDate = true;
      if (selectedDateRange?.from) {
        const startDate = startOfDay(selectedDateRange.from);
        const endDate = selectedDateRange.to ? endOfDay(selectedDateRange.to) : endOfDay(startDate);
        try {
          const projectDate = parseISO(project.createdAt || new Date().toISOString());
          matchesDate = isWithinInterval(projectDate, { start: startDate, end: endDate });
        } catch {
          matchesDate = false;
        }
      }
      return matchesSearchTerm && matchesCategory && matchesDate;
    });
  }, [projects, debouncedSearchTerm, categoryFilter, selectedDateRange, currentUser, projectOwnerFilter, hashId, selectedUserIdFilter, allUsers, globalSettings]);

  const projectsByStatus = useMemo(() => {
    const grouped: Record<ProjectStatusType, Project[]> = {
      'CR Clearance': [], 'CO Clearance': [], 'Cancel': [], 'On Design': [],
      'On Hold': [], 'Logistics': [], 'Courier': [], 'Delivered': [],
    };

    const sorted = [...filteredProjects].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    sorted.forEach(project => {
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 px-4 sm:px-0">
            <div className="relative">
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-card border-border/50 focus:border-primary pr-8"
              />
              {isDataFetching && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {canFilterUsers && (
              <Popover open={isUserFilterOpen} onOpenChange={setIsUserFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={isUserFilterOpen} className="w-full sm:w-auto justify-between bg-card border-border/50 focus:border-primary h-10">
                    {selectedUser ? (
                      <Avatar className="mr-2 h-6 w-6">
                        <AvatarImage src={selectedUser.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">{getInitials(selectedUser.name)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="truncate">{selectedUserName}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search user..." value={userSearchQuery} onValueChange={setUserSearchQuery} />
                    <CommandList>
                      <CommandEmpty>No user found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem onSelect={() => { setSelectedUserIdFilter('all'); setIsUserFilterOpen(false); }} className="cursor-pointer flex items-center gap-2">
                          <Check className={cn("mr-2 h-4 w-4", selectedUserIdFilter === 'all' ? "opacity-100" : "opacity-0")} />
                          <UsersIcon className="h-5 w-5 text-muted-foreground" />
                          <span>{currentUser?.role === 'DESIGNER_REPRESENTATIVE' ? 'All DRs' : 'All Users'}</span>
                        </CommandItem>
                        {filteredUsersForDropdown.map((user) => (
                          <CommandItem key={user.id} value={user.name} onSelect={() => { setSelectedUserIdFilter(user.id); setIsUserFilterOpen(false); }} className="cursor-pointer flex items-center gap-2">
                            <Check className={cn("mr-2 h-4 w-4", selectedUserIdFilter === user.id ? "opacity-100" : "opacity-0")} />
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={user.avatarUrl || undefined} />
                              <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <span className="truncate">{user.name}</span>
                            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN') &&
                              <span className="text-xs text-muted-foreground ml-auto">({user.role === 'DESIGNER_REPRESENTATIVE' ? 'DR' : user.role})</span>
                            }
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            <DateRangePicker
              initialRange={selectedDateRange}
              onDateRangeChange={handleDateRangeChange}
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
            {currentUser?.role === 'SYSTEM_ADMIN' && (
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={isLoading}
                className="bg-card border-border/50 focus:border-primary"
              >
                {isDataFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export Delivered
              </Button>
            )}
          </div>
        )}

        {(currentUser?.role === 'CRM' && currentUser.isLeader) && !isReadOnly && (
          <div className="px-4 sm:px-0">
            <Select value={projectOwnerFilter} onValueChange={(value) => setProjectOwnerFilter(value as 'my' | 'all')}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select view..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="my">My Projects</SelectItem>
                <SelectItem value="all">All CRM Projects</SelectItem>
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
              />
            ))}
          </div>
          {filteredProjects.length === 0 && !isLoading && (
            <div className="text-center py-10 text-muted-foreground mt-8">
              <ClipboardCheck className="mx-auto h-16 w-16 opacity-30 mb-4" />
              <p className="text-xl font-semibold">No projects found.</p>
              <p className="text-sm">
                {searchTerm || categoryFilter !== 'all'
                  ? "Try adjusting your filters or search term."
                  : "Get started by adding new orders or projects."}
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
            onViewLead={() => { }}
          />
        ) : null}
      </DragOverlay>

      {selectedOrderForDrAssignment && currentUser && allStatuses.length > 0 && isAssignDrDialogOpen && (
        <AssignDrDialog
          isOpen={isAssignDrDialogOpen}
          onOpenChange={(open) => {
            if (!open) setSelectedOrderForDrAssignment(null);
            setIsAssignDrDialogOpen(open);
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
          onSuccess={() => fetchData(true)}
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
            if (!open) {
              const originalStatus = projects.find(p => p.id === projectForLogistics.id)?.status;
              if (originalStatus && originalStatus !== 'Logistics') {
                setProjects(prev => prev.map(p => p.id === projectForLogistics.id ? { ...p, status: originalStatus } : p));
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
