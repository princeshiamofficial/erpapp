
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { PlusCircle, Edit, Trash2, Layers, RefreshCw, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { ServiceModelItem } from "@/types";
import { getModels } from '@/lib/service-options-service';
import {
  addModelAction, updateModelAction, deleteModelAction
} from '../service-management/actions'; // Re-use actions from the existing service management
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface ItemToEdit {
  id: string;
  name: string;
}
interface ItemToDelete {
  id: string;
  name: string;
}

export default function ModelManagementPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [models, setModels] = useState<ServiceModelItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [itemName, setItemName] = useState('');
  const [editingItem, setEditingItem] = useState<ItemToEdit | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ItemToDelete | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedModels = await getModels();
      setModels(fetchedModels);
    } catch (error) {
      console.error("Error fetching models:", error);
      toast({ title: "Error", description: "Could not load models.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN')) {
      fetchData();
    } else if (currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, router, fetchData]);

  const openAddDialog = () => {
    setEditingItem(null);
    setItemName('');
    setIsAddEditDialogOpen(true);
  };

  const openEditDialog = (item: ServiceModelItem) => {
    setEditingItem({ id: item.id, name: item.name });
    setItemName(item.name);
    setIsAddEditDialogOpen(true);
  };
  
  const openDeleteDialog = (item: ServiceModelItem) => {
    setItemToDelete({ id: item.id, name: item.name });
    setIsDeleteDialogOpen(true);
  };

  const handleAddEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      toast({ title: "Validation Error", description: "Name cannot be empty.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    let result;

    if (editingItem) { // Editing existing item
      result = await updateModelAction(editingItem.id, itemName);
      if (result.success) {
        toast({ title: "Success", description: `Model "${itemName}" updated.` });
      }
    } else { // Adding new item
      result = await addModelAction(itemName);
      if (result.success) {
        toast({ title: "Success", description: `Model "${itemName}" added.` });
      }
    }

    if (result && result.success) {
      setIsAddEditDialogOpen(false);
      setItemName('');
      setEditingItem(null);
      await fetchData();
    } else if (result) {
      toast({ title: "Error", description: result.error || `Could not save model.`, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleDeleteSubmit = async () => {
    if (!itemToDelete) return;
    setIsSubmitting(true);
    const result = await deleteModelAction(itemToDelete.id);

    if (result.success) {
      toast({ title: "Success", description: `Model "${itemToDelete.name}" deleted.` });
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      await fetchData();
    } else {
      toast({ title: "Error", description: result.error || `Could not delete model. It might be in use.`, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM_ADMIN')) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Access Denied. You must be an Administrator or System Administrator to view this page.</p>
      </div>
    );
  }
  
  const renderItemList = (items: ServiceModelItem[], title: string, Icon: React.ElementType) => (
    <Card className="shadow-xl border bg-card rounded-lg overflow-hidden flex-1 min-w-[300px]">
      <CardHeader className="border-b p-5 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><Icon className="h-5 w-5 text-primary"/>{title}</CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">Manage available {title.toLowerCase()} options for orders.</CardDescription>
        </div>
         <Button size="sm" onClick={openAddDialog} className="h-9">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New
          </Button>
      </CardHeader>
      <CardContent className="p-0 max-h-[calc(100vh-300px)] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <Icon className="mx-auto h-10 w-10 opacity-50 mb-2" />
            No {title.toLowerCase()} found.
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                <span className="font-medium text-foreground">{item.name}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => openEditDialog(item)} title={`Edit model`} className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => openDeleteDialog(item)} title={`Delete model`} className="h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title">Model Management</h1>
          <p className="page-description">Configure Model options available for orders.</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading} className="h-10 w-10" title="Refresh Data">
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {renderItemList(models, 'Models', Layers)}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Add New'} Model</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the name of this model.' : 'Enter the name for the new model.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEditSubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="itemName">Name</Label>
              <Input id="itemName" value={itemName} onChange={(e) => setItemName(e.target.value)} required disabled={isSubmitting} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddEditDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : (editingItem ? "Save Changes" : "Add Model")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      {itemToDelete && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" /> Are you absolutely sure?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the model "<span className="font-semibold">{itemToDelete.name}</span>". 
                Ensure this option is not currently used by any orders before proceeding.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToDelete(null)} disabled={isSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSubmit} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isSubmitting}>
                {isSubmitting ? "Deleting..." : `Yes, delete model`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

    