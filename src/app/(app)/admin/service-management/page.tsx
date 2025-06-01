
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { PlusCircle, Edit, Trash2, Layers, ShieldHalf, RefreshCw, AlertTriangle, CreditCard, Search, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { ServiceModelItem, ServiceLaminationItem, ServicePaymentMethodItem } from "@/types"; 
import { getModels, getLaminations, getPaymentMethods } from '@/lib/service-options-service'; 
import {
  addModelAction, updateModelAction, deleteModelAction,
  addLaminationAction, updateLaminationAction, deleteLaminationAction,
  addPaymentMethodAction, updatePaymentMethodAction, deletePaymentMethodAction 
} from './actions';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type ItemType = 'model' | 'lamination' | 'paymentMethod'; 
interface ItemToEdit {
  id: string;
  name: string;
  buyingPrice?: string; 
  sellingPrice?: string;
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
  const [paymentMethods, setPaymentMethods] = useState<ServicePaymentMethodItem[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modelSearchTerm, setModelSearchTerm] = useState('');

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [itemName, setItemName] = useState('');
  const [itemBuyingPrice, setItemBuyingPrice] = useState('');
  const [itemSellingPrice, setItemSellingPrice] = useState('');
  const [editingItem, setEditingItem] = useState<ItemToEdit | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ItemToDelete | null>(null);
  const [itemTypeToAdd, setItemTypeToAdd] = useState<ItemType | null>(null);


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedModels, fetchedLaminations, fetchedPaymentMethods] = await Promise.all([ 
        getModels(),
        getLaminations(),
        getPaymentMethods(),
      ]);
      setModels(fetchedModels);
      setLaminations(fetchedLaminations);
      setPaymentMethods(fetchedPaymentMethods); 
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

  const filteredModels = useMemo(() => {
    if (!modelSearchTerm) return models;
    return models.filter(model =>
      model.name.toLowerCase().includes(modelSearchTerm.toLowerCase())
    );
  }, [models, modelSearchTerm]);

  const openAddDialog = (type: ItemType) => {
    setEditingItem(null);
    setItemTypeToAdd(type);
    setItemName('');
    if (type === 'model') {
      setItemBuyingPrice('0');
      setItemSellingPrice('0');
    } else {
      setItemBuyingPrice('');
      setItemSellingPrice('');
    }
    setIsAddEditDialogOpen(true);
  };

  const openEditDialog = (item: ServiceModelItem | ServiceLaminationItem | ServicePaymentMethodItem, type: ItemType) => {
    setEditingItem({ 
      id: item.id, 
      name: item.name, 
      buyingPrice: type === 'model' ? ((item as ServiceModelItem).buyingPrice ?? 0).toString() : undefined,
      sellingPrice: type === 'model' ? ((item as ServiceModelItem).sellingPrice ?? 0).toString() : undefined,
      type 
    });
    setItemTypeToAdd(null);
    setItemName(item.name);
    if (type === 'model') {
      setItemBuyingPrice(((item as ServiceModelItem).buyingPrice ?? 0).toString());
      setItemSellingPrice(((item as ServiceModelItem).sellingPrice ?? 0).toString());
    } else {
      setItemBuyingPrice('');
      setItemSellingPrice('');
    }
    setIsAddEditDialogOpen(true);
  };
  
  const openDeleteDialog = (item: ServiceModelItem | ServiceLaminationItem | ServicePaymentMethodItem, type: ItemType) => {
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
    let buyingPriceValue: number | undefined = undefined;
    let sellingPriceValue: number | undefined = undefined;

    if (currentType === 'model') {
      buyingPriceValue = parseFloat(itemBuyingPrice);
      sellingPriceValue = parseFloat(itemSellingPrice);
      if (isNaN(buyingPriceValue) || buyingPriceValue < 0) {
        toast({ title: "Validation Error", description: "Buying Price for model must be a non-negative number.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      if (isNaN(sellingPriceValue) || sellingPriceValue < 0) {
        toast({ title: "Validation Error", description: "Selling Price for model must be a non-negative number.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
    }

    if (editingItem) { 
      if (currentType === 'model') {
        result = await updateModelAction(editingItem.id, itemName.trim(), buyingPriceValue, sellingPriceValue);
      } else if (currentType === 'lamination') {
        result = await updateLaminationAction(editingItem.id, itemName.trim());
      } else if (currentType === 'paymentMethod') {
        result = await updatePaymentMethodAction(editingItem.id, itemName.trim());
      }
      if (result?.success) {
        toast({ title: "Success", description: `${currentType === 'model' ? 'Model' : currentType === 'lamination' ? 'Lamination' : 'Payment Method'} "${itemName.trim()}" updated.` });
      }
    } else if (itemTypeToAdd) { 
       if (currentType === 'model') {
        result = await addModelAction(itemName.trim(), buyingPriceValue, sellingPriceValue);
      } else if (currentType === 'lamination') {
        result = await addLaminationAction(itemName.trim());
      } else if (currentType === 'paymentMethod') {
        result = await addPaymentMethodAction(itemName.trim());
      }
      if (result?.success) {
        toast({ title: "Success", description: `${currentType === 'model' ? 'Model' : currentType === 'lamination' ? 'Lamination' : 'Payment Method'} "${itemName.trim()}" added.` });
      }
    }

    if (result && result.success) {
      setIsAddEditDialogOpen(false);
      setItemName('');
      setItemBuyingPrice('');
      setItemSellingPrice('');
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
    } else if (itemToDelete.type === 'lamination') {
      result = await deleteLaminationAction(itemToDelete.id);
    } else if (itemToDelete.type === 'paymentMethod') {
      result = await deletePaymentMethodAction(itemToDelete.id);
    }

    if (result?.success) {
      toast({ title: "Success", description: `${itemToDelete.type === 'model' ? 'Model' : itemToDelete.type === 'lamination' ? 'Lamination' : 'Payment Method'} "${itemToDelete.name}" deleted.` });
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      await fetchData();
    } else if (result) {
      toast({ title: "Error", description: result.error || `Could not delete ${itemToDelete.type}. It might be in use.`, variant: "destructive" });
    }
    setIsSubmitting(false);
  };
  
  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
  };


  if (!currentUser || currentUser.role !== 'SYSTEM_ADMIN') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Access Denied. You must be a System Administrator to view this page.</p>
      </div>
    );
  }
  
  const renderItemList = (items: (ServiceModelItem | ServiceLaminationItem | ServicePaymentMethodItem)[], type: ItemType, title: string, Icon: React.ElementType) => (
    <Card className="shadow-xl border bg-card rounded-lg overflow-hidden w-full">
      <CardHeader className="border-b p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><Icon className="h-5 w-5 text-primary"/>{title}</CardTitle>
            <CardDescription className="text-muted-foreground text-sm mt-0.5">Manage available {title.toLowerCase()} options for orders.</CardDescription>
          </div>
          <Button size="sm" onClick={() => openAddDialog(type)} className="h-9 w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New
          </Button>
        </div>
        {type === 'model' && (
          <div className="relative mt-4">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${title}...`}
              value={modelSearchTerm}
              onChange={(e) => setModelSearchTerm(e.target.value)}
              className="pl-9 bg-background/50"
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0 max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <Icon className="mx-auto h-10 w-10 opacity-50 mb-2" />
            No {modelSearchTerm && type === 'model' ? `${title.toLowerCase()} found for "${modelSearchTerm}"` : `${title.toLowerCase()} found.`}
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                {type === 'model' ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-x-4 items-center">
                      <span className="font-medium text-foreground col-span-1 whitespace-nowrap overflow-hidden" title={item.name}>
                        {item.name}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-[hsl(var(--chart-1))] flex items-center col-span-1">
                        <DollarSign className="h-3 w-3 mr-1 opacity-70" />
                        Buy: {formatCurrency((item as ServiceModelItem).buyingPrice)}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-[hsl(var(--chart-2))] flex items-center col-span-1">
                        <DollarSign className="h-3 w-3 mr-1 opacity-70" />
                        Sell: {formatCurrency((item as ServiceModelItem).sellingPrice)}
                      </span>
                    </div>
                  ) : (
                    <span className="font-medium text-foreground flex-1 whitespace-nowrap" title={item.name}>{item.name}</span>
                  )}
                <div className="flex items-center gap-2 ml-4">
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
          <p className="page-description">Configure Model, Lamination, and Payment Method options available for orders.</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading} className="h-10 w-10" title="Refresh Data">
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="flex flex-col space-y-6">
        {renderItemList(filteredModels, 'model', 'Models', Layers)}
        {renderItemList(laminations, 'lamination', 'Laminations', ShieldHalf)}
        {renderItemList(paymentMethods, 'paymentMethod', 'Payment Methods', CreditCard)} 
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent className={cn("sm:max-w-md", (editingItem?.type || itemTypeToAdd) === 'model' && "sm:max-w-2xl")}>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Add New'} {(editingItem?.type || itemTypeToAdd) === 'model' ? 'Model' : (editingItem?.type || itemTypeToAdd) === 'lamination' ? 'Lamination' : 'Payment Method'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the details of this option.' : 'Enter the details for the new option.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEditSubmit} className="space-y-4 py-2">
            {(editingItem?.type || itemTypeToAdd) === 'model' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="itemName">Name</Label>
                  <Input id="itemName" value={itemName} onChange={(e) => setItemName(e.target.value)} required disabled={isSubmitting} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="itemBuyingPrice">Buying Price (BDT)</Label>
                  <Input 
                      id="itemBuyingPrice" 
                      type="number"
                      value={itemBuyingPrice} 
                      onChange={(e) => setItemBuyingPrice(e.target.value)} 
                      required 
                      disabled={isSubmitting}
                      placeholder="e.g., 1000.00"
                      min="0"
                      step="0.01"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="itemSellingPrice">Selling Price (BDT)</Label>
                  <Input 
                      id="itemSellingPrice" 
                      type="number"
                      value={itemSellingPrice} 
                      onChange={(e) => setItemSellingPrice(e.target.value)} 
                      required 
                      disabled={isSubmitting}
                      placeholder="e.g., 1500.00"
                      min="0"
                      step="0.01"
                  />
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="itemName">Name</Label>
                <Input id="itemName" value={itemName} onChange={(e) => setItemName(e.target.value)} required disabled={isSubmitting} />
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
    
    
    

    