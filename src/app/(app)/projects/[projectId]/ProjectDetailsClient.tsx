
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DndContext, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent, type DragCancelEvent, closestCorners, DragOverlay } from '@dnd-kit/core';
import { useToast } from '@/hooks/use-toast';
import { KanbanColumn } from '@/components/projects/KanbanColumn';
import { ProjectCard } from '@/components/projects/ProjectCard';
import type { Project, CustomStatus, User, GlobalSettings, ProjectStatusType, TrackingLink } from '@/types';
import { updateProjectStatusAction } from '@/app/(app)/projects/actions';
import { getOrderById } from '@/lib/order-service';
import dynamic from 'next/dynamic';
import { Briefcase, EyeOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { DocsCompleteDialog } from '@/components/projects/DocsCompleteDialog';

const AssignDrDialog = dynamic(() => import('@/components/orders/assign-dr-dialog').then(mod => mod.AssignDrDialog));
const HoldReasonDialog = dynamic(() => import('@/components/projects/HoldReasonDialog').then(mod => mod.HoldReasonDialog'));
const CourierConfirmationDialog = dynamic(() => import('@/components/projects/CourierConfirmationDialog').then(mod => mod.CourierConfirmationDialog));
const FileUploadConfirmationDialog = dynamic(() => import('@/components/projects/FileUploadConfirmationDialog').then(mod => mod.FileUploadConfirmationDialog));


const KANBAN_COLUMNS_CONFIG: Array<{ title: string; status: ProjectStatusType; icon: React.ElementType; headerBgClass: string; }> = [
  { title: 'CR Clearance', status: 'CR Clearance', icon: Briefcase, headerBgClass: 'bg-sky-600' },
  { title: 'CO Clearance', status: 'CO Clearance', icon: Briefcase, headerBgClass: 'bg-teal-600' },
  { title: 'On Design', status: 'On Design', icon: Briefcase, headerBgClass: 'bg-purple-600' },
  { title: 'On Hold', status: 'On Hold', icon: Briefcase, headerBgClass: 'bg-yellow-500' },
  { title: 'Logistics', status: 'Logistics', icon: Briefcase, headerBgClass: 'bg-orange-600' },
  { title: 'Courier', status: 'Courier', icon: Briefcase, headerBgClass: 'bg-green-600' },
  { title: 'Delivered', status: 'Delivered', icon: Briefcase, headerBgClass: 'bg-emerald-600' },
  { title: 'Cancel', status: 'Cancel', icon: Briefcase, headerBgClass: 'bg-red-600' },
];

interface ProjectDetailsClientProps {
  initialProject: Project;
  isReadOnly: boolean;
  currentUser: User | null;
  globalSettings: GlobalSettings;
  allUsers: User[];
  allStatuses: CustomStatus[];
}

export function ProjectDetailsClient({
  initialProject,
  isReadOnly,
  currentUser,
  globalSettings,
  allUsers,
  allStatuses,
}: ProjectDetailsClientProps) {
  const [project, setProject] = useState(initialProject);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const { toast } = useToast();
  
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

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const visibleKanbanColumns = useMemo(() => {
    if (isReadOnly || !currentUser || !globalSettings?.projectStageAccess) {
      return KANBAN_COLUMNS_CONFIG; // Show all columns in read-only mode
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
    setActiveProject(event.active.data.current?.project as Project);
  };
  
  const handleDragCancel = () => {
    setActiveProject(null);
  };
  
  const handleConfirmStatusUpdate = useCallback(async (projectToUpdate: Project, newStatus: ProjectStatusType, notes?: string) => {
    if (!currentUser || isReadOnly) return;
    const originalStatus = projectToUpdate.status;
    
    setProject(prev => ({ ...prev!, status: newStatus }));

    const result = await updateProjectStatusAction(projectToUpdate, newStatus, currentUser, notes);
    
    if (!result.success) {
      toast({ title: "Update Failed", description: result.error || `Could not update status.`, variant: "destructive" });
      setProject(prev => ({ ...prev!, status: originalStatus }));
    } else {
      toast({ title: "Project Updated", description: `Project status changed to ${newStatus}.` });
    }
  }, [currentUser, toast, isReadOnly]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveProject(null);
    if (isReadOnly) return;
    const { active, over } = event;
    if (!over || !active.data.current?.project) return;
    const droppedProject = active.data.current.project as Project;
    const newStatus = over.id as ProjectStatusType;
    if (newStatus === droppedProject.status) return;

    if (newStatus === 'On Design' && droppedProject.status !== 'On Design') {
      if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SYSTEM_ADMIN') {
        setProjectForDocsComplete(droppedProject);
        setIsDocsCompleteDialogOpen(true);
        return;
      }
    }
    
    if (newStatus === 'Logistics' && droppedProject.status !== 'Logistics' && globalSettings?.isPaymentValidationEnabled && currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SYSTEM_ADMIN') {
      const order = await getOrderById(droppedProject.id);
      if (!order) { toast({ title: "Error", description: "Could not validate order payment.", variant: "destructive" }); return; }
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

    if (newStatus === 'On Design' && !droppedProject.designerRepresentativeId) { handleOpenAssignDrDialog(droppedProject); return; }
    if (newStatus === 'On Hold') { setProjectToHold(droppedProject); setIsHoldReasonDialogOpen(true); return; }
    if (newStatus === 'Logistics') { setProjectForLogistics(droppedProject); setIsLogisticsConfirmDialogOpen(true); return; }
    if (newStatus === 'Courier') { setProjectToCourier(droppedProject); return; }

    handleConfirmStatusUpdate(droppedProject, newStatus);
  }, [currentUser, globalSettings, toast, handleConfirmStatusUpdate, isReadOnly]);

  const handleOpenAssignDrDialog = useCallback(async (projectToAssign: Project) => {
    if (isReadOnly || !currentUser) return;
    const projectShim: TrackingLink = {
      id: projectToAssign.id, companyName: projectToAssign.name, currentStatus: projectToAssign.status,
      designerRepresentativeId: projectToAssign.designerRepresentativeId || null,
      designerRepresentativeName: projectToAssign.designerRepresentativeName || null,
      address: '', phoneNumber: '', orderItems: [], crmUserId: projectToAssign.assigneeId, crmUserName: projectToAssign.assigneeName,
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
    setProject(prev => ({ ...prev!, status: 'On Design', designerRepresentativeId: updatedOrderFromDialog.designerRepresentativeId, designerRepresentativeName: updatedOrderFromDialog.designerRepresentativeName }));
    toast({ title: "DR Assigned", description: `${updatedOrderFromDialog.designerRepresentativeName} assigned to order ${updatedOrderFromDialog.id}.` });
  }, [toast]);
  
  if (!project) {
    return <div>Project not found.</div>;
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel} collisionDetection={closestCorners}>
      <div className="flex flex-col h-full space-y-4">
        {isReadOnly && (
          <div className="flex items-center justify-center gap-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-md text-sm font-medium mx-4">
            <EyeOff className="h-4 w-4" />
            Read-Only View
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight px-4 sm:px-0">
          Project: <span className="text-muted-foreground">{project.projectIdDisplay}</span>
        </h1>
        <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar-hidden">
          <div className="flex space-x-4 h-full min-w-max px-4 sm:px-0">
            {visibleKanbanColumns.map((col) => (
              <KanbanColumn
                key={col.status} id={col.status} title={col.title} icon={col.icon}
                projects={col.status === project.status ? [project] : []}
                headerBgClass={col.headerBgClass}
                isLoading={false} currentUser={currentUser} allStatuses={allStatuses} allUsers={allUsers}
                onOpenAssignDrDialog={handleOpenAssignDrDialog}
              />
            ))}
          </div>
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
          onOpenChange={(open) => { setIsAssignDrDialogOpen(open); if (!open) setSelectedOrderForDrAssignment(null); }}
          order={selectedOrderForDrAssignment}
          currentUser={currentUser}
          allStatuses={allStatuses}
          onDrAssigned={handleDrAssignmentSuccess}
        />
      )}
      {projectToCourier && currentUser && (
        <CourierConfirmationDialog
          isOpen={!!projectToCourier}
          onOpenChange={(open) => { if (!open) setProjectToCourier(null); }}
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
          onOpenChange={(open) => { if (!open) setProjectForLogistics(null); setIsLogisticsConfirmDialogOpen(open); }}
          onConfirm={(notes) => { handleConfirmStatusUpdate(projectForLogistics, 'Logistics', notes); setProjectForLogistics(null); }}
        />
      )}
      {projectForDocsComplete && (
        <DocsCompleteDialog
          isOpen={isDocsCompleteDialogOpen}
          onOpenChange={setIsDocsCompleteDialogOpen}
          onConfirm={(notes) => {
            setIsDocsCompleteDialogOpen(false);
            const projectShim: TrackingLink = {
              id: projectForDocsComplete.id, companyName: projectForDocsComplete.name, currentStatus: projectForDocsComplete.status,
              designerRepresentativeId: null, designerRepresentativeName: null,
              address: '', phoneNumber: '', orderItems: [], crmUserId: projectForDocsComplete.assigneeId, crmUserName: projectForDocsComplete.assigneeName,
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
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Payment Incomplete</AlertDialogTitle><AlertDialogDescription>{paymentValidationError}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogAction onClick={() => setPaymentValidationError(null)}>OK</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </DndContext>
  );
}
