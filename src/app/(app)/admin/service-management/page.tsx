
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { PlusCircle, Edit, Trash2, Layers, ShieldHalf, RefreshCw, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { ServiceModelItem, ServiceLaminationItem } from "@/types";
import { getModels, getLaminations } from '@/lib/service-options-service';
import {
  addModelAction, updateModelAction, deleteModelAction,
  addLaminationAction, updateLaminationAction, deleteLaminationAction
} from './actions';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

type ItemType = 'model' | 'lamination';
interface ItemToEdit {
  id: string;
  name: string;
  price?: string; // Price is only for models
  type: ItemType;
}
interface ItemToDelete {
  id: string;
  name: string;
  type: ItemType;
}

export default function ServiceManagementPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [models, setModels] = useState<ServiceModelItem[]>([]);
  const [laminations, setLaminations] = useState<ServiceLaminationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState(''); // For model price
  const [editingItem, setEditingItem] = useState<ItemToEdit | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ItemToDelete | null>(null);
  const [itemTypeToAdd, setItemTypeToAdd] = useState<ItemType | null>(null);


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedModels, fetchedLaminations] = await Promise.all([
        getModels(),
        getLaminations(),
      ]);
      setModels(fetchedModels);
      setLaminations(fetchedLaminations);
    } catch (error) {
      console.error("Error fetching service options:", error);
      toast({ title: "Error", description: "Could not load service options.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser && currentUser.role === 'SYSTEM_ADMIN') {
      fetchData();
    } else if (currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, router, fetchData]);

  const openAddDialog = (type: ItemType) => {
    setEditingItem(null);
    setItemTypeToAdd(type);
    setItemName('');
    setItemPrice(type === 'model' ? '0' : ''); // Default price for new model
    setIsAddEditDialogOpen(true);
  };

  const openEditDialog = (item: ServiceModelItem | ServiceLaminationItem, type: ItemType) => {
    setEditingItem({ 
      id: item.id, 
      name: item.name, 
      price: type === 'model' ? ((item as ServiceModelItem).price ?? 0).toString() : undefined,
      type 
    });
    setItemTypeToAdd(null);
    setItemName(item.name);
    setItemPrice(type === 'model' ? ((item as ServiceModelItem).price ?? 0).toString() : '');
    setIsAddEditDialogOpen(true);
  };
  
  const openDeleteDialog = (item: ServiceModelItem | ServiceLaminationItem, type: ItemType) => {
    setItemToDelete({ id: item.id, name: item.name, type });
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
    const currentType = editingItem?.type || itemTypeToAdd;
    let priceValue: number | undefined = undefined;

    if (currentType === 'model') {
      priceValue = parseFloat(itemPrice);
      if (isNaN(priceValue) || priceValue < 0) {
        toast({ title: "Validation Error", description: "Price for model must be a non-negative number.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
    }

    if (editingItem) { // Editing existing item
      if (currentType === 'model') {
        result = await updateModelAction(editingItem.id, itemName.trim(), priceValue);
      } else {
        result = await updateLaminationAction(editingItem.id, itemName.trim());
      }
      if (result.success) {
        toast({ title: "Success", description: `${currentType === 'model' ? 'Model' : 'Lamination'} "${itemName.trim()}" updated.` });
      }
    } else if (itemTypeToAdd) { // Adding new item
       if (currentType === 'model') {
        result = await addModelAction(itemName.trim(), priceValue);
      } else {
        result = await addLaminationAction(itemName.trim());
      }
      if (result.success) {
        toast({ title: "Success", description: `${currentType === 'model' ? 'Model' : 'Lamination'} "${itemName.trim()}" added.` });
      }
    }

    if (result && result.success) {
      setIsAddEditDialogOpen(false);
      setItemName('');
      setItemPrice('');
      setEditingItem(null);
      setItemTypeToAdd(null);
      await fetchData();
    } else if (result) {
      toast({ title: "Error", description: result.error || `Could not save ${currentType}.`, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleDeleteSubmit = async () => {
    if (!itemToDelete) return;
    setIsSubmitting(true);
    let result;
    if (itemToDelete.type === 'model') {
      result = await deleteModelAction(itemToDelete.id);
    } else {
      result = await deleteLaminationAction(itemToDelete.id);
    }

    if (result.success) {
      toast({ title: "Success", description: `${itemToDelete.type === 'model' ? 'Model' : 'Lamination'} "${itemToDelete.name}" deleted.` });
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      await fetchData();
    } else {
      toast({ title: "Error", description: result.error || `Could not delete ${itemToDelete.type}. It might be in use.`, variant: "destructive" });
    }
    setIsSubmitting(false);
  };
  
  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT' }).format(value);
  };


  if (!currentUser || currentUser.role !== 'SYSTEM_ADMIN') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Access Denied. You must be a System Administrator to view this page.</p>
      </div>
    );
  }
  
  const renderItemList = (items: (ServiceModelItem | ServiceLaminationItem)[], type: ItemType, title: string, Icon: React.ElementType) => (
    <Card className="shadow-xl border bg-card rounded-lg overflow-hidden flex-1 min-w-[300px]">
      <CardHeader className="border-b p-5 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><Icon className="h-5 w-5 text-primary"/>{title}</CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">Manage available {title.toLowerCase()} options for orders.</CardDescription>
        </div>
         <Button size="sm" onClick={() => openAddDialog(type)} className="h-9">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New
          </Button>
      </CardHeader>
      <CardContent className="p-0 max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
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
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{item.name}</span>
                  {/* Price display removed for models in list view */}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => openEditDialog(item, type)} title={`Edit ${type}`} className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => openDeleteDialog(item, type)} 
                    title={`Delete ${type}`} 
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive-foreground"
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
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title">Service Options Management</h1>
          <p className="page-description">Configure Model (with prices) and Lamination options available for orders.</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading} className="h-10 w-10" title="Refresh Data">
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {renderItemList(models, 'model', 'Models', Layers)}
        {renderItemList(laminations, 'lamination', 'Laminations', ShieldHalf)}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Add New'} {(editingItem?.type || itemTypeToAdd) === 'model' ? 'Model' : 'Lamination'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the name of this option.' : 'Enter the name for the new option.'}
              {(editingItem?.type || itemTypeToAdd) === 'model' && ' Also set its price.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEditSubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="itemName">Name</Label>
              <Input id="itemName" value={itemName} onChange={(e) => setItemName(e.target.value)} required disabled={isSubmitting} />
            </div>
            {(editingItem?.type || itemTypeToAdd) === 'model' && (
              <div>
                <Label htmlFor="itemPrice">Price (BDT)</Label>
                 <div className="relative mt-1">
                    <Input 
                        id="itemPrice" 
                        type="number"
                        value={itemPrice} 
                        onChange={(e) => setItemPrice(e.target.value)} 
                        required 
                        disabled={isSubmitting}
                        placeholder="e.g., 1500.00"
                        min="0"
                        step="0.01"
                        className="pl-3"
                    />
                </div>
              </div>
            )}
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddEditDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : (editingItem ? "Save Changes" : "Add Option")}</Button>
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
                This action cannot be undone. This will permanently delete the {itemToDelete.type} "<span className="font-semibold">{itemToDelete.name}</span>". 
                Ensure this option is not currently used by any orders before proceeding.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToDelete(null)} disabled={isSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSubmit} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isSubmitting}>
                {isSubmitting ? "Deleting..." : `Yes, delete ${itemToDelete.type}`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

