
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { UserRole, GlobalSettings, ProjectStatusType, User, PipelineAccessSettings, LeadCategory, LeadCategoryAccessSettings } from "@/types";
import { getGlobalSettings as fetchGlobalSettings } from '@/lib/settings-service';
import { getUsers } from '@/lib/user-service';
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
} from '../crm-target-settings/actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, UserCheck, Trash2, DollarSign, Briefcase, Shield, Filter, FolderKanban, ChevronsUpDown, CheckIcon, Search, CreditCard, Award } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const EDITABLE_ROLES_FOR_ORDERS: UserRole[] = ['ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'];
const DELETABLE_ROLES_FOR_ORDERS: UserRole[] = ['ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE', 'LR'];
const FINANCIAL_VISIBILITY_ROLES: UserRole[] = ['ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE', 'LR'];
const PROJECT_STAGE_ACCESS_ROLES: UserRole[] = ['SYSTEM_ADMIN', 'ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE', 'LR', 'CO'];
const PROJECT_STAGES: ProjectStatusType[] = ['CR Clearance', 'CO Clearance', 'Cancel', 'On Design', 'On Hold', 'Logistics', 'Courier', 'Delivered'];
const LEAD_CATEGORY_ACCESS_ROLES: UserRole[] = ['SYSTEM_ADMIN', 'ADMIN', 'CRM'];
const LEAD_CATEGORIES: LeadCategory[] = ['POP', 'POG', 'OC', 'OD', 'ROD'];

export default function CustomAccessPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

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
  const [isLeadCategoryAccessVisible, setIsLeadCategoryAccessVisible] = useState(false);
  
  const [popoverStates, setPopoverStates] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [globalSettings, allUsers] = await Promise.all([
          fetchGlobalSettings(),
          getUsers()
      ]);
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
    else toast({ title: "Update Failed", description: result.error, variant: "destructive" });
    setIsSubmittingProjectStageAccess(false);
  };
  
  const handleLeadCategoryRoleChange = (category: LeadCategory, role: UserRole, checked: boolean | "indeterminate") => {
    setLeadCategoryAccess(prev => {
      const newPermissions = { ...prev };
      const currentRoles = new Set(newPermissions[category]?.roles || []);
      if (checked) currentRoles.add(role); else currentRoles.delete(role);
      if (!newPermissions[category]) newPermissions[category] = { roles: [], specialAccess: [] };
      newPermissions[category].roles = Array.from(currentRoles);
      return newPermissions;
    });
  };

  const handleLeadCategorySpecialAccessChange = (category: LeadCategory, userId: string) => {
    setLeadCategoryAccess(prev => {
      const newPermissions = { ...prev };
      if (!newPermissions[category]) {
        newPermissions[category] = { roles: [], specialAccess: [] };
      }
      const currentSpecialAccess = new Set(newPermissions[category].specialAccess);
      if (currentSpecialAccess.has(userId)) {
        currentSpecialAccess.delete(userId);
      } else {
        currentSpecialAccess.add(userId);
      }
      newPermissions[category].specialAccess = Array.from(currentSpecialAccess);
      return newPermissions;
    });
  };

  const handleSaveLeadCategoryAccess = async () => {
    setIsSubmittingLeadCategoryAccess(true);
    const result = await updateLeadCategoryAccessAction(leadCategoryAccess);
    if (result.success) toast({ title: "Permissions Updated", description: "Lead category access permissions saved." });
    else toast({ title: "Update Failed", description: result.error, variant: "destructive" });
    setIsSubmittingLeadCategoryAccess(false);
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
    else toast({ title: "Update Failed", description: result.error, variant: "destructive" });
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


  if (!currentUser || currentUser.role !== 'SYSTEM_ADMIN') {
    return <div className="p-8 text-center">Access Denied. You must be a System Administrator to view this page.</div>;
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3"><Shield className="h-8 w-8 text-primary"/>Custom Access Control</h1>
          <p className="text-base text-muted-foreground mt-1">Manage role-based permissions for orders, projects, and pipeline visibility.</p>
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
      
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg border bg-card rounded-lg overflow-hidden">
            <CardHeader className="border-b p-5">
                <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary" /> Financial Visibility</CardTitle>
                <CardDescription className="text-muted-foreground text-sm mt-0.5">Define which roles can see price and payment details on tracking pages.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                {isLoading ? <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="flex items-center space-x-2"><Skeleton className="h-5 w-5 rounded" /><Skeleton className="h-5 w-52 rounded" /></div>)}</div>
                : <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-x-6 gap-y-4">
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
        <CardHeader className="border-b p-5" onDoubleClick={() => setIsLeadCategoryAccessVisible(prev => !prev)}>
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
                        <TableCell className="pl-6"><Skeleton className="h-5 w-5 rounded"/></TableCell>
                        <TableCell><Skeleton className="h-5 w-40 rounded"/></TableCell>
                        <TableCell><Skeleton className="h-5 w-52 rounded"/></TableCell>
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
      
      {isLeadCategoryAccessVisible && (
      <Card className="shadow-lg border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><FolderKanban className="h-6 w-6 text-primary" />Lead Category Access</CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">Define which roles and specific users can view leads in each category.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6 font-semibold sticky left-0 bg-card z-10">Category</TableHead>
                  {LEAD_CATEGORY_ACCESS_ROLES.map(role => (
                    <TableHead key={role} className="text-center">{role.replace(/_/g, ' ')}</TableHead>
                  ))}
                  <TableHead className="text-center pr-6">Special Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  LEAD_CATEGORIES.map(category => (
                    <TableRow key={`skel-lead-cat-${category}`}>
                      <TableCell className="pl-6 sticky left-0 bg-card z-10"><Skeleton className="h-5 w-24" /></TableCell>
                      {LEAD_CATEGORY_ACCESS_ROLES.map(role => (
                        <TableCell key={`skel-lead-cell-${category}-${role}`} className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                      ))}
                      <TableCell className="pr-6"><Skeleton className="h-10 w-48 mx-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  LEAD_CATEGORIES.map(category => {
                      const permissions = leadCategoryAccess[category] || { roles: [], specialAccess: [] };
                      const selectedUsers = crmUsers.filter(u => permissions.specialAccess.includes(u.id));
                      const selectedUsersDisplay = selectedUsers.length > 2 ? `${selectedUsers.length} users selected` : selectedUsers.map(u => u.name).join(", ");
                      return (
                        <TableRow key={category} className="hover:bg-muted/30">
                          <TableCell className="pl-6 font-medium sticky left-0 bg-card z-10">{category}</TableCell>
                          {LEAD_CATEGORY_ACCESS_ROLES.map(role => (
                            <TableCell key={`${category}-${role}`} className="text-center">
                              <Checkbox
                                id={`lead-perm-${category}-${role}`}
                                checked={permissions.roles?.includes(role) || false}
                                onCheckedChange={(checked) => handleLeadCategoryRoleChange(category, role, checked)}
                                disabled={isSubmittingLeadCategoryAccess}
                                aria-label={`Allow ${role} for ${category} category`}
                              />
                            </TableCell>
                          ))}
                           <TableCell className="pr-6 text-center">
                            <Popover open={popoverStates[category]} onOpenChange={(open) => setPopoverStates(p => ({...p, [category]: open}))}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="w-48 h-8">
                                    <span className="truncate">{selectedUsersDisplay || "Select users..."}</span>
                                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                <Command><CommandInput placeholder="Search user..." />
                                  <CommandList><CommandEmpty>No user found.</CommandEmpty>
                                    <CommandGroup>
                                      {crmUsers.map((user) => (
                                        <CommandItem key={`special-access-${category}-${user.id}`} value={user.name} onSelect={() => handleLeadCategorySpecialAccessChange(category, user.id)} className="cursor-pointer">
                                          <CheckIcon className={cn("mr-2 h-4 w-4", permissions.specialAccess.includes(user.id) ? "opacity-100" : "opacity-0")}/>
                                          {user.name}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                        </TableRow>
                      )
                    })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="border-t p-5 flex justify-end">
          <Button onClick={handleSaveLeadCategoryAccess} disabled={isLoading || isSubmittingLeadCategoryAccess}>
            {isSubmittingLeadCategoryAccess ? "Saving Permissions..." : "Save Category Permissions"}
          </Button>
        </CardFooter>
      </Card>
    )}


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
