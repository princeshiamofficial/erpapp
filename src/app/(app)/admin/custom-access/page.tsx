
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { UserRole, GlobalSettings, ProjectStatusType } from "@/types";
import { getGlobalSettings as fetchGlobalSettings } from '@/lib/settings-service';
import {
  updateRolesAllowedToEditOrdersAction,
  updateRolesAllowedToDeleteOrdersAction,
  updateRolesAllowedToViewFinancialsAction,
  updateProjectStageAccessAction,
} from '../crm-target-settings/actions'; // Actions are in the same directory
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, UserCheck, Trash2, DollarSign, Briefcase, Shield } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const EDITABLE_ROLES_FOR_ORDERS: UserRole[] = ['ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'];
const DELETABLE_ROLES_FOR_ORDERS: UserRole[] = ['ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE', 'LR'];
const FINANCIAL_VISIBILITY_ROLES: UserRole[] = ['ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE', 'LR'];
const PROJECT_STAGE_ACCESS_ROLES: UserRole[] = ['SYSTEM_ADMIN', 'ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE', 'LR'];
const PROJECT_STAGES: ProjectStatusType[] = ['CR Clearance', 'Cancel', 'On Design', 'On Hold', 'Logistics', 'Courier', 'Delivered'];

export default function CustomAccessPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [rolesAllowedToEdit, setRolesAllowedToEdit] = useState<Set<UserRole>>(new Set(['ADMIN', 'SYSTEM_ADMIN']));
  const [rolesAllowedToDelete, setRolesAllowedToDelete] = useState<Set<UserRole>>(new Set(['SYSTEM_ADMIN']));
  const [rolesAllowedToViewFinancials, setRolesAllowedToViewFinancials] = useState<Set<UserRole>>(new Set(['ADMIN', 'SYSTEM_ADMIN']));
  const [projectStageAccess, setProjectStageAccess] = useState<Record<ProjectStatusType, UserRole[]>>({} as Record<ProjectStatusType, UserRole[]>);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingOrderEditing, setIsSubmittingOrderEditing] = useState(false);
  const [isSubmittingOrderDeletion, setIsSubmittingOrderDeletion] = useState(false);
  const [isSubmittingFinancialVisibility, setIsSubmittingFinancialVisibility] = useState(false);
  const [isSubmittingProjectStageAccess, setIsSubmittingProjectStageAccess] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const globalSettings = await fetchGlobalSettings();
      setRolesAllowedToEdit(new Set(globalSettings.rolesAllowedToEditOrders ?? ['ADMIN', 'SYSTEM_ADMIN']));
      setRolesAllowedToDelete(new Set(globalSettings.rolesAllowedToDeleteOrders ?? ['SYSTEM_ADMIN']));
      setRolesAllowedToViewFinancials(new Set(globalSettings.rolesAllowedToViewFinancials ?? ['ADMIN', 'SYSTEM_ADMIN']));
      setProjectStageAccess(globalSettings.projectStageAccess || ({} as Record<ProjectStatusType, UserRole[]>));
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
    else toast({ title: "Update Failed", description: result.error, variant: "destructive" });
    setIsSubmittingOrderEditing(false);
  };

  const handleSaveOrderDeletionPermissions = async () => {
    setIsSubmittingOrderDeletion(true);
    const result = await updateRolesAllowedToDeleteOrdersAction(Array.from(rolesAllowedToDelete).filter(r => r !== 'SYSTEM_ADMIN'));
    if (result.success) toast({ title: "Permissions Updated", description: "Order deletion permissions saved." });
    else toast({ title: "Update Failed", description: result.error, variant: "destructive" });
    setIsSubmittingOrderDeletion(false);
  };

  const handleSaveFinancialVisibilityPermissions = async () => {
    setIsSubmittingFinancialVisibility(true);
    const result = await updateRolesAllowedToViewFinancialsAction(Array.from(rolesAllowedToViewFinancials).filter(r => r !== 'SYSTEM_ADMIN'));
    if (result.success) toast({ title: "Permissions Updated", description: "Financial visibility permissions saved." });
    else toast({ title: "Update Failed", description: result.error, variant: "destructive" });
    setIsSubmittingFinancialVisibility(false);
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
    else toast({ title: "Update Failed", description: result.error, variant: "destructive" });
    setIsSubmittingProjectStageAccess(false);
  };

  if (!currentUser || currentUser.role !== 'SYSTEM_ADMIN') {
    return <div className="p-8 text-center">Access Denied. You must be a System Administrator to view this page.</div>;
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3"><Shield className="h-8 w-8 text-primary"/>Custom Access Control</h1>
          <p className="text-base text-muted-foreground mt-1">Manage role-based permissions for orders and project stages.</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading} className="h-10 w-10">
          <RefreshCw className={cn("h-5 w-5", isLoading ? 'animate-spin' : '')} />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg border bg-card rounded-lg overflow-hidden">
          <CardHeader className="border-b p-5">
            <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><UserCheck className="h-6 w-6 text-primary" /> Order Editing Permissions</CardTitle>
            <CardDescription className="text-muted-foreground text-sm mt-0.5">Define which roles can edit order details. System Admins always have permission.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="flex items-center space-x-2"><Skeleton className="h-5 w-5 rounded" /><Skeleton className="h-5 w-52 rounded" /></div>)}</div>
              : <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  {EDITABLE_ROLES_FOR_ORDERS.map((role) => (<div key={role} className="flex items-center space-x-3 p-2.5 rounded-md border border-border/30 hover:bg-muted/50 transition-colors">
                      <Checkbox id={`role-edit-perm-${role}`} checked={rolesAllowedToEdit.has(role)} onCheckedChange={(checked) => handleRolePermissionChange(setRolesAllowedToEdit, role, checked)} disabled={isSubmittingOrderEditing}/>
                      <Label htmlFor={`role-edit-perm-${role}`} className="text-sm font-medium leading-none cursor-pointer">{role.replace(/_/g, ' ')}</Label></div>))}
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
                  {DELETABLE_ROLES_FOR_ORDERS.map((role) => (<div key={`role-delete-perm-${role}`} className="flex items-center space-x-3 p-2.5 rounded-md border border-border/30 hover:bg-muted/50 transition-colors">
                      <Checkbox id={`role-delete-perm-${role}`} checked={rolesAllowedToDelete.has(role)} onCheckedChange={(checked) => handleRolePermissionChange(setRolesAllowedToDelete, role, checked)} disabled={isSubmittingOrderDeletion}/>
                      <Label htmlFor={`role-delete-perm-${role}`} className="text-sm font-medium leading-none cursor-pointer">{role.replace(/_/g, ' ')}</Label></div>))}
                </div>}
          </CardContent>
           <CardFooter className="border-t p-5 flex justify-end">
            <Button onClick={handleSaveOrderDeletionPermissions} disabled={isLoading || isSubmittingOrderDeletion} variant="destructive">
              {isSubmittingOrderDeletion ? "Saving..." : "Save Deletion Permissions"}
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <Card className="shadow-lg border bg-card rounded-lg overflow-hidden">
          <CardHeader className="border-b p-5">
            <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary" /> Financial Visibility Permissions</CardTitle>
            <CardDescription className="text-muted-foreground text-sm mt-0.5">Define which roles can see price and payment details on tracking pages.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="flex items-center space-x-2"><Skeleton className="h-5 w-5 rounded" /><Skeleton className="h-5 w-52 rounded" /></div>)}</div>
              : <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                  {FINANCIAL_VISIBILITY_ROLES.map((role) => (<div key={`role-financial-perm-${role}`} className="flex items-center space-x-3 p-2.5 rounded-md border border-border/30 hover:bg-muted/50 transition-colors">
                      <Checkbox id={`role-financial-perm-${role}`} checked={rolesAllowedToViewFinancials.has(role)} onCheckedChange={(checked) => handleRolePermissionChange(setRolesAllowedToViewFinancials, role, checked)} disabled={isSubmittingFinancialVisibility}/>
                      <Label htmlFor={`role-financial-perm-${role}`} className="text-sm font-medium leading-none cursor-pointer">{role.replace(/_/g, ' ')}</Label></div>))}
                </div>}
          </CardContent>
           <CardFooter className="border-t p-5 flex justify-end">
            <Button onClick={handleSaveFinancialVisibilityPermissions} disabled={isLoading || isSubmittingFinancialVisibility}>
                {isSubmittingFinancialVisibility ? "Saving..." : "Save Financial Permissions"}
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
                  {PROJECT_STAGE_ACCESS_ROLES.map(role => (
                    <TableHead key={role} className="text-center">{role.replace(/_/g, ' ')}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  PROJECT_STAGES.map(stage => (
                    <TableRow key={`skel-stage-${stage}`}>
                      <TableCell className="pl-6"><Skeleton className="h-5 w-32" /></TableCell>
                      {PROJECT_STAGE_ACCESS_ROLES.map(role => (
                        <TableCell key={`skel-cell-${stage}-${role}`} className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  PROJECT_STAGES.map(stage => (
                    <TableRow key={stage} className="hover:bg-muted/30">
                      <TableCell className="pl-6 font-medium">{stage}</TableCell>
                      {PROJECT_STAGE_ACCESS_ROLES.map(role => (
                        <TableCell key={`${stage}-${role}`} className="text-center">
                          <Checkbox
                            id={`perm-${stage}-${role}`}
                            checked={projectStageAccess[stage]?.includes(role) || false}
                            onCheckedChange={(checked) => handleProjectStageAccessChange(stage, role, checked)}
                            disabled={isSubmittingProjectStageAccess}
                            aria-label={`Allow ${role} for ${stage} stage`}
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
    </div>
  );
}
