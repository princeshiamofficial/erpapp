
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Edit, Trash2, ShieldHalf, RefreshCw, AlertTriangle, CreditCard, Gift, ClipboardList, Layers } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { ServiceLaminationItem, ServicePaymentMethodItem, ServiceGiftItem, ServiceCourierNoteItem, ServiceVariationItem } from "@/types";
import { getLaminations, getPaymentMethods, getGifts, getCourierNotes, getVariations } from '@/lib/service-options-service';
import {
  addLaminationAction, updateLaminationAction, deleteLaminationAction,
  addPaymentMethodAction, updatePaymentMethodAction, deletePaymentMethodAction,
  addGiftAction, updateGiftAction, deleteGiftAction,
  addCourierNoteAction, updateCourierNoteAction, deleteCourierNoteAction,
  addVariationAction, updateVariationAction, deleteVariationAction
} from './actions';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";


type ItemType = 'lamination' | 'variation' | 'paymentMethod' | 'gift' | 'courierNote';
interface ItemToEdit {
  id: string;
  name: string;
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

  const [laminations, setLaminations] = useState<ServiceLaminationItem[]>([]);
  const [variations, setVariations] = useState<ServiceVariationItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<ServicePaymentMethodItem[]>([]);
  const [gifts, setGifts] = useState<ServiceGiftItem[]>([]);
  const [courierNotes, setCourierNotes] = useState<ServiceCourierNoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [itemName, setItemName] = useState('');
  const [editingItem, setEditingItem] = useState<ItemToEdit | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ItemToDelete | null>(null);
  const [itemTypeToAdd, setItemTypeToAdd] = useState<ItemType | null>(null);
  const [activeTab, setActiveTab] = useState<ItemType>('lamination');


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedLaminations, fetchedVariations, fetchedPaymentMethods, fetchedGifts, fetchedCourierNotes] = await Promise.all([
        getLaminations(),
        getVariations(),
        getPaymentMethods(),
        getGifts(),
        getCourierNotes()
      ]);
      setLaminations(fetchedLaminations);
      setVariations(fetchedVariations);
      setPaymentMethods(fetchedPaymentMethods);
      setGifts(fetchedGifts);
      setCourierNotes(fetchedCourierNotes);
    } catch (error) {
      console.error("Error fetching service options:", error);
      toast({ title: "Error", description: "Could not load service options.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser && (currentUser.role === 'SYSTEM_ADMIN' || currentUser.role === 'ADMIN')) {
      fetchData();
    } else if (currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, router, fetchData]);

  const openAddDialog = (type: ItemType) => {
    setEditingItem(null);
    setItemTypeToAdd(type);
    setItemName('');
    setIsAddEditDialogOpen(true);
  };

  const openEditDialog = (item: { id: string; name: string }, type: ItemType) => {
    setEditingItem({
      id: item.id,
      name: item.name,
      type
    });
    setItemTypeToAdd(null);
    setItemName(item.name);
    setIsAddEditDialogOpen(true);
  };

  const openDeleteDialog = (item: { id: string; name: string }, type: ItemType) => {
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

    if (editingItem) {
      if (currentType === 'lamination') {
        result = await updateLaminationAction(editingItem.id, itemName.trim());
      } else if (currentType === 'variation') {
        result = await updateVariationAction(editingItem.id, itemName.trim());
      } else if (currentType === 'paymentMethod') {
        result = await updatePaymentMethodAction(editingItem.id, itemName.trim());
      } else if (currentType === 'gift') {
        result = await updateGiftAction(editingItem.id, itemName.trim());
      } else if (currentType === 'courierNote') {
        result = await updateCourierNoteAction(editingItem.id, itemName.trim());
      }
      if (result?.success) {
        toast({ title: "Success", description: `${currentType === 'courierNote' ? 'Courier Note' : currentType} "${itemName.trim()}" updated.` });
      }
    } else if (itemTypeToAdd) {
      if (currentType === 'lamination') {
        result = await addLaminationAction(itemName.trim());
      } else if (currentType === 'variation') {
        result = await addVariationAction(itemName.trim());
      } else if (currentType === 'paymentMethod') {
        result = await addPaymentMethodAction(itemName.trim());
      } else if (currentType === 'gift') {
        result = await addGiftAction(itemName.trim());
      } else if (currentType === 'courierNote') {
        result = await addCourierNoteAction(itemName.trim());
      }
      if (result?.success) {
        toast({ title: "Success", description: `${currentType === 'courierNote' ? 'Courier Note' : currentType} "${itemName.trim()}" added.` });
      }
    }

    if (result && result.success) {
      setIsAddEditDialogOpen(false);
      setItemName('');
      setEditingItem(null);
      setItemTypeToAdd(null);
      await fetchData();
    } else if (result) {
      toast({ title: "Error", description: result.error || `Could not save ${currentType === 'courierNote' ? 'courier note' : currentType}.`, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleDeleteSubmit = async () => {
    if (!itemToDelete) return;
    setIsSubmitting(true);
    let result;
    if (itemToDelete.type === 'lamination') {
      result = await deleteLaminationAction(itemToDelete.id);
    } else if (itemToDelete.type === 'variation') {
      result = await deleteVariationAction(itemToDelete.id);
    } else if (itemToDelete.type === 'paymentMethod') {
      result = await deletePaymentMethodAction(itemToDelete.id);
    } else if (itemToDelete.type === 'gift') {
      result = await deleteGiftAction(itemToDelete.id);
    } else if (itemToDelete.type === 'courierNote') {
      result = await deleteCourierNoteAction(itemToDelete.id);
    }

    if (result?.success) {
      toast({ title: "Success", description: `${itemToDelete.type === 'courierNote' ? 'Courier Note' : itemToDelete.type} "${itemToDelete.name}" deleted.` });
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      await fetchData();
    } else if (result) {
      toast({ title: "Error", description: result.error || `Could not delete ${itemToDelete.type === 'courierNote' ? 'courier note' : itemToDelete.type}. It might be in use.`, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  if (!currentUser || (currentUser.role !== 'SYSTEM_ADMIN' && currentUser.role !== 'ADMIN')) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Access Denied. You must be an Administrator or System Administrator to view this page.</p>
      </div>
    );
  }

  const renderItemList = (items: { id: string; name: string }[], type: ItemType, title: string, Icon: React.ElementType) => {
    return (
      <div className="space-y-4">

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg bg-card/50">
            <Icon className="mx-auto h-10 w-10 opacity-50 mb-2" />
            No {title.toLowerCase()} found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border border-border/60 hover:bg-muted/30 hover:shadow-sm transition-all bg-card">
                <span className="font-semibold text-foreground flex-1 whitespace-pre-wrap break-words pr-2 text-sm" title={item.name}>{item.name}</span>
                <div className="flex items-center gap-2 shrink-0">
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
              </div>
            ))}
          </div>
        )}
      </div>
    )
  };

  const currentType = editingItem?.type || itemTypeToAdd;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Tabs defaultValue="lamination" onValueChange={(value) => setActiveTab(value as ItemType)} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full max-w-3xl gap-2 h-auto p-1">
            <TabsTrigger value="lamination" className="flex items-center gap-2 data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">
              <ShieldHalf className="h-4 w-4" /> Laminations
            </TabsTrigger>
            <TabsTrigger value="paymentMethod" className="flex items-center gap-2 data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">
              <CreditCard className="h-4 w-4" /> Payment Methods
            </TabsTrigger>
            <TabsTrigger value="gift" className="flex items-center gap-2 data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">
              <Gift className="h-4 w-4" /> Gifts
            </TabsTrigger>
            <TabsTrigger value="courierNote" className="flex items-center gap-2 data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black">
              <ClipboardList className="h-4 w-4" /> Courier Notes
            </TabsTrigger>
          </TabsList>
          <Button onClick={() => openAddDialog(activeTab)} className="h-9 w-full sm:w-auto shrink-0 shadow-md">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New
          </Button>
        </div>
        <TabsContent value="lamination" className="mt-0">
          {renderItemList(laminations, 'lamination', 'Laminations', ShieldHalf)}
        </TabsContent>
        <TabsContent value="paymentMethod" className="mt-0">
          {renderItemList(paymentMethods, 'paymentMethod', 'Payment Methods', CreditCard)}
        </TabsContent>
        <TabsContent value="gift" className="mt-0">
          {renderItemList(gifts, 'gift', 'Gifts', Gift)}
        </TabsContent>
        <TabsContent value="courierNote" className="mt-0">
          {renderItemList(courierNotes, 'courierNote', 'Courier Notes', ClipboardList)}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Add New'} {
              currentType === 'lamination' ? 'Lamination' :
                currentType === 'variation' ? 'Variation' :
                  currentType === 'paymentMethod' ? 'Payment Method' :
                    currentType === 'gift' ? 'Gift' :
                      'Courier Note'
            }</DialogTitle>
            <DialogDescription>
              {editingItem 
                ? `Update the ${currentType === 'courierNote' ? 'note' : 'name'} of this option.` 
                : `Enter the ${currentType === 'courierNote' ? 'note' : 'name'} for the new option.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEditSubmit} className="space-y-4 py-2">
            <div>
              {currentType === 'courierNote' ? (
                <div className="space-y-1">
                  <Textarea
                    id="itemName"
                    placeholder="Note"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    required
                    disabled={isSubmitting}
                    maxLength={480}
                    className="min-h-[120px] text-sm resize-none whitespace-pre-wrap"
                    rows={5}
                  />
                  <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
                    <span>SteadFast API Limit</span>
                    <span className={cn(itemName.length >= 450 && "text-destructive font-semibold")}>
                      {itemName.length}/480
                    </span>
                  </div>
                </div>
              ) : (
                <Input
                  id="itemName"
                  placeholder="Name"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                  disabled={isSubmitting}
                  maxLength={100}
                />
              )}
            </div>
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

