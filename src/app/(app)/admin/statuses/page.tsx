
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { PlusCircle, Edit, Trash2, Palette, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { CustomStatus } from "@/types";
import { getStatuses, addStatus, updateStatus, deleteStatus } from '@/lib/status-service';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [newStatusColor, setNewStatusColor] = useState('#0EA5E9'); // Default to Sky Blue

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
    if (currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN')) {
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
    try {
      await addStatus(newStatusName, newStatusColor);
      toast({ title: "Success", description: `Status "${newStatusName}" added.` });
      setIsAddDialogOpen(false);
      setNewStatusName('');
      setNewStatusColor('#0EA5E9');
      fetchStatuses(); // Refresh list
    } catch (error) {
      console.error("Error adding status:", error);
      toast({ title: "Error", description: (error instanceof Error ? error.message : "Could not add status."), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (status: CustomStatus) => {
    setEditingStatus(status);
    setNewStatusName(status.name);
    setNewStatusColor(status.color);
    setIsEditDialogOpen(true);
  };

  const handleEditStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStatus || !newStatusName.trim() || !newStatusColor.trim()) {
      toast({ title: "Validation Error", description: "Status name and color are required.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await updateStatus(editingStatus.id, newStatusName, newStatusColor);
      toast({ title: "Success", description: `Status "${editingStatus.name}" updated.` });
      setIsEditDialogOpen(false);
      setEditingStatus(null);
      fetchStatuses(); // Refresh list
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ title: "Error", description: (error instanceof Error ? error.message : "Could not update status."), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
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
    try {
      await deleteStatus(statusToDelete.id);
      toast({ title: "Success", description: `Status "${statusToDelete.name}" deleted.` });
      setIsDeleteDialogOpen(false);
      setStatusToDelete(null);
      fetchStatuses(); // Refresh list
    } catch (error) {
      console.error("Error deleting status:", error);
      toast({ title: "Error", description: (error instanceof Error ? error.message : "Could not delete status."), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };


  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM_ADMIN')) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Access Denied. You must be an administrator to view this page.</p>
      </div>
    );
  }
  
  const StatusColorPreview = ({ color }: { color: string }) => (
    <div className="w-6 h-6 rounded-md border border-border" style={{ backgroundColor: color }} />
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title">Order Status Management</h1>
          <p className="page-description">
            Define and manage custom order statuses for your workflow.
          </p>
        </div>
        <Button size="lg" onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-md hover:shadow-lg transition-shadow">
          <PlusCircle className="mr-2 h-5 w-5" />
          Add New Status
        </Button>
      </div>

      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <CardTitle className="text-card-foreground text-xl">Current Statuses</CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">
            View, edit, or delete custom order statuses. System statuses can have their color changed but cannot be renamed or deleted.
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
                  <div className="flex items-center gap-3">
                    <StatusColorPreview color={status.color} />
                    <span className="font-medium text-foreground">{status.name}</span>
                    {status.isSystemStatus && (
                      <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-sm border border-border">System</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button variant="outline" size="icon" onClick={() => openEditDialog(status)} title="Edit Status" className="h-9 w-9">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                        variant="destructive" 
                        size="icon" 
                        onClick={() => openDeleteDialog(status)} 
                        title="Delete Status" 
                        className="h-9 w-9"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Order Status</DialogTitle>
            <DialogDescription>Define a name and choose a color for the new status.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStatus} className="space-y-4 py-2">
            <div>
              <Label htmlFor="newStatusName">Status Name</Label>
              <Input id="newStatusName" value={newStatusName} onChange={(e) => setNewStatusName(e.target.value)} required />
            </div>
            <div className="flex items-center gap-4">
              <Label htmlFor="newStatusColor">Status Color</Label>
              <Input id="newStatusColor" type="color" value={newStatusColor} onChange={(e) => setNewStatusColor(e.target.value)} className="w-20 h-10 p-1" required />
              <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: newStatusColor }} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Status"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      {editingStatus && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Order Status: {editingStatus.name}</DialogTitle>
              <DialogDescription>Update the name and color for this status.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditStatus} className="space-y-4 py-2">
              <div>
                <Label htmlFor="editStatusName">Status Name</Label>
                <Input 
                    id="editStatusName" 
                    value={newStatusName} 
                    onChange={(e) => setNewStatusName(e.target.value)} 
                    required 
                    disabled={editingStatus.isSystemStatus}
                />
                 {editingStatus.isSystemStatus && <p className="text-xs text-muted-foreground mt-1">System status names cannot be changed.</p>}
              </div>
              <div className="flex items-center gap-4">
                <Label htmlFor="editStatusColor">Status Color</Label>
                <Input id="editStatusColor" type="color" value={newStatusColor} onChange={(e) => setNewStatusColor(e.target.value)} className="w-20 h-10 p-1" required />
                <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: newStatusColor }} />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Updating..." : "Save Changes"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Delete Status Confirmation Dialog */}
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
