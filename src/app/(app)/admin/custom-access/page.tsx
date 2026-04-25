"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { UserRole, GlobalSettings, ProjectStatusType, User, PipelineAccessSettings, LeadCategory, LeadCategoryAccessSettings, UserRoleDefinition } from "@/types";
import { getGlobalSettings as fetchGlobalSettings } from '@/lib/settings-service';
import { getUsers } from '@/lib/user-service';
import { getRoles } from '@/lib/user-role-service';
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
  updateLeaderboardRestrictionAction,
  addCustomRoleAction,
  updateCustomRoleAction,
  deleteCustomRoleAction,
  reorderRolesAction,
} from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from "@/components/ui/badge";
import { RefreshCw, UserCheck, Trash2, DollarSign, Briefcase, Shield, Filter, FolderKanban, ChevronsUpDown, CheckIcon, Search, CreditCard, Award, Plus, Edit, MoreVertical, AlertTriangle, Loader2, GripVertical } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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

const PROJECT_STAGES: ProjectStatusType[] = ['CR Clearance', 'CO Clearance', 'Cancel', 'On Design', 'On Hold', 'Logistics', 'Courier', 'Delivered'];

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
  const [crmUsers, setCrmUsers] = useState<User[]>([]);
  const [crmSearchTerm, setCrmSearchTerm] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingOrderEditing, setIsSubmittingOrderEditing] = useState(false);
  const [isSubmittingOrderDeletion, setIsSubmittingOrderDeletion] = useState(false);
  const [isSubmittingFinancialVisibility, setIsSubmittingFinancialVisibility] = useState(false);
  const [isSubmittingPaymentValidation, setIsSubmittingPaymentValidation] = useState(false);
  const [isSubmittingLeaderboardRestriction, setIsSubmittingLeaderboardRestriction] = useState(false);
  const [isSubmittingProjectStageAccess, setIsSubmittingProjectStageAccess] = useState(false);
  const [isSubmittingLeadCategoryAccess, setIsSubmittingLeadCategoryAccess] = useState(false);
  const [isSubmittingPipelineAccess, setIsSubmittingPipelineAccess] = useState(false);

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
      const [globalSettings, allUsers, fetchedRoles] = await Promise.all([
        fetchGlobalSettings(),
        getUsers(),
        getRoles()
      ]);
      setAllRoles(fetchedRoles);
      setRolesAllowedToEdit(new Set(globalSettings.rolesAllowedToEditOrders ?? ['ADMIN', 'SYSTEM_ADMIN']));
      setRolesAllowedToDelete(new Set(globalSettings.rolesAllowedToDeleteOrders ?? ['SYSTEM_ADMIN']));
      setRolesAllowedToViewFinancials(new Set(globalSettings.rolesAllowedToViewFinancials ?? ['ADMIN', 'SYSTEM_ADMIN']));
      setProjectStageAccess(globalSettings.projectStageAccess || ({} as Record<ProjectStatusType, UserRole[]>));
      setLeadCategoryAccess(globalSettings.leadCategoryAccess || ({} as Record<LeadCategory, LeadCategoryAccessSettings>));
      setPipelineAccess(new Set(globalSettings.pipelineAccess?.canViewAllLeads ?? []));
      setIsPaymentValidationEnabled(globalSettings.isPaymentValidationEnabled ?? true);
      setIsLeaderboardRestricted(globalSettings.isLeaderboardRestrictedToAdmin ?? false);
      setCrmUsers(allUsers.filter(u => u.role === 'CRM'));
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

  const filteredCrmUsers = useMemo(() => {
    if (!crmSearchTerm) return crmUsers;
    const lowerCaseSearch = crmSearchTerm.toLowerCase();
    return crmUsers.filter(user =>
      user.name.toLowerCase().includes(lowerCaseSearch) ||
      user.email.toLowerCase().includes(lowerCaseSearch)
    );
  }, [crmUsers, crmSearchTerm]);

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

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3"><Shield className="h-8 w-8 text-primary" />Custom Access Control</h1>
          <p className="text-base text-muted-foreground mt-1">Manage role-based permissions for orders, projects, and pipeline visibility.</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading} className="h-10 w-10">
          <RefreshCw className={cn("h-5 w-5", isLoading ? 'animate-spin' : '')} />
        </Button>
      </div>

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="pl-2">Role ID</TableHead>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={`role-skel-${i}`}>
                      <TableCell></TableCell>
                      <TableCell className="pl-2"><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-32 rounded-full" /></TableCell>
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
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg border bg-card rounded-lg overflow-hidden">
          <CardHeader className="border-b p-5">
            <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><UserCheck className="h-6 w-6 text-primary" /> Order Editing Permissions</CardTitle>
            <CardDescription className="text-muted-foreground text-sm mt-0.5">Define which roles can edit order details. System Admins always have permission.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="flex items-center space-x-2"><Skeleton className="h-5 w-5 rounded" /><Skeleton className="h-5 w-52 rounded" /></div>)}</div>
              : <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                {manageableRoles.map((role) => (<div key={role.id} className="flex items-center space-x-3 p-2.5 rounded-md border border-border/30 hover:bg-muted/50 transition-colors">
                  <Checkbox id={`role-edit-perm-${role.id}`} checked={rolesAllowedToEdit.has(role.id as UserRole)} onCheckedChange={(checked) => handleRolePermissionChange(setRolesAllowedToEdit, role.id as UserRole, checked)} disabled={isSubmittingOrderEditing} />
                  <Label htmlFor={`role-edit-perm-${role.id}`} className="text-sm font-medium leading-none cursor-pointer">{role.name}</Label></div>))}
              </div>}
          </CardContent>
          <CardFooter className="border-t p-5 flex justify-end">
            <Button onClick={handleSaveOrderEditingPermissions} disabled={isLoading || isSubmittingOrderEditing}>{isSubmittingOrderEditing ? "Saving..." : "Save Editing Permissions"}</Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg border bg-card rounded-lg overflow-hidden">
          <CardHeader className="border-b p-5">
            <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><Trash2 className="h-6 w-6 text-destructive" /> Order Deletion Permissions</CardTitle>
            <CardDescription className="text-muted-foreground text-sm mt-0.5">Define which roles can delete orders. This is a destructive action.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="flex items-center space-x-2"><Skeleton className="h-5 w-5 rounded" /><Skeleton className="h-5 w-52 rounded" /></div>)}</div>
              : <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                {manageableRoles.map((role) => (<div key={`role-delete-perm-${role.id}`} className="flex items-center space-x-3 p-2.5 rounded-md border border-border/30 hover:bg-muted/50 transition-colors">
                  <Checkbox id={`role-delete-perm-${role.id}`} checked={rolesAllowedToDelete.has(role.id as UserRole)} onCheckedChange={(checked) => handleRolePermissionChange(setRolesAllowedToDelete, role.id as UserRole, checked)} disabled={isSubmittingOrderDeletion} />
                  <Label htmlFor={`role-delete-perm-${role.id}`} className="text-sm font-medium leading-none cursor-pointer">{role.name}</Label></div>))}
              </div>}
          </CardContent>
          <CardFooter className="border-t p-5 flex justify-end">
            <Button onClick={handleSaveOrderDeletionPermissions} disabled={isLoading || isSubmittingOrderDeletion} variant="destructive">
              {isSubmittingOrderDeletion ? "Saving..." : "Save Deletion Permissions"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg border bg-card rounded-lg overflow-hidden">
          <CardHeader className="border-b p-5">
            <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary" /> Financial Visibility</CardTitle>
            <CardDescription className="text-muted-foreground text-sm mt-0.5">Define which roles can see price and payment details on tracking pages.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="flex items-center space-x-2"><Skeleton className="h-5 w-5 rounded" /><Skeleton className="h-5 w-52 rounded" /></div>)}</div>
              : <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-x-6 gap-y-4">
                {manageableRoles.map((role) => (<div key={`role-financial-perm-${role.id}`} className="flex items-center space-x-3 p-2.5 rounded-md border border-border/30 hover:bg-muted/50 transition-colors">
                  <Checkbox id={`role-financial-perm-${role.id}`} checked={rolesAllowedToViewFinancials.has(role.id as UserRole)} onCheckedChange={(checked) => handleRolePermissionChange(setRolesAllowedToViewFinancials, role.id as UserRole, checked)} disabled={isSubmittingFinancialVisibility} />
                  <Label htmlFor={`role-financial-perm-${role.id}`} className="text-sm font-medium leading-none cursor-pointer">{role.name}</Label></div>))}
              </div>}
          </CardContent>
          <CardFooter className="border-t p-5 flex justify-end">
            <Button onClick={handleSaveFinancialVisibilityPermissions} disabled={isLoading || isSubmittingFinancialVisibility}>
              {isSubmittingFinancialVisibility ? "Saving..." : "Save Financial Permissions"}
            </Button>
          </CardFooter>
        </Card>

        <div className="space-y-8">
          <Card className="shadow-lg border bg-card rounded-lg overflow-hidden">
            <CardHeader className="border-b p-5">
              <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><CreditCard className="h-6 w-6 text-primary" /> Payment Validation</CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-0.5">Enable or disable the 45% payment check before moving projects to Logistics.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-between space-x-2 p-3 rounded-md border border-border/30"><Skeleton className="h-5 w-48 rounded" /><Skeleton className="h-6 w-12 rounded-full" /></div>
              ) : (
                <div className="flex items-center justify-between space-x-2 p-3 rounded-md border border-border/30 hover:bg-muted/50 transition-colors">
                  <Label htmlFor="paymentValidationSwitch" className="flex flex-col space-y-1 cursor-pointer">
                    <span>Enforce 45% Payment for Logistics</span>
                    <span className="font-normal leading-snug text-muted-foreground text-xs">If disabled, this check will be skipped.</span>
                  </Label>
                  <Switch
                    id="paymentValidationSwitch"
                    checked={isPaymentValidationEnabled}
                    onCheckedChange={handleTogglePaymentValidation}
                    disabled={isSubmittingPaymentValidation}
                    aria-label="Toggle payment validation enforcement"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg border bg-card rounded-lg overflow-hidden">
            <CardHeader className="border-b p-5">
              <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><Award className="h-6 w-6 text-primary" /> Leaderboard Access</CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-0.5">Restrict leaderboard visibility to administrators only.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-between space-x-2 p-3 rounded-md border border-border/30"><Skeleton className="h-5 w-48 rounded" /><Skeleton className="h-6 w-12 rounded-full" /></div>
              ) : (
                <div className="flex items-center justify-between space-x-2 p-3 rounded-md border border-border/30 hover:bg-muted/50 transition-colors">
                  <Label htmlFor="leaderboardRestrictionSwitch" className="flex flex-col space-y-1 cursor-pointer">
                    <span>Restrict Leaderboard to Admins</span>
                    <span className="font-normal leading-snug text-muted-foreground text-xs">When enabled, non-admin users cannot see the leaderboard.</span>
                  </Label>
                  <Switch
                    id="leaderboardRestrictionSwitch"
                    checked={isLeaderboardRestricted}
                    onCheckedChange={handleToggleLeaderboardRestriction}
                    disabled={isSubmittingLeaderboardRestriction}
                    aria-label="Toggle leaderboard restriction"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-lg border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><Filter className="h-6 w-6 text-primary" />Global Pipeline Access</CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-0.5">Grant special permission to specific CRM users to view all leads, not just their own.</CardDescription>
            </div>
            <div className="relative w-full sm:max-w-xs">
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
                <TableRow><TableHead className="pl-6 w-12">Allow</TableHead><TableHead>CRM User</TableHead><TableHead>Email</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? [...Array(3)].map((_, i) => (
                  <TableRow key={`pipe-skel-${i}`}>
                    <TableCell className="pl-6"><Skeleton className="h-5 w-5 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-52 rounded" /></TableCell>
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
                    <TableCell><Label htmlFor={`pipeline-perm-${user.id}`} className="font-medium cursor-pointer">{user.name}</Label></TableCell>
                    <TableCell><Label htmlFor={`pipeline-perm-${user.id}`} className="text-muted-foreground cursor-pointer">{user.email}</Label></TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No users with the CRM role were found.</TableCell></TableRow>
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
                  {manageableRoles.map(role => (
                    <TableHead key={role.id} className="text-center">{role.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  PROJECT_STAGES.map(stage => (
                    <TableRow key={`skel-stage-${stage}`}>
                      <TableCell className="pl-6"><Skeleton className="h-5 w-32" /></TableCell>
                      {manageableRoles.map(role => (
                        <TableCell key={`skel-cell-${stage}-${role.id}`} className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  PROJECT_STAGES.map(stage => (
                    <TableRow key={stage} className="hover:bg-muted/30">
                      <TableCell className="pl-6 font-medium">{stage}</TableCell>
                      {manageableRoles.map(role => (
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
                  ))
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

      {/* Role Management Dialog */}
      <Dialog open={isAddEditRoleDialogOpen} onOpenChange={setIsAddEditRoleDialogOpen}>
        <DialogContent className="sm:max-w-md">
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
      <TableCell className="pl-2 font-mono text-sm">{role.id}</TableCell>
      <TableCell>
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
      <TableCell>
        <Badge variant={role.isDefault ? "secondary" : "outline"} className="text-[10px] h-5.5 px-2 uppercase tracking-wide">
          {role.isDefault ? "System Default" : "Custom"}
        </Badge>
      </TableCell>
      <TableCell className="text-right pr-6">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(role)}>
            <Edit className="h-4 w-4" />
          </Button>
          {!role.isDefault && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(role)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
