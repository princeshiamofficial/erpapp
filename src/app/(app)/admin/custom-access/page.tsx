"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { UserRole, GlobalSettings, ProjectStatusType, User, PipelineAccessSettings, LeadCategory, LeadCategoryAccessSettings, UserRoleDefinition, CustomStatus } from "@/types";
import { getGlobalSettings as fetchGlobalSettings } from '@/lib/settings-service';
import { getUsers } from '@/lib/user-service';
import { getRoles } from '@/lib/user-role-service';
import { getStatuses } from '@/lib/status-service';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  updateRolesAllowedToEditOrdersAction,
  updateRolesAllowedToDeleteOrdersAction,
  updateRolesAllowedToViewFinancialsAction,
  updateProjectStageAccessAction,
  updatePipelineAccessAction,
  updateLeadCategoryAccessAction,
  updatePaymentValidationAction,
  addCustomRoleAction,
  updateCustomRoleAction,
  deleteCustomRoleAction,
  reorderRolesAction,
  updateShowAvatarsInOrdersAction,
  updateLeaderboardRestrictionAction,
  updateDesignApprovalStatusIdsAction,
  updateDocsApprovalStatusIdsAction,
} from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from "@/components/ui/badge";
import { RefreshCw, UserCheck, Trash2, DollarSign, Briefcase, Shield, Filter, FolderKanban, ChevronsUpDown, CheckIcon, Search, CreditCard, Award, Plus, Edit, MoreVertical, AlertTriangle, Loader2, GripVertical, Palette, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getContrastTextColor } from '@/lib/color-utils';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const getInitials = (name: string | undefined): string => {
  if (!name) return "U";
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const PROJECT_STAGES: ProjectStatusType[] = ['CR Clearance', 'CO Clearance', 'On Design', 'On Hold', 'Logistics', 'Courier', 'Delivered', 'Cancel', 'Docs Pending', 'Project Pending', 'Business Closed'];

const getStageBadgeClass = (stage: ProjectStatusType) => {
  switch (stage) {
    case 'Project Pending': return 'bg-amber-600 text-amber-50 hover:bg-amber-600/80';
    case 'CR Clearance': return 'bg-sky-600 text-sky-50 hover:bg-sky-600/80';
    case 'CO Clearance': return 'bg-teal-600 text-teal-50 hover:bg-teal-600/80';
    case 'On Design': return 'bg-purple-600 text-purple-50 hover:bg-purple-600/80';
    case 'On Hold': return 'bg-yellow-500 text-yellow-950 hover:bg-yellow-500/80';
    case 'Logistics': return 'bg-orange-600 text-orange-50 hover:bg-orange-600/80';
    case 'Courier': return 'bg-green-600 text-green-50 hover:bg-green-600/80';
    case 'Delivered': return 'bg-emerald-600 text-emerald-50 hover:bg-emerald-600/80';
    case 'Cancel': return 'bg-red-600 text-red-50 hover:bg-red-600/80';
    case 'Docs Pending': return 'bg-indigo-600 text-indigo-50 hover:bg-indigo-600/80';
    case 'Business Closed': return 'bg-zinc-600 text-zinc-50 hover:bg-zinc-600/80';
    default: return 'bg-muted text-muted-foreground';
  }
};

const MAPPED_STAGE_STATUS_IDS = new Set([
  'order-submitted',
  'co-clearance',
  'cancelled',
  'ready-for-design',
  'on-hold',
  'ready-for-logistics',
  'shipped',
  'delivered',
  'docs-pending',
  'project-pending',
  'business-closed'
]);

const mapStatusToStageName = (statusId: string, statusName: string): string => {
  const sId = statusId.toLowerCase();
  if (sId === 'order-submitted') return 'CR Clearance';
  if (sId === 'co-clearance') return 'CO Clearance';
  if (sId === 'cancelled') return 'Cancel';
  if (sId === 'ready-for-design') return 'On Design';
  if (sId === 'on-hold') return 'On Hold';
  if (sId === 'ready-for-logistics') return 'Logistics';
  if (sId === 'shipped') return 'Courier';
  if (sId === 'delivered') return 'Delivered';
  if (sId === 'docs-pending') return 'Docs Pending';
  if (sId === 'project-pending') return 'Project Pending';
  if (sId === 'business-closed') return 'Business Closed';
  return statusName;
};

export default function CustomAccessPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allRoles, setAllRoles] = useState<UserRoleDefinition[]>([]);
  const [rolesAllowedToEdit, setRolesAllowedToEdit] = useState<Set<UserRole>>(new Set(['ADMIN', 'SYSTEM_ADMIN']));
  const [rolesAllowedToDelete, setRolesAllowedToDelete] = useState<Set<UserRole>>(new Set(['SYSTEM_ADMIN']));
  const [rolesAllowedToViewFinancials, setRolesAllowedToViewFinancials] = useState<Set<UserRole>>(new Set(['ADMIN', 'SYSTEM_ADMIN']));
  const [projectStageAccess, setProjectStageAccess] = useState<Record<ProjectStatusType, UserRole[]>>({} as Record<ProjectStatusType, UserRole[]>);
  const [leadCategoryAccess, setLeadCategoryAccess] = useState<Record<LeadCategory, LeadCategoryAccessSettings>>({} as Record<LeadCategory, LeadCategoryAccessSettings>);
  const [pipelineAccess, setPipelineAccess] = useState<Set<string>>(new Set());
  const [isPaymentValidationEnabled, setIsPaymentValidationEnabled] = useState(true);
  const [isLeaderboardRestricted, setIsLeaderboardRestricted] = useState(false);
  const [isShowAvatarsEnabled, setIsShowAvatarsEnabled] = useState(true);
  const [crmUsers, setCrmUsers] = useState<User[]>([]);
  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>([]);
  const [crmSearchTerm, setCrmSearchTerm] = useState('');
  const [showPipelineAccess, setShowPipelineAccess] = useState(false);
  const [designApprovalStatusIds, setDesignApprovalStatusIds] = useState<Set<string>>(new Set());
  const [docsApprovalStatusIds, setDocsApprovalStatusIds] = useState<Set<string>>(new Set());

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingOrderEditing, setIsSubmittingOrderEditing] = useState(false);
  const [isSubmittingOrderDeletion, setIsSubmittingOrderDeletion] = useState(false);
  const [isSubmittingFinancialVisibility, setIsSubmittingFinancialVisibility] = useState(false);
  const [isSubmittingAllPermissions, setIsSubmittingAllPermissions] = useState(false);
  const [isSubmittingPaymentValidation, setIsSubmittingPaymentValidation] = useState(false);
  const [isSubmittingLeaderboardRestriction, setIsSubmittingLeaderboardRestriction] = useState(false);
  const [isSubmittingShowAvatars, setIsSubmittingShowAvatars] = useState(false);
  const [isSubmittingProjectStageAccess, setIsSubmittingProjectStageAccess] = useState(false);
  const [isSubmittingLeadCategoryAccess, setIsSubmittingLeadCategoryAccess] = useState(false);
  const [isSubmittingPipelineAccess, setIsSubmittingPipelineAccess] = useState(false);
  const [isSubmittingDesignApprovalStatuses, setIsSubmittingDesignApprovalStatuses] = useState(false);
  const [isSubmittingDocsApprovalStatuses, setIsSubmittingDocsApprovalStatuses] = useState(false);
  const [isSubmittingAllApprovalStatuses, setIsSubmittingAllApprovalStatuses] = useState(false);

  // Role Management states
  const [isAddEditRoleDialogOpen, setIsAddEditRoleDialogOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<UserRoleDefinition | null>(null);
  const [roleNameInput, setRoleNameInput] = useState('');
  const [roleColorInput, setRoleColorInput] = useState('#6b7280');
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<UserRoleDefinition | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [globalSettings, allUsers, fetchedRoles, fetchedStatuses] = await Promise.all([
        fetchGlobalSettings(),
        getUsers(),
        getRoles(),
        getStatuses()
      ]);
      setAllStatuses(fetchedStatuses);
      setAllRoles(fetchedRoles);
      setRolesAllowedToEdit(new Set(globalSettings.rolesAllowedToEditOrders ?? ['ADMIN', 'SYSTEM_ADMIN']));
      setRolesAllowedToDelete(new Set(globalSettings.rolesAllowedToDeleteOrders ?? ['SYSTEM_ADMIN']));
      setRolesAllowedToViewFinancials(new Set(globalSettings.rolesAllowedToViewFinancials ?? ['ADMIN', 'SYSTEM_ADMIN']));
      setProjectStageAccess(globalSettings.projectStageAccess || ({} as Record<ProjectStatusType, UserRole[]>));
      setLeadCategoryAccess(globalSettings.leadCategoryAccess || ({} as Record<LeadCategory, LeadCategoryAccessSettings>));
      setPipelineAccess(new Set(globalSettings.pipelineAccess?.canViewAllLeads ?? []));
      setIsPaymentValidationEnabled(globalSettings.isPaymentValidationEnabled ?? true);
      setIsLeaderboardRestricted(globalSettings.isLeaderboardRestrictedToAdmin ?? false);
      setIsShowAvatarsEnabled(globalSettings.showAvatarsInOrders ?? true);
      setDesignApprovalStatusIds(new Set(globalSettings.designApprovalStatusIds ?? []));
      setDocsApprovalStatusIds(new Set(globalSettings.docsApprovalStatusIds ?? []));
      setCrmUsers(allUsers.filter(u => u.role === 'CRM' && !u.isBanned));
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({ title: "Error", description: "Could not load access settings.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser?.role === 'SYSTEM_ADMIN') {
      fetchData();
    } else if (currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, router, fetchData]);

  const handleRolePermissionChange = (setter: React.Dispatch<React.SetStateAction<Set<UserRole>>>, role: UserRole, checked: boolean | "indeterminate") => {
    setter(prev => {
      const newSet = new Set(prev);
      if (checked) newSet.add(role);
      else newSet.delete(role);
      return newSet;
    });
  };

  const handleSaveOrderEditingPermissions = async () => {
    setIsSubmittingOrderEditing(true);
    const result = await updateRolesAllowedToEditOrdersAction(Array.from(rolesAllowedToEdit).filter(r => r !== 'SYSTEM_ADMIN'));
    if (result.success) toast({ title: "Permissions Updated", description: "Order editing permissions saved." });
    else toast({ title: "Update Failed", description: result.error || "An unexpected error occurred.", variant: "destructive" });
    setIsSubmittingOrderEditing(false);
  };

  const handleSaveOrderDeletionPermissions = async () => {
    setIsSubmittingOrderDeletion(true);
    const result = await updateRolesAllowedToDeleteOrdersAction(Array.from(rolesAllowedToDelete).filter(r => r !== 'SYSTEM_ADMIN'));
    if (result.success) toast({ title: "Permissions Updated", description: "Order deletion permissions saved." });
    else toast({ title: "Update Failed", description: result.error || "An unexpected error occurred.", variant: "destructive" });
    setIsSubmittingOrderDeletion(false);
  };

  const handleSaveFinancialVisibilityPermissions = async () => {
    setIsSubmittingFinancialVisibility(true);
    const result = await updateRolesAllowedToViewFinancialsAction(Array.from(rolesAllowedToViewFinancials).filter(r => r !== 'SYSTEM_ADMIN'));
    if (result.success) toast({ title: "Permissions Updated", description: "Financial visibility permissions saved." });
    else toast({ title: "Update Failed", description: result.error || "An unexpected error occurred.", variant: "destructive" });
    setIsSubmittingFinancialVisibility(false);
  };

  const handleSaveAllPermissions = async () => {
    setIsSubmittingAllPermissions(true);
    try {
      const [editRes, deleteRes, financialRes] = await Promise.all([
        updateRolesAllowedToEditOrdersAction(Array.from(rolesAllowedToEdit).filter(r => r !== 'SYSTEM_ADMIN')),
        updateRolesAllowedToDeleteOrdersAction(Array.from(rolesAllowedToDelete).filter(r => r !== 'SYSTEM_ADMIN')),
        updateRolesAllowedToViewFinancialsAction(Array.from(rolesAllowedToViewFinancials).filter(r => r !== 'SYSTEM_ADMIN'))
      ]);

      if (editRes.success && deleteRes.success && financialRes.success) {
        toast({ title: "Permissions Updated", description: "All permissions saved successfully." });
      } else {
        const errors = [];
        if (!editRes.success) errors.push(editRes.error || "Editing update failed");
        if (!deleteRes.success) errors.push(deleteRes.error || "Deletion update failed");
        if (!financialRes.success) errors.push(financialRes.error || "Financials update failed");
        toast({ title: "Partial Update Failure", description: errors.join(", "), variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Update Failed", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSubmittingAllPermissions(false);
    }
  };

  const handleTogglePaymentValidation = async (enabled: boolean) => {
    setIsSubmittingPaymentValidation(true);
    const result = await updatePaymentValidationAction(enabled);
    if (result.success) {
      setIsPaymentValidationEnabled(enabled);
      toast({ title: "Settings Updated", description: `Payment validation is now ${enabled ? 'enabled' : 'disabled'}.` });
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not update payment validation setting.", variant: "destructive" });
    }
    setIsSubmittingPaymentValidation(false);
  };

  const handleToggleLeaderboardRestriction = async (restricted: boolean) => {
    setIsSubmittingLeaderboardRestriction(true);
    const result = await updateLeaderboardRestrictionAction(restricted);
    if (result.success) {
      setIsLeaderboardRestricted(restricted);
      toast({ title: "Settings Updated", description: `Leaderboard access is now ${restricted ? 'restricted to admins' : 'open to all permitted roles'}.` });
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not update leaderboard restriction setting.", variant: "destructive" });
    }
    setIsSubmittingLeaderboardRestriction(false);
  };

  const handleToggleShowAvatars = async (show: boolean) => {
    setIsSubmittingShowAvatars(true);
    const result = await updateShowAvatarsInOrdersAction(show);
    if (result.success) {
      setIsShowAvatarsEnabled(show);
      toast({ title: "Settings Updated", description: `Avatars in orders are now ${show ? 'visible' : 'hidden'}.` });
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not update avatar visibility setting.", variant: "destructive" });
    }
    setIsSubmittingShowAvatars(false);
  };

  const handleProjectStageAccessChange = (stage: ProjectStatusType, role: UserRole, checked: boolean | "indeterminate") => {
    setProjectStageAccess(prev => {
      const newPermissions = { ...prev };
      const currentRolesForStage = new Set(newPermissions[stage] || []);
      if (checked) currentRolesForStage.add(role);
      else currentRolesForStage.delete(role);
      newPermissions[stage] = Array.from(currentRolesForStage);
      return newPermissions;
    });
  };

  const handleSaveProjectStageAccess = async () => {
    setIsSubmittingProjectStageAccess(true);
    const result = await updateProjectStageAccessAction(projectStageAccess);
    if (result.success) toast({ title: "Permissions Updated", description: "Project stage access permissions saved." });
    else toast({ title: "Update Failed", description: result.error || "An unexpected error occurred.", variant: "destructive" });
    setIsSubmittingProjectStageAccess(false);
  };

  const handlePipelineAccessChange = (userId: string, checked: boolean | "indeterminate") => {
    setPipelineAccess(prev => {
      const newSet = new Set(prev);
      if (checked) newSet.add(userId);
      else newSet.delete(userId);
      return newSet;
    });
  };

  const handleSavePipelineAccess = async () => {
    setIsSubmittingPipelineAccess(true);
    const result = await updatePipelineAccessAction({ canViewAllLeads: Array.from(pipelineAccess) });
    if (result.success) toast({ title: "Permissions Updated", description: "Pipeline access permissions saved." });
    else toast({ title: "Update Failed", description: result.error || "An unexpected error occurred.", variant: "destructive" });
    setIsSubmittingPipelineAccess(false);
  };

  const handleDesignApprovalStatusChange = (statusId: string, checked: boolean | "indeterminate") => {
    setDesignApprovalStatusIds(prev => {
      const newSet = new Set(prev);
      if (checked) newSet.add(statusId);
      else newSet.delete(statusId);
      return newSet;
    });
  };

  const handleDocsApprovalStatusChange = (statusId: string, checked: boolean | "indeterminate") => {
    setDocsApprovalStatusIds(prev => {
      const newSet = new Set(prev);
      if (checked) newSet.add(statusId);
      else newSet.delete(statusId);
      return newSet;
    });
  };

  const handleSaveDesignApprovalStatuses = async () => {
    setIsSubmittingDesignApprovalStatuses(true);
    const result = await updateDesignApprovalStatusIdsAction(Array.from(designApprovalStatusIds));
    if (result.success) toast({ title: "Statuses Updated", description: "Design Approval statuses saved." });
    else toast({ title: "Update Failed", description: result.error || "An unexpected error occurred.", variant: "destructive" });
    setIsSubmittingDesignApprovalStatuses(false);
  };

  const handleSaveDocsApprovalStatuses = async () => {
    setIsSubmittingDocsApprovalStatuses(true);
    const result = await updateDocsApprovalStatusIdsAction(Array.from(docsApprovalStatusIds));
    if (result.success) toast({ title: "Statuses Updated", description: "Docs Approval statuses saved." });
    else toast({ title: "Update Failed", description: result.error || "An unexpected error occurred.", variant: "destructive" });
    setIsSubmittingDocsApprovalStatuses(false);
  };

  const handleSaveAllApprovalStatuses = async () => {
    setIsSubmittingAllApprovalStatuses(true);
    try {
      const [designRes, docsRes] = await Promise.all([
        updateDesignApprovalStatusIdsAction(Array.from(designApprovalStatusIds)),
        updateDocsApprovalStatusIdsAction(Array.from(docsApprovalStatusIds))
      ]);

      if (designRes.success && docsRes.success) {
        toast({ title: "Settings Updated", description: "Approval status configurations saved successfully." });
      } else {
        const errors = [];
        if (!designRes.success) errors.push(designRes.error || "Design statuses update failed");
        if (!docsRes.success) errors.push(docsRes.error || "Document statuses update failed");
        toast({ title: "Partial Update Failure", description: errors.join(", "), variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Update Failed", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSubmittingAllApprovalStatuses(false);
    }
  };

  const filteredCrmUsers = useMemo(() => {
    if (!crmSearchTerm) return crmUsers;
    const lowerCaseSearch = crmSearchTerm.toLowerCase();
    return crmUsers.filter(user =>
      user.name.toLowerCase().includes(lowerCaseSearch) ||
      user.email.toLowerCase().includes(lowerCaseSearch)
    );
  }, [crmUsers, crmSearchTerm]);

  const filteredApprovalStatuses = useMemo(() => {
    const mapped = allStatuses.filter(status => MAPPED_STAGE_STATUS_IDS.has(status.id));
    return mapped.sort((a, b) => {
      const aStage = mapStatusToStageName(a.id, a.name);
      const bStage = mapStatusToStageName(b.id, b.name);
      return PROJECT_STAGES.indexOf(aStage as any) - PROJECT_STAGES.indexOf(bStage as any);
    });
  }, [allStatuses]);

  // Role Management handlers
  const handleOpenAddRole = () => {
    setRoleToEdit(null);
    setRoleNameInput('');
    setRoleColorInput('#6b7280');
    setIsAddEditRoleDialogOpen(true);
  };

  const handleOpenEditRole = (role: UserRoleDefinition) => {
    setRoleToEdit(role);
    setRoleNameInput(role.name);
    setRoleColorInput(role.color || '#6b7280');
    setIsAddEditRoleDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!roleNameInput.trim()) return;
    setIsSubmittingRole(true);
    let result;
    if (roleToEdit) {
      result = await updateCustomRoleAction(roleToEdit.id, roleNameInput.trim(), roleColorInput);
    } else {
      result = await addCustomRoleAction(roleNameInput.trim(), roleColorInput);
    }
    setIsSubmittingRole(false);
    if (result.success) {
      toast({ title: "Success", description: `Role ${roleToEdit ? 'updated' : 'added'} successfully.` });
      setIsAddEditRoleDialogOpen(false);
      fetchData();
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    setIsSubmittingRole(true);
    const result = await deleteCustomRoleAction(roleToDelete.id);
    setIsSubmittingRole(false);
    if (result.success) {
      toast({ title: "Success", description: "Role deleted successfully." });
      setIsDeleteDialogOpen(false);
      fetchData();
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = allRoles.findIndex((r) => r.id === active.id);
      const newIndex = allRoles.findIndex((r) => r.id === over.id);

      const newRoles = arrayMove(allRoles, oldIndex, newIndex);
      setAllRoles(newRoles);

      const result = await reorderRolesAction(newRoles.map(r => r.id));
      if (!result.success) {
        toast({ title: "Reorder Failed", description: result.error || "Could not save new role order.", variant: "destructive" });
        fetchData(); // Revert on failure
      } else {
        toast({ title: "Order Saved", description: "New roles priority order has been saved." });
      }
    }
  };


  if (!currentUser || currentUser.role !== 'SYSTEM_ADMIN') {
    return <div className="p-8 text-center">Access Denied. You must be a System Administrator to view this page.</div>;
  }

  const manageableRoles = allRoles.filter(r => r.id !== 'SYSTEM_ADMIN');
  const defaultManageableRoles = manageableRoles.filter(r => r.isDefault && r.id !== 'VENDOR');

  return (
    <div className="space-y-8">


      <Tabs defaultValue="permissions" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <TabsList className="flex flex-wrap md:inline-flex h-auto w-full md:w-auto gap-1 bg-muted p-1 rounded-lg">
            <TabsTrigger value="permissions" className="data-[state=active]:bg-background">Permissions</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-background">General Settings</TabsTrigger>
            <TabsTrigger value="approvals" className="data-[state=active]:bg-background">Approval Statuses</TabsTrigger>
            <TabsTrigger value="roles" className="data-[state=active]:bg-background">User Roles</TabsTrigger>
            <TabsTrigger value="stages" className="data-[state=active]:bg-background">Project Stages</TabsTrigger>
          </TabsList>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowPipelineAccess(!showPipelineAccess)}
            className="flex items-center gap-2 shadow-sm"
          >
            {showPipelineAccess ? <Filter className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
            {showPipelineAccess ? "Hide" : "Show"} Pipeline Access
          </Button>
        </div>

        <TabsContent value="permissions" className="space-y-8 outline-none">
            <Card className="shadow-lg border bg-card rounded-lg overflow-hidden">
              <CardHeader className="border-b p-5">
                <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /> Role Permissions Management</CardTitle>
                <CardDescription className="text-muted-foreground text-sm mt-0.5">Configure global access controls for editing, deletion, and financials visibility.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/50">
                        <TableHead className="pl-6 w-[200px] font-semibold text-card-foreground text-xs uppercase tracking-wider">Role</TableHead>
                        <TableHead className="text-center font-semibold text-card-foreground text-xs uppercase tracking-wider">Edit Order</TableHead>
                        <TableHead className="text-center font-semibold text-card-foreground text-xs uppercase tracking-wider">Delete Order</TableHead>
                        <TableHead className="text-center font-semibold text-card-foreground text-xs uppercase tracking-wider">Financial</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        [...Array(4)].map((_, i) => (
                          <TableRow key={`perm-skel-row-${i}`}>
                            <TableCell className="pl-6"><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto rounded" /></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto rounded" /></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto rounded" /></TableCell>
                          </TableRow>
                        ))
                      ) : (
                        defaultManageableRoles.map((role) => (
                          <TableRow key={role.id} className="hover:bg-muted/30">
                            <TableCell className="pl-6 font-medium">
                              <Badge
                                style={{
                                  backgroundColor: role.color || '#6b7280',
                                  color: getContrastTextColor(role.color || '#6b7280')
                                }}
                                className="border-none px-2.5 py-1 text-[11px] font-bold uppercase tracking-tight"
                              >
                                {role.name}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                id={`role-edit-perm-${role.id}`}
                                checked={rolesAllowedToEdit.has(role.id as UserRole)}
                                onCheckedChange={(checked) => handleRolePermissionChange(setRolesAllowedToEdit, role.id as UserRole, checked)}
                                disabled={isSubmittingAllPermissions}
                                aria-label={`Allow ${role.name} to edit orders`}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                id={`role-delete-perm-${role.id}`}
                                checked={rolesAllowedToDelete.has(role.id as UserRole)}
                                onCheckedChange={(checked) => handleRolePermissionChange(setRolesAllowedToDelete, role.id as UserRole, checked)}
                                disabled={isSubmittingAllPermissions}
                                aria-label={`Allow ${role.name} to delete orders`}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                id={`role-financial-perm-${role.id}`}
                                checked={rolesAllowedToViewFinancials.has(role.id as UserRole)}
                                onCheckedChange={(checked) => handleRolePermissionChange(setRolesAllowedToViewFinancials, role.id as UserRole, checked)}
                                disabled={isSubmittingAllPermissions}
                                aria-label={`Allow ${role.name} to view financials`}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              <CardFooter className="border-t p-4 flex justify-end">
                <Button onClick={handleSaveAllPermissions} disabled={isLoading || isSubmittingAllPermissions}>
                  {isSubmittingAllPermissions ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving Permissions...
                    </>
                  ) : "Save Permissions"}
                </Button>
              </CardFooter>
            </Card>

          {showPipelineAccess && (
            <Card className="shadow-lg border bg-card rounded-lg overflow-hidden">
              <CardHeader className="border-b p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><Filter className="h-6 w-6 text-primary" />Global Pipeline Access</CardTitle>
                    <CardDescription className="text-muted-foreground text-sm mt-0.5">Grant special permission to specific CRM users to view all leads, not just their own.</CardDescription>
                  </div>
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search CRM users..."
                      value={crmSearchTerm}
                      onChange={(e) => setCrmSearchTerm(e.target.value)}
                      className="pl-10 h-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-auto max-h-80">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead className="pl-6 w-12">Allow</TableHead><TableHead>CRM User</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? [...Array(3)].map((_, i) => (
                        <TableRow key={`pipe-skel-${i}`}>
                          <TableCell className="pl-6"><Skeleton className="h-5 w-5 rounded" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-40 rounded" /></TableCell>
                        </TableRow>
                      )) : filteredCrmUsers.length > 0 ? filteredCrmUsers.map(user => (
                        <TableRow key={user.id} className="hover:bg-muted/30">
                          <TableCell className="pl-6">
                            <Checkbox
                              id={`pipeline-perm-${user.id}`}
                              checked={pipelineAccess.has(user.id)}
                              onCheckedChange={(checked) => handlePipelineAccessChange(user.id, checked)}
                              disabled={isSubmittingPipelineAccess}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={user.avatarUrl || undefined} />
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <Label htmlFor={`pipeline-perm-${user.id}`} className="font-medium cursor-pointer">{user.name}</Label>
                            </div>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={2} className="text-center h-24 text-muted-foreground">No users with the CRM role were found.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
              <CardFooter className="border-t p-5 flex justify-end">
                <Button onClick={handleSavePipelineAccess} disabled={isLoading || isSubmittingPipelineAccess}>
                  {isSubmittingPipelineAccess ? "Saving..." : "Save Global Access"}
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-8 outline-none">
          <Card className="shadow-lg border bg-card rounded-lg overflow-hidden">
            <CardHeader className="border-b p-5">
              <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><CreditCard className="h-6 w-6 text-primary" /> Global Platform Settings</CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-0.5">Toggle global system rules, verification checks, and display options.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={`skel-settings-${i}`} className="flex items-center justify-between space-x-2 p-3 rounded-md border border-border/30">
                      <Skeleton className="h-5 w-48 rounded" />
                      <Skeleton className="h-6 w-12 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Switch 1: Payment Validation */}
                  <div className="flex items-center justify-between space-x-2 p-4 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors">
                    <Label htmlFor="paymentValidationSwitch" className="flex flex-col space-y-1 cursor-pointer">
                      <span className="font-semibold text-card-foreground text-sm flex items-center gap-2"><CreditCard className="h-4 w-4 text-muted-foreground" /> Enforce 45% Payment for Logistics</span>
                      <span className="font-normal leading-snug text-muted-foreground text-xs">Enable or disable the 45% payment check before moving projects to Logistics stage.</span>
                    </Label>
                    <Switch
                      id="paymentValidationSwitch"
                      checked={isPaymentValidationEnabled}
                      onCheckedChange={handleTogglePaymentValidation}
                      disabled={isSubmittingPaymentValidation}
                      aria-label="Toggle payment validation enforcement"
                    />
                  </div>

                  {/* Switch 2: Leaderboard Access */}
                  <div className="flex items-center justify-between space-x-2 p-4 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors">
                    <Label htmlFor="leaderboardRestrictionSwitch" className="flex flex-col space-y-1 cursor-pointer">
                      <span className="font-semibold text-card-foreground text-sm flex items-center gap-2"><Award className="h-4 w-4 text-muted-foreground" /> Restrict Leaderboard to Admins</span>
                      <span className="font-normal leading-snug text-muted-foreground text-xs">When enabled, only administrators will have visibility of the leaderboard.</span>
                    </Label>
                    <Switch
                      id="leaderboardRestrictionSwitch"
                      checked={isLeaderboardRestricted}
                      onCheckedChange={handleToggleLeaderboardRestriction}
                      disabled={isSubmittingLeaderboardRestriction}
                      aria-label="Toggle leaderboard restriction"
                    />
                  </div>

                  {/* Switch 3: Order Avatars */}
                  <div className="flex items-center justify-between space-x-2 p-4 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors">
                    <Label htmlFor="showAvatarsSwitch" className="flex flex-col space-y-1 cursor-pointer">
                      <span className="font-semibold text-card-foreground text-sm flex items-center gap-2"><UserCheck className="h-4 w-4 text-muted-foreground" /> Show Avatars in Orders</span>
                      <span className="font-normal leading-snug text-muted-foreground text-xs">Display user profile images in the CRM Contact and DR columns of the orders list.</span>
                    </Label>
                    <Switch
                      id="showAvatarsSwitch"
                      checked={isShowAvatarsEnabled}
                      onCheckedChange={handleToggleShowAvatars}
                      disabled={isSubmittingShowAvatars}
                      aria-label="Toggle avatars in orders"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-8 outline-none">
          <Card className="shadow-lg border bg-card rounded-lg overflow-hidden">
            <CardHeader className="border-b p-5">
              <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><Palette className="h-6 w-6 text-primary" /> Client Approval Statuses</CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-0.5">Configure which order statuses allow the client to approve designs or documents.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/50">
                      <TableHead className="pl-6 w-[250px] font-semibold text-card-foreground text-xs uppercase tracking-wider">Project Stage</TableHead>
                      <TableHead className="text-center font-semibold text-card-foreground text-xs uppercase tracking-wider">Allow Design Approval</TableHead>
                      <TableHead className="text-center font-semibold text-card-foreground text-xs uppercase tracking-wider">Allow Document Approval</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      [...Array(4)].map((_, i) => (
                        <TableRow key={`appr-skel-row-${i}`}>
                          <TableCell className="pl-6"><Skeleton className="h-5 w-32 rounded" /></TableCell>
                          <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto rounded" /></TableCell>
                          <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto rounded" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredApprovalStatuses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No order statuses found.</TableCell>
                      </TableRow>
                    ) : (
                      filteredApprovalStatuses.map((status) => (
                        <TableRow key={status.id} className="hover:bg-muted/30">
                          <TableCell className="pl-6 font-medium flex items-center gap-2 h-12">
                            <span className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: status.color }} />
                            <span className="text-sm font-medium text-card-foreground">{mapStatusToStageName(status.id, status.name)}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              id={`design-appr-perm-${status.id}`}
                              checked={designApprovalStatusIds.has(status.id)}
                              onCheckedChange={(checked) => handleDesignApprovalStatusChange(status.id, checked)}
                              disabled={isSubmittingAllApprovalStatuses}
                              aria-label={`Allow Design Approval for ${status.name}`}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              id={`docs-appr-perm-${status.id}`}
                              checked={docsApprovalStatusIds.has(status.id)}
                              onCheckedChange={(checked) => handleDocsApprovalStatusChange(status.id, checked)}
                              disabled={isSubmittingAllApprovalStatuses}
                              aria-label={`Allow Document Approval for ${status.name}`}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="border-t p-4 flex justify-end">
              <Button onClick={handleSaveAllApprovalStatuses} disabled={isLoading || isSubmittingAllApprovalStatuses}>
                {isSubmittingAllApprovalStatuses ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Statuses...
                  </>
                ) : "Save Approval Statuses"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-8 outline-none">
          <Card className="shadow-lg border bg-card rounded-lg overflow-hidden">
            <CardHeader className="border-b p-5">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><Briefcase className="h-6 w-6 text-primary" /> User Roles Management</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm mt-0.5">Drag rows to change role priority. System roles cannot be deleted.</CardDescription>
                </div>
                <Button onClick={handleOpenAddRole} size="sm">
                  <Plus className="h-4 w-4 mr-2" /> Add Custom Role
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[800px] overflow-y-auto custom-scrollbar relative">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-20 shadow-sm">
                      <TableRow className="border-b border-border/50">
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead className="pl-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role Name</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role ID</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</TableHead>
                        <TableHead className="text-right pr-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        [...Array(3)].map((_, i) => (
                          <TableRow key={`role-skel-${i}`}>
                            <TableCell className="w-[50px]"></TableCell>
                            <TableCell className="pl-2"><Skeleton className="h-6 w-32 rounded-full" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell className="text-right pr-6"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <SortableContext
                          items={allRoles.map(r => r.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {allRoles.map(role => (
                            <SortableRoleRow
                              key={role.id}
                              role={role}
                              onEdit={handleOpenEditRole}
                              onDelete={(r) => { setRoleToDelete(r); setIsDeleteDialogOpen(true); }}
                            />
                          ))}
                        </SortableContext>
                      )}
                    </TableBody>
                  </Table>
                </DndContext>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages" className="space-y-8 outline-none">
          <Card className="shadow-lg border bg-card rounded-lg overflow-hidden">
            <CardHeader className="border-b p-5">
              <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><Briefcase className="h-6 w-6 text-primary" />Project Stage Access</CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-0.5">Define which user roles can view and move projects to each Kanban stage.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6 font-semibold">Stage</TableHead>
                      {defaultManageableRoles.map(role => (
                        <TableHead key={role.id} className="text-center">{role.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      PROJECT_STAGES.map(stage => (
                        <TableRow key={`skel-stage-${stage}`}>
                          <TableCell className="pl-6"><Skeleton className="h-5 w-32" /></TableCell>
                          {defaultManageableRoles.map(role => (
                            <TableCell key={`skel-cell-${stage}-${role.id}`} className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      PROJECT_STAGES.map(stage => {
                        return (
                          <TableRow key={stage} className="hover:bg-muted/30">
                            <TableCell className="pl-6 font-medium">
                              <Badge className={cn("border-transparent font-medium rounded", getStageBadgeClass(stage))}>
                                {stage}
                              </Badge>
                            </TableCell>
                            {defaultManageableRoles.map(role => (
                              <TableCell key={`${stage}-${role.id}`} className="text-center">
                                <Checkbox
                                  id={`perm-${stage}-${role.id}`}
                                  checked={projectStageAccess[stage]?.includes(role.id as UserRole) || false}
                                  onCheckedChange={(checked) => handleProjectStageAccessChange(stage, role.id as UserRole, checked)}
                                  disabled={isSubmittingProjectStageAccess}
                                  aria-label={`Allow ${role.name} for ${stage} stage`}
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="border-t p-5 flex justify-end">
              <Button onClick={handleSaveProjectStageAccess} disabled={isLoading || isSubmittingProjectStageAccess}>
                {isSubmittingProjectStageAccess ? "Saving Permissions..." : "Save Stage Permissions"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Role Management Dialog */}
      <Dialog open={isAddEditRoleDialogOpen} onOpenChange={setIsAddEditRoleDialogOpen}>
        <DialogContent className="sm:max-w-md" onFocusOutside={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{roleToEdit ? 'Edit Role' : 'Add Custom Role'}</DialogTitle>
            <DialogDescription>
              Custom roles will be available for user assignments and access matrices.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                value={roleNameInput}
                onChange={e => setRoleNameInput(e.target.value)}
                placeholder="e.g., MANAGER"
                disabled={roleToEdit?.isDefault && currentUser?.role !== 'SYSTEM_ADMIN'}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="role-color">Role Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="role-color"
                  type="color"
                  value={roleColorInput}
                  onChange={e => setRoleColorInput(e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <div
                  className="flex-1 h-10 rounded-md border flex items-center justify-center font-medium"
                  style={{
                    backgroundColor: roleColorInput,
                    color: getContrastTextColor(roleColorInput)
                  }}
                >
                  Preview Badge
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddEditRoleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRole} disabled={isSubmittingRole || !roleNameInput.trim()}>
              {isSubmittingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Alert */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Delete Role?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "<span className="font-semibold">{roleToDelete?.name}</span>"? This may affect users currently assigned to this role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} className="bg-destructive hover:bg-destructive/90">
              {isSubmittingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SortableRoleRow({
  role,
  onEdit,
  onDelete
}: {
  role: UserRoleDefinition;
  onEdit: (role: UserRoleDefinition) => void;
  onDelete: (role: UserRoleDefinition) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: role.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    position: isDragging ? 'relative' as const : 'static' as const,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={cn(isDragging && "bg-muted shadow-lg")}>
      <TableCell className="w-[50px]">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="pl-2">
        <Badge
          style={{
            backgroundColor: role.color || '#6b7280',
            color: getContrastTextColor(role.color || '#6b7280')
          }}
          className="border-none px-2.5 py-1 text-[11px] font-bold uppercase tracking-tight"
        >
          {role.name}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-sm">{role.id}</TableCell>
      <TableCell>
        <Badge variant={role.isDefault ? "secondary" : "outline"} className="text-[10px] h-5.5 px-2 uppercase tracking-wide">
          {role.isDefault ? "System Default" : "Custom"}
        </Badge>
      </TableCell>
      <TableCell className="text-right pr-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onEdit(role)} className="cursor-pointer">
              <Edit className="h-4 w-4 mr-2" />
              Edit Role
            </DropdownMenuItem>
            {!role.isDefault && (
              <DropdownMenuItem className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => onDelete(role)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Role
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
