
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { PlusCircle, Edit, Trash2, Palette, AlertTriangle, Eye, EyeOff, RefreshCw, Users } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { CustomStatus, UserRole } from "@/types";
import { getStatuses } from '@/lib/status-service'; 
import { addStatusAction, updateStatusAction, deleteStatusAction } from './actions'; 
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox'; // For selecting roles
import { Separator } from '@/components/ui/separator';

const AVAILABLE_ROLES_FOR_STATUS_ASSIGNMENT: UserRole[] = ['CRM', 'DESIGNER_REPRESENTATIVE', 'ADMIN', 'VENDOR', 'LR'];

export default function AdminStatusesPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [statuses, setStatuses] = useState<CustomStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#0EA5E9'); 
  const [newStatusIsVisible, setNewStatusIsVisible] = useState(true);
  const [newStatusAllowedRoles, setNewStatusAllowedRoles] = useState<UserRole[]>([]);


  const [editingStatus, setEditingStatus] = useState<CustomStatus | null>(null);
  const [statusToDelete, setStatusToDelete] = useState<CustomStatus | null>(null);

  const fetchStatuses = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedStatuses = await getStatuses();
      setStatuses(fetchedStatuses);
    } catch (error) {
      console.error("Error fetching statuses:", error);
      toast({ title: "Error", description: "Could not load statuses.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser && (currentUser.role === 'SYSTEM_ADMIN')) { // Only SYSTEM_ADMIN can access this page now
      fetchStatuses();
    } else if (currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, router, fetchStatuses]);


  const handleAddStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatusName.trim() || !newStatusColor.trim()) {
      toast({ title: "Validation Error", description: "Status name and color are required.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const result = await addStatusAction(newStatusName, newStatusColor, newStatusIsVisible, newStatusAllowedRoles);
    if (result.success && result.status) {
      toast({ title: "Success", description: `Status "${result.status.name}" added.` });
      setIsAddDialogOpen(false);
      setNewStatusName('');
      setNewStatusColor('#0EA5E9');
      setNewStatusIsVisible(true);
      setNewStatusAllowedRoles([]);
      await fetchStatuses(); 
    } else {
      toast({ title: "Error", description: result.error || "Could not add status.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const openEditDialog = (status: CustomStatus) => {
    setEditingStatus(status);
    setNewStatusName(status.name);
    setNewStatusColor(status.color);
    setNewStatusIsVisible(status.isVisible !== false); 
    setNewStatusAllowedRoles(status.allowedRoles || []);
    setIsEditDialogOpen(true);
  };

  const handleEditStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
        toast({ title: "Authentication Error", description: "User not authenticated.", variant: "destructive" });
        return;
    }
    if (!editingStatus || !newStatusName.trim() || !newStatusColor.trim()) {
      toast({ title: "Validation Error", description: "Status name and color are required.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const result = await updateStatusAction(editingStatus.id, newStatusName, newStatusColor, newStatusIsVisible, newStatusAllowedRoles, currentUser.role);
    if (result.success) {
      toast({ title: "Success", description: `Status "${editingStatus.name}" updated.` });
      setIsEditDialogOpen(false);
      setEditingStatus(null);
      await fetchStatuses(); 
    } else {
      toast({ title: "Error updating status", description: result.error || "Could not update status.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };
  
  const openDeleteDialog = (status: CustomStatus) => {
    if (status.isSystemStatus) {
        toast({ title: "Action Denied", description: "System statuses cannot be deleted.", variant: "destructive"});
        return;
    }
    setStatusToDelete(status);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteStatus = async () => {
    if (!statusToDelete) return;
    setIsSubmitting(true);
    const result = await deleteStatusAction(statusToDelete.id);
    if (result.success) {
      toast({ title: "Success", description: `Status "${statusToDelete.name}" deleted.` });
      setIsDeleteDialogOpen(false);
      setStatusToDelete(null);
      await fetchStatuses(); 
    } else {
      toast({ title: "Error", description: result.error || "Could not delete status.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleAllowedRoleChange = (role: UserRole, checked: boolean | "indeterminate", isEditing: boolean) => {
    const currentRoles = isEditing ? newStatusAllowedRoles : newStatusAllowedRoles;
    const setter = isEditing ? setNewStatusAllowedRoles : setNewStatusAllowedRoles;

    if (checked === true) {
      setter([...currentRoles, role]);
    } else {
      setter(currentRoles.filter(r => r !== role));
    }
  };


  if (!currentUser || currentUser.role !== 'SYSTEM_ADMIN') { // Strict check for SYSTEM_ADMIN
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Access Denied. You must be a System Administrator to view this page.</p>
      </div>
    );
  }
  
  const StatusColorPreview = ({ color }: { color: string }) => (
    <div className="w-6 h-6 rounded-md border border-border" style={{ backgroundColor: color }} />
  );

  const renderAllowedRolesCheckboxes = (isEditingDialog: boolean) => {
    const currentSelectedRoles = isEditingDialog && editingStatus ? newStatusAllowedRoles : newStatusAllowedRoles;
    const isSystemStatusBeingEdited = isEditingDialog && editingStatus?.isSystemStatus;
    // System Admins can always edit system status roles. Regular Admins cannot.
    const disabledForNonSysAdminOnSystemStatus = isSystemStatusBeingEdited && currentUser?.role !== 'SYSTEM_ADMIN';

    return (
        <div className="space-y-3">
        <Label>Restrict Assignment To Roles:</Label>
        <div className="grid grid-cols-2 gap-3">
            {AVAILABLE_ROLES_FOR_STATUS_ASSIGNMENT.map(role => (
            <div key={role} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50">
                <Checkbox
                id={`${isEditingDialog ? 'edit' : 'add'}-role-${role}`}
                checked={currentSelectedRoles.includes(role)}
                onCheckedChange={(checked) => handleAllowedRoleChange(role, checked, isEditingDialog)}
                disabled={isSubmitting || disabledForNonSysAdminOnSystemStatus}
                />
                <Label htmlFor={`${isEditingDialog ? 'edit' : 'add'}-role-${role}`} className="text-sm font-normal">
                {role.replace(/_/g, ' ')}
                </Label>
            </div>
            ))}
        </div>
        {disabledForNonSysAdminOnSystemStatus && (
             <p className="text-xs text-muted-foreground mt-1">Assignment permissions for system statuses can only be changed by a System Administrator.</p>
        )}
        <p className="text-xs text-muted-foreground">
            If no roles are selected, any user with permission to change statuses can assign this status. System Admins always have permission.
        </p>
        </div>
    );
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title">Order Status Management</h1>
          <p className="page-description">
            Define custom order statuses, colors, visibility, and role-based assignment permissions.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="icon" onClick={fetchStatuses} disabled={isLoading} className="h-10 w-10" title="Refresh Statuses">
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="lg" onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-md hover:shadow-lg transition-shadow h-10">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Status
          </Button>
        </div>
      </div>

      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl">Current Statuses</CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">
            Manage status properties. System status names and permissions can only be fully edited by System Admins.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-md border border-border/30">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-md" />
                    <Skeleton className="h-5 w-32 rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : statuses.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <Palette className="mx-auto h-12 w-12 opacity-50 mb-3" />
              No custom statuses found. Add one to get started!
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {statuses.map((status) => (
                <li key={status.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors gap-3 sm:gap-0">
                  <div className="flex items-center gap-3 flex-grow">
                    <StatusColorPreview color={status.color} />
                    <div>
                        <span className="font-medium text-foreground">{status.name}</span>
                        {status.isSystemStatus && (
                        <span className="ml-2 text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-sm border border-border">System</span>
                        )}
                         {status.isVisible !== false ? (
                            <Eye className="h-4 w-4 text-green-500 ml-2 inline-block" title="Visible in dropdowns"/>
                        ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground ml-2 inline-block" title="Hidden in dropdowns" />
                        )}
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            Allowed: {status.allowedRoles && status.allowedRoles.length > 0 ? status.allowedRoles.map(r => r.replace(/_/g, ' ')).join(', ') : 'All Permitted'}
                        </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button variant="outline" size="icon" onClick={() => openEditDialog(status)} title="Edit Status" className="h-9 w-9">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openDeleteDialog(status)} 
                        title="Delete Status" 
                        className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive-foreground"
                        disabled={status.isSystemStatus}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Add Status Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Order Status</DialogTitle>
            <DialogDescription>Define properties for the new status.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStatus} className="space-y-4 py-2">
            <div>
              <Label htmlFor="newStatusName">Status Name</Label>
              <Input id="newStatusName" value={newStatusName} onChange={(e) => setNewStatusName(e.target.value)} required disabled={isSubmitting} />
            </div>
            <div className="flex items-center gap-4">
              <Label htmlFor="newStatusColor">Status Color</Label>
              <Input id="newStatusColor" type="color" value={newStatusColor} onChange={(e) => setNewStatusColor(e.target.value)} className="w-20 h-10 p-1" required disabled={isSubmitting} />
              <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: newStatusColor }} />
            </div>
             <div className="flex items-center space-x-2">
              <Switch id="newStatusIsVisible" checked={newStatusIsVisible} onCheckedChange={setNewStatusIsVisible} disabled={isSubmitting} />
              <Label htmlFor="newStatusIsVisible">Visible in dropdowns</Label>
            </div>
            <Separator />
            {renderAllowedRolesCheckboxes(false)}
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Status"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      {editingStatus && currentUser && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Order Status: {editingStatus.name}</DialogTitle>
              <DialogDescription>Update properties for this status.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditStatus} className="space-y-4 py-2">
              <div>
                <Label htmlFor="editStatusName">Status Name</Label>
                <Input 
                    id="editStatusName" 
                    value={newStatusName} 
                    onChange={(e) => setNewStatusName(e.target.value)} 
                    required 
                    disabled={isSubmitting || (editingStatus.isSystemStatus && currentUser.role !== 'SYSTEM_ADMIN')}
                />
                 {editingStatus.isSystemStatus && currentUser.role !== 'SYSTEM_ADMIN' && 
                    <p className="text-xs text-muted-foreground mt-1">System status names can only be changed by a System Administrator.</p>}
              </div>
              <div className="flex items-center gap-4">
                <Label htmlFor="editStatusColor">Status Color</Label>
                <Input id="editStatusColor" type="color" value={newStatusColor} onChange={(e) => setNewStatusColor(e.target.value)} className="w-20 h-10 p-1" required disabled={isSubmitting} />
                <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: newStatusColor }} />
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="editStatusIsVisible" checked={newStatusIsVisible} onCheckedChange={setNewStatusIsVisible} disabled={isSubmitting}/>
                <Label htmlFor="editStatusIsVisible">Visible in dropdowns</Label>
              </div>
               <Separator />
              {renderAllowedRolesCheckboxes(true)}
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Updating..." : "Save Changes"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
      
      {statusToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" /> Are you absolutely sure?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the status
                "<span className="font-semibold">{statusToDelete.name}</span>". 
                Ensure no orders are currently using this status before proceeding.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setStatusToDelete(null)} disabled={isSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteStatus} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isSubmitting}>
                {isSubmitting ? "Deleting..." : "Yes, delete status"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
