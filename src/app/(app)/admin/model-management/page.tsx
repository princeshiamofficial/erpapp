
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import NextImage from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { PlusCircle, Edit, Trash2, Layers, RefreshCw, AlertTriangle, Search, UploadCloud, ImageIcon, PackageCheck, ShoppingCart, X, Plus } from "lucide-react";
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
import { v4 as uuidv4 } from 'uuid';

function SafeModelImage({ src, alt, size = 48, className }: { src?: string | null; alt: string; size?: number; className?: string }) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  if (!src || error) {
    return (
      <div
        className={cn(
          "rounded-md bg-secondary/80 border border-border/40 flex items-center justify-center shrink-0 text-muted-foreground/50 select-none shadow-inner",
          className
        )}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <ImageIcon style={{ width: `${Math.max(16, Math.round(size * 0.45))}px`, height: `${Math.max(16, Math.round(size * 0.45))}px` }} className="opacity-50" />
      </div>
    );
  }

  return (
    <NextImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded-md object-cover bg-muted border border-border/30", className)}
      data-ai-hint="product photo"
      unoptimized={true}
      onError={() => setError(true)}
    />
  );
}

interface CustomModelVariationFormState {
  id: string;
  name: string;
  buyingPrice: string;
  sellingPrice: string;
  stockCount: string;
}

interface ItemToEdit {
  id: string;
  name: string;
  buyingPrice: string;
  sellingPrice: string;
  imageUrl?: string | null;
  isReadyMade?: boolean;
  hasVariation?: boolean;
  hasUnit?: boolean;
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
  const [itemHasVariation, setItemHasVariation] = useState(false);
  const [itemHasUnit, setItemHasUnit] = useState(false);
  const [customVariations, setCustomVariations] = useState<CustomModelVariationFormState[]>([]);
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
      toast({ title: "Error", description: "Could not load data.", variant: "destructive" });
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

  const handleAddVariationRow = () => {
    setCustomVariations(prev => [
      ...prev,
      { id: uuidv4(), name: '', buyingPrice: '0', sellingPrice: '0', stockCount: '0' }
    ]);
  };

  const handleRemoveVariationRow = (id: string) => {
    setCustomVariations(prev => prev.filter(v => v.id !== id));
  };

  const handleVariationChange = (id: string, field: keyof CustomModelVariationFormState, value: string) => {
    setCustomVariations(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setItemName('');
    setItemBuyingPrice('0');
    setItemSellingPrice('0');
    setItemIsReadyMade(false);
    setItemHasVariation(false);
    setItemHasUnit(false);
    setCustomVariations([
      { id: uuidv4(), name: 'Standard', buyingPrice: '0', sellingPrice: '0', stockCount: '0' }
    ]);
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
      hasVariation: item.hasVariation ?? false,
      hasUnit: item.hasUnit ?? false,
      stockCount: item.stockCount ?? 0,
    });
    setItemName(item.name);
    setItemBuyingPrice((item.buyingPrice ?? 0).toString());
    setItemSellingPrice((item.sellingPrice ?? 0).toString());
    setItemIsReadyMade(item.isReadyMade ?? false);
    setItemHasVariation(item.hasVariation ?? false);
    setItemHasUnit(item.hasUnit ?? false);

    if (item.customVariations && item.customVariations.length > 0) {
      setCustomVariations(item.customVariations.map(v => ({
        id: v.id || uuidv4(),
        name: v.name,
        buyingPrice: (v.buyingPrice ?? 0).toString(),
        sellingPrice: (v.sellingPrice ?? 0).toString(),
        stockCount: (v.stockCount ?? 0).toString()
      })));
    } else if (item.laminationPrices && Object.keys(item.laminationPrices).length > 0) {
      setCustomVariations(Object.entries(item.laminationPrices).map(([id, p]) => ({
        id: id,
        name: p.name || id,
        buyingPrice: (p.buyingPrice ?? 0).toString(),
        sellingPrice: (p.sellingPrice ?? 0).toString(),
        stockCount: (p.stockCount ?? 0).toString()
      })));
    } else {
      setCustomVariations([
        { id: uuidv4(), name: 'Standard', buyingPrice: '0', sellingPrice: '0', stockCount: '0' }
      ]);
    }

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
    const buyingPriceValue = itemHasVariation ? 0 : (parseFloat(itemBuyingPrice) || 0);
    const sellingPriceValue = itemHasVariation ? 0 : (parseFloat(itemSellingPrice) || 0);

    // For ready-made items, itemStockCount is now the CHANGE in stock.
    // For adding a new item, it's the initial stock.
    const stockCountValue = (itemIsReadyMade && !itemHasVariation) ? parseInt(itemStockCount || "0", 10) : 0;

    if (!itemHasVariation) {
      if (isNaN(buyingPriceValue) || buyingPriceValue < 0) {
        toast({ title: "Validation Error", description: "Purchase Price must be a non-negative number.", variant: "destructive" });
        return;
      }
      if (isNaN(sellingPriceValue) || sellingPriceValue < 0) {
        toast({ title: "Validation Error", description: "Base Price must be a non-negative number.", variant: "destructive" });
        return;
      }
    }
    if (itemIsReadyMade && !itemHasVariation && isNaN(stockCountValue)) {
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


    let finalLaminationPrices: Record<string, { name: string; buyingPrice: number; sellingPrice: number; stockCount?: number }> | undefined = undefined;
    if (itemHasVariation) {
      if (customVariations.length === 0 || customVariations.every(v => !v.name.trim())) {
        toast({ title: "Validation Error", description: "Please add at least one variation name.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      finalLaminationPrices = {};
      customVariations.forEach(v => {
        if (v.name.trim()) {
          finalLaminationPrices![v.id] = {
            name: v.name.trim(),
            buyingPrice: parseFloat(v.buyingPrice) || 0,
            sellingPrice: parseFloat(v.sellingPrice) || 0,
            stockCount: itemIsReadyMade ? (parseInt(v.stockCount, 10) || 0) : 0
          };
        }
      });
    }

    let result;
    if (editingItem) {
      // The stockCountValue here is the CHANGE to be applied.
      result = await updateModelAction(editingItem.id, itemName.trim(), buyingPriceValue, sellingPriceValue, finalImageUrl, itemIsReadyMade, stockCountValue, itemHasVariation, finalLaminationPrices, itemHasUnit);
      if (result.success) {
        toast({ title: "Success", description: `Model "${itemName.trim()}" updated.` });
      }
    } else {
      // The stockCountValue here is the INITIAL stock.
      result = await addModelAction(itemName.trim(), buyingPriceValue, sellingPriceValue, finalImageUrl, itemIsReadyMade, stockCountValue, itemHasVariation, finalLaminationPrices, itemHasUnit);
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

  const formatRange = (min: number, max: number) => {
    if (min === max) return formatCurrency(min);
    const minStr = min % 1 === 0 ? min.toString() : min.toFixed(2);
    const maxStr = max % 1 === 0 ? max.toString() : max.toFixed(2);
    return `BDT ${minStr}-${maxStr}`;
  };

  const getModelPrices = (item: ServiceModelItem) => {
    const vars = item.customVariations || (item.laminationPrices ? Object.entries(item.laminationPrices).map(([id, p]) => ({ id, name: (p as any).name || id, buyingPrice: p.buyingPrice, sellingPrice: p.sellingPrice })) : []);

    if (item.hasVariation && vars.length > 0) {
      const buyingPrices = vars.map(v => Number(v.buyingPrice) || 0);
      const sellingPrices = vars.map(v => Number(v.sellingPrice) || 0);

      const minBuying = Math.min(...buyingPrices);
      const maxBuying = Math.max(...buyingPrices);
      const minSelling = Math.min(...sellingPrices);
      const maxSelling = Math.max(...sellingPrices);

      return {
        buyingText: formatRange(minBuying, maxBuying),
        sellingText: formatRange(minSelling, maxSelling),
      };
    }

    return {
      buyingText: formatCurrency(item.buyingPrice),
      sellingText: formatCurrency(item.sellingPrice),
    };
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
      <div className="flex flex-col gap-3 w-full flex-1 min-h-0">
        <div className="flex-none sticky top-[72px] z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-background py-3 -mt-3">
          <h2 className="text-xl font-medium tracking-tight text-foreground flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" /> Manage Models/Products
          </h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${title}...`}
                value={modelSearchTerm}
                onChange={(e) => setModelSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-white dark:bg-card border-input shadow-sm"
              />
            </div>
            <Button size="sm" onClick={openAddDialog} className="h-9 shrink-0">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New
            </Button>
          </div>
        </div>

        <Card className="flex-1 min-h-0 w-full shadow-none border bg-card rounded-lg">
          <CardContent className="p-0 h-full">
          <div className="h-full overflow-auto rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="w-12 pl-4">SL</TableHead>
                  <TableHead className="min-w-[64px]">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Purchase Price</TableHead>
                  <TableHead>Base Price</TableHead>
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
                  items.map((item, index) => {
                    const { buyingText, sellingText } = getModelPrices(item);
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="pl-4 font-mono text-muted-foreground">{String(index + 1).padStart(2, '0')}</TableCell>
                        <TableCell>
                          <SafeModelImage src={item.imageUrl} alt={item.name} size={48} />
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-foreground">{item.name}</span>
                        </TableCell>
                        <TableCell className="font-mono">{buyingText}</TableCell>
                        <TableCell className="font-mono">{sellingText}</TableCell>
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
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
  };

  return (
    <div className="flex flex-col p-4 sm:p-6 lg:p-8 pt-0 sm:pt-0 lg:pt-0" style={{ height: 'calc(100vh - 4.5rem)' }}>
      <div className="flex flex-col flex-1 min-h-0">
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
            {/* Top Section: Image Upload Box + Name & Toggles */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* Left Side: Image Upload Box */}
              <div className="relative inline-block shrink-0">
                <div
                  onClick={() => !isSubmitting && fileInputRef.current?.click()}
                  className="relative h-24 w-24 rounded-md bg-muted flex items-center justify-center border border-dashed border-muted-foreground/40 hover:border-primary cursor-pointer group transition-all"
                  title="Click to upload/change image"
                >
                  {imagePreviewUrl ? (
                    <div className="relative w-full h-full">
                      <SafeModelImage src={imagePreviewUrl} alt="Model preview" size={96} className="w-full h-full" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
                        <UploadCloud className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                </div>
                {imagePreviewUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage();
                    }}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full p-1 shadow-md transition-transform hover:scale-110 flex items-center justify-center z-10"
                    title="Remove Image"
                    disabled={isSubmitting}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Right Side: Name Input & Toggles */}
              <div className="flex-1 w-full flex flex-col sm:flex-row items-start gap-3">
                <div className="flex-1 w-full space-y-1">
                  <Label htmlFor="itemName" className="text-xs font-semibold">Name *</Label>
                  <Input
                    id="itemName"
                    placeholder="Name"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="flex flex-col gap-2 pt-0 sm:pt-5 shrink-0">
                  <div className="flex items-center space-x-2">
                    <Switch id="isReadyMade" checked={itemIsReadyMade} onCheckedChange={setItemIsReadyMade} disabled={isSubmitting} />
                    <Label htmlFor="isReadyMade" className="text-xs cursor-pointer select-none">Ready-made</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="hasVariation" checked={itemHasVariation} onCheckedChange={setItemHasVariation} disabled={isSubmitting} />
                    <Label htmlFor="hasVariation" className="text-xs cursor-pointer select-none">Variation</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="hasUnit" checked={itemHasUnit} onCheckedChange={setItemHasUnit} disabled={isSubmitting} />
                    <Label htmlFor="hasUnit" className="text-xs cursor-pointer select-none">Unit</Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Purchase Price, Base Price & (if ready-made enabled) Stock Input - Hidden when Variation toggle is ON */}
            {!itemHasVariation && (
              <div className={cn(
                "grid gap-3 pt-1",
                itemIsReadyMade ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"
              )}>
                <div className="space-y-1">
                  <Label htmlFor="itemBuyingPrice" className="text-xs font-semibold">Purchase Price (BDT)</Label>
                  <Input
                    id="itemBuyingPrice"
                    type="number"
                    value={itemBuyingPrice}
                    onChange={(e) => setItemBuyingPrice(e.target.value)}
                    required={!itemHasVariation}
                    disabled={isSubmitting}
                    placeholder="e.g., 1000.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="itemSellingPrice" className="text-xs font-semibold">Base Price (BDT)</Label>
                  <Input
                    id="itemSellingPrice"
                    type="number"
                    value={itemSellingPrice}
                    onChange={(e) => setItemSellingPrice(e.target.value)}
                    required={!itemHasVariation}
                    disabled={isSubmitting}
                    placeholder="e.g., 1500.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                {itemIsReadyMade && (
                  <div className="space-y-1">
                    <Label htmlFor="itemStockCount" className="text-xs font-semibold">{editingItem ? 'Stock Change' : 'Initial Stock'} *</Label>
                    <Input
                      id="itemStockCount"
                      type="number"
                      value={itemStockCount}
                      onChange={(e) => setItemStockCount(e.target.value)}
                      required={itemIsReadyMade && !itemHasVariation}
                      disabled={isSubmitting}
                      placeholder={editingItem ? "+50 or -20" : "e.g., 100"}
                      step="1"
                    />
                  </div>
                )}
              </div>
            )}

            {/* When Variation toggle is ON: Show custom variations builder */}
            {itemHasVariation && (
              <div className="space-y-2 pt-1 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">
                    Model Variations {itemIsReadyMade ? '(Name, Prices & Stock)' : '(Name & Prices)'}
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddVariationRow}
                    disabled={isSubmitting}
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Variation
                  </Button>
                </div>

                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {/* Dynamic Header */}
                  <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-muted-foreground px-2.5 py-1.5 bg-muted/60 rounded items-center">
                    <div className={itemIsReadyMade ? "col-span-4" : "col-span-5"}>Variation Name</div>
                    <div className={itemIsReadyMade ? "col-span-3" : "col-span-3"}>Purchase Price (BDT)</div>
                    <div className={itemIsReadyMade ? "col-span-3" : "col-span-3"}>Base Price (BDT)</div>
                    {itemIsReadyMade && <div className="col-span-1 text-center">Stock</div>}
                    <div className="col-span-1 text-center">Action</div>
                  </div>

                  {customVariations.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-md">
                      No variations added. Click "Add Variation" above to create custom variations for this model.
                    </div>
                  ) : (
                    customVariations.map((v) => (
                      <div
                        key={v.id}
                        className="grid grid-cols-12 gap-2 items-center p-2 rounded-md bg-muted/30 border border-border/50 hover:border-primary/40 transition-colors"
                      >
                        <div className={itemIsReadyMade ? "col-span-4" : "col-span-5"}>
                          <Input
                            type="text"
                            value={v.name}
                            onChange={(e) => handleVariationChange(v.id, 'name', e.target.value)}
                            placeholder="e.g. Standard, Gloss..."
                            className="h-8 text-xs"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className={itemIsReadyMade ? "col-span-3" : "col-span-3"}>
                          <Input
                            type="number"
                            value={v.buyingPrice}
                            onChange={(e) => handleVariationChange(v.id, 'buyingPrice', e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className="h-8 text-xs"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className={itemIsReadyMade ? "col-span-3" : "col-span-3"}>
                          <Input
                            type="number"
                            value={v.sellingPrice}
                            onChange={(e) => handleVariationChange(v.id, 'sellingPrice', e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className="h-8 text-xs"
                            disabled={isSubmitting}
                          />
                        </div>
                        {itemIsReadyMade && (
                          <div className="col-span-1">
                            <Input
                              type="number"
                              value={v.stockCount}
                              onChange={(e) => handleVariationChange(v.id, 'stockCount', e.target.value)}
                              placeholder="0"
                              step="1"
                              className="h-8 text-xs px-1 text-center"
                              disabled={isSubmitting}
                            />
                          </div>
                        )}
                        <div className="col-span-1 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveVariationRow(v.id)}
                            disabled={isSubmitting}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title="Delete Variation"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <Input
              id="modelImageFile"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/jpeg,image/png,image/gif"
            />

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

