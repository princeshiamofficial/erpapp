
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import NextImage from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { PlusCircle, Edit, Trash2, Layers, RefreshCw, AlertTriangle, Search, UploadCloud, ImageIcon, PackageCheck, ShoppingCart } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { ServiceModelItem } from "@/types";
import { getModels } from '@/lib/service-options-service';
import {
  addModelAction, updateModelAction, deleteModelAction
} from '../service-management/actions';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ItemToEdit {
  id: string;
  name: string;
  buyingPrice: string;
  sellingPrice: string;
  imageUrl?: string | null;
  isReadyMade?: boolean;
  stockCount?: number;
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
  const [modelSearchTerm, setModelSearchTerm] = useState('');

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [itemName, setItemName] = useState('');
  const [itemBuyingPrice, setItemBuyingPrice] = useState('0');
  const [itemSellingPrice, setItemSellingPrice] = useState('0');
  const [itemIsReadyMade, setItemIsReadyMade] = useState(false);
  const [itemStockCount, setItemStockCount] = useState('0');

  const [editingItem, setEditingItem] = useState<ItemToEdit | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ItemToDelete | null>(null);

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const filteredModels = useMemo(() => {
    if (!modelSearchTerm) return models;

    return models.filter(model =>
      model.name.toLowerCase().includes(modelSearchTerm.toLowerCase())
    );
  }, [models, modelSearchTerm]);

  const openAddDialog = () => {
    setEditingItem(null);
    setItemName('');
    setItemBuyingPrice('0');
    setItemSellingPrice('0');
    setItemIsReadyMade(false);
    setItemStockCount('0');
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    setIsAddEditDialogOpen(true);
  };

  const openEditDialog = (item: ServiceModelItem) => {
    setEditingItem({
      id: item.id,
      name: item.name,
      buyingPrice: (item.buyingPrice ?? 0).toString(),
      sellingPrice: (item.sellingPrice ?? 0).toString(),
      imageUrl: item.imageUrl,
      isReadyMade: item.isReadyMade ?? false,
      stockCount: item.stockCount ?? 0,
    });
    setItemName(item.name);
    setItemBuyingPrice((item.buyingPrice ?? 0).toString());
    setItemSellingPrice((item.sellingPrice ?? 0).toString());
    setItemIsReadyMade(item.isReadyMade ?? false);
    // When editing, the stock count input should represent the CHANGE in stock, not the new total.
    setItemStockCount('');
    setSelectedImageFile(null);
    setImagePreviewUrl(item.imageUrl || null);
    setIsAddEditDialogOpen(true);
  };

  const openDeleteDialog = (item: ServiceModelItem) => {
    setItemToDelete({ id: item.id, name: item.name });
    setIsDeleteDialogOpen(true);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ title: "File too large", description: "Please select an image smaller than 2MB.", variant: "destructive" });
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        toast({ title: "Invalid file type", description: "Please select a JPG, PNG, or GIF image.", variant: "destructive" });
        return;
      }
      setSelectedImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };


  const handleAddEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      toast({ title: "Validation Error", description: "Name cannot be empty.", variant: "destructive" });
      return;
    }
    const buyingPriceValue = parseFloat(itemBuyingPrice);
    const sellingPriceValue = parseFloat(itemSellingPrice);

    // For ready-made items, itemStockCount is now the CHANGE in stock.
    // For adding a new item, it's the initial stock.
    const stockCountValue = itemIsReadyMade ? parseInt(itemStockCount || "0", 10) : 0;

    if (isNaN(buyingPriceValue) || buyingPriceValue < 0) {
      toast({ title: "Validation Error", description: "Buying Price must be a non-negative number.", variant: "destructive" });
      return;
    }
    if (isNaN(sellingPriceValue) || sellingPriceValue < 0) {
      toast({ title: "Validation Error", description: "Selling Price must be a non-negative number.", variant: "destructive" });
      return;
    }
    if (itemIsReadyMade && isNaN(stockCountValue)) {
      toast({ title: "Validation Error", description: "Stock count must be a valid integer for ready-made items.", variant: "destructive" });
      return;
    }


    setIsSubmitting(true);
    let finalImageUrl: string | null = editingItem?.imageUrl || null;

    if (selectedImageFile) {
      // Upload new image
      const formData = new FormData();
      formData.append('file', selectedImageFile);

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Upload failed with status: ${response.status}. Response: ${errorText}`);
        }

        const result = await response.json();

        if (result.success && result.file_url) {
          finalImageUrl = result.file_url;
        } else {
          toast({ title: "Image Upload Failed", description: result.message || "Could not save the image.", variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        toast({ title: "Upload Error", description: uploadError instanceof Error ? uploadError.message : "An error occurred while uploading the image.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
    } else if (imagePreviewUrl === null && editingItem?.imageUrl) {
      // Image was removed
      finalImageUrl = null;
    }


    let result;
    if (editingItem) {
      // The stockCountValue here is the CHANGE to be applied.
      result = await updateModelAction(editingItem.id, itemName.trim(), buyingPriceValue, sellingPriceValue, finalImageUrl, itemIsReadyMade, stockCountValue);
      if (result.success) {
        toast({ title: "Success", description: `Model "${itemName.trim()}" updated.` });
      }
    } else {
      // The stockCountValue here is the INITIAL stock.
      result = await addModelAction(itemName.trim(), buyingPriceValue, sellingPriceValue, finalImageUrl, itemIsReadyMade, stockCountValue);
      if (result.success) {
        toast({ title: "Success", description: `Model "${itemName.trim()}" added.` });
      }
    }

    if (result && result.success) {
      setIsAddEditDialogOpen(false);
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

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
  };

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM_ADMIN')) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Access Denied. You must be an Administrator or System Administrator to view this page.</p>
      </div>
    );
  }

  const renderItemList = (items: ServiceModelItem[], title: string, Icon: React.ElementType) => {
    return (
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden flex-1 min-w-[300px]">
        <CardHeader className="border-b p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><Icon className="h-5 w-5 text-primary" />{title}</CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-0.5">Manage available {title.toLowerCase()} options for orders.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={openAddDialog} className="h-9">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New
              </Button>
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${title}...`}
              value={modelSearchTerm}
              onChange={(e) => setModelSearchTerm(e.target.value)}
              className="pl-9 bg-background/50"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 max-h-[calc(100vh-350px)] overflow-y-auto">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 pl-4">SL</TableHead>
                  <TableHead className="min-w-[64px]">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Buying Price</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead className="text-center">Stock Info</TableHead>
                  <TableHead className="pr-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-16 w-full rounded-md" /></TableCell></TableRow>)
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-6 text-center text-muted-foreground">
                      <Icon className="mx-auto h-10 w-10 opacity-50 mb-2" />
                      No {modelSearchTerm ? `${title.toLowerCase()} found for "${modelSearchTerm}"` : `${title.toLowerCase()} found.`}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="pl-4 font-mono text-muted-foreground">{String(index + 1).padStart(2, '0')}</TableCell>
                      <TableCell>
                        <NextImage
                          src={item.imageUrl || `https://placehold.co/64x64.png`}
                          alt={item.name}
                          width={48}
                          height={48}
                          className="rounded-md object-cover bg-muted"
                          data-ai-hint="product photo"
                          unoptimized={true}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground">{item.name}</span>
                      </TableCell>
                      <TableCell className="font-mono">{formatCurrency(item.buyingPrice)}</TableCell>
                      <TableCell className="font-mono">{formatCurrency(item.sellingPrice)}</TableCell>
                      <TableCell className="text-center">
                        {item.isReadyMade ? (
                          <span className={cn(
                            "text-xs font-semibold flex items-center justify-center gap-1 p-1 rounded-full",
                            item.stockCount !== undefined && item.stockCount < 0 ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-600"
                          )}>
                            <PackageCheck className="h-3.5 w-3.5" />
                            Stock: {item.stockCount ?? 0}
                          </span>
                        ) : (<span className="text-xs text-muted-foreground italic">N/A</span>)}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="icon" onClick={() => openEditDialog(item)} title={`Edit model`} className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(item)}
                            title={`Delete model`}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive-foreground"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col lg:flex-row gap-6">
        {renderItemList(filteredModels, 'Models', Layers)}
      </div>

      <Dialog open={isAddEditDialogOpen} onOpenChange={(open) => {
        if (!isSubmitting) setIsAddEditDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Add New'} Model</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the name, prices, and image of this model.' : 'Enter the name, prices, and image for the new model.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEditSubmit} className="space-y-4 py-2">
            <div>
              <div className="flex items-center gap-3">
                <div
                  onClick={() => !isSubmitting && fileInputRef.current?.click()}
                  className="relative h-20 w-20 rounded-md bg-muted flex items-center justify-center border border-dashed border-muted-foreground/40 hover:border-primary cursor-pointer group transition-all overflow-hidden"
                  title="Click to upload image"
                >
                  {imagePreviewUrl ? (
                    <>
                      <NextImage
                        src={imagePreviewUrl}
                        alt="Model preview"
                        width={80}
                        height={80}
                        className="rounded-md object-cover w-full h-full"
                        unoptimized={true}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://placehold.co/80x80.png`;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <UploadCloud className="h-6 w-6 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                </div>
                {imagePreviewUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:bg-destructive/10 h-8"
                    onClick={handleRemoveImage}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove Image
                  </Button>
                )}
              </div>
              <Input
                id="modelImageFile"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/jpeg,image/png,image/gif"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="itemName">Name</Label>
              <Input id="itemName" placeholder="Name" value={itemName} onChange={(e) => setItemName(e.target.value)} required disabled={isSubmitting} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="isReadyMade" checked={itemIsReadyMade} onCheckedChange={setItemIsReadyMade} disabled={isSubmitting} />
                <Label htmlFor="isReadyMade">This is a ready-made item</Label>
              </div>
              {itemIsReadyMade && (
                <div className="space-y-1 pl-4 border-l-2 border-primary">
                  <Label htmlFor="itemStockCount">{editingItem ? 'Add/Remove Stock' : 'Initial Stock'} *</Label>
                  <Input
                    id="itemStockCount"
                    type="number"
                    value={itemStockCount}
                    onChange={(e) => setItemStockCount(e.target.value)}
                    required={itemIsReadyMade}
                    disabled={isSubmitting}
                    placeholder={editingItem ? "e.g., 50 to add, -20 to remove" : "e.g., 100"}
                    step="1"
                  />
                  <p className="text-xs text-muted-foreground">{editingItem ? 'Enter a positive number to add stock, or a negative number to remove it.' : 'Required for new ready-made items.'}</p>
                </div>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddEditDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : (editingItem ? "Save Changes" : "Add Model")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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

