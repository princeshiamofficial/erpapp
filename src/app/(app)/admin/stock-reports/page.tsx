
"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, History, PlusCircle, UploadCloud, ImageIcon, Trash2, Search, PackageCheck, Edit, TrendingUp, Banknote, Tag, Layers, Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { addStockAction, updateStockAction, deleteStockAction, addSellEntryAction, approveSellEntryAction, rejectSellEntryAction, deleteSellEntryAction } from './actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import NextImage from 'next/image';
import { getStockItems } from '@/lib/stock-service';
import { getSellEntries } from '@/lib/sell-entry-service';
import type { ServiceModelItem, SellEntry } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from '@/lib/utils';
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

export default function StockReportsPage() {
    const { currentUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('history');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ServiceModelItem | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [models, setModels] = useState<ServiceModelItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<ServiceModelItem | null>(null);

    // Sell Entry state
    const [sellEntries, setSellEntries] = useState<SellEntry[]>([]);
    const [isAddSellEntryDialogOpen, setIsAddSellEntryDialogOpen] = useState(false);
    const [sellEntryItems, setSellEntryItems] = useState<{ id: string; productId: string; quantity: string }[]>([{ id: 'init', productId: '', quantity: '1' }]);
    const [openProductSearchIndex, setOpenProductSearchIndex] = useState<number | null>(null);
    const [isDeleteSellEntryDialogOpen, setIsDeleteSellEntryDialogOpen] = useState(false);
    const [sellEntryToDelete, setSellEntryToDelete] = useState<SellEntry | null>(null);
    const [sellEntryDate, setSellEntryDate] = useState<Date>(new Date());

    // Form state
    const [itemName, setItemName] = useState('');
    const [itemStockCount, setItemStockCount] = useState('0');
    const [itemStockChange, setItemStockChange] = useState('');
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [items, entries] = await Promise.all([
                getStockItems(),
                getSellEntries()
            ]);
            setModels(items);
            setSellEntries(entries);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast({ title: "Error", description: "Failed to load data.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN' || currentUser.role === 'LR')) {
            fetchData();
        }
    }, [currentUser, fetchData]);

    const filteredModels = useMemo(() => {
        if (!searchTerm) return models;
        return models.filter(model =>
            model.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [models, searchTerm]);



    const openAddDialog = () => {
        setItemName('');
        setItemStockCount('0');
        setItemStockChange('');
        setSelectedImageFile(null);
        setImagePreviewUrl(null);
        setIsAddDialogOpen(true);
    };

    const openEditDialog = (item: ServiceModelItem) => {
        setEditingItem(item);
        setItemName(item.name);
        setItemStockCount(item.stockCount?.toString() || '0');
        setItemStockChange('');
        setSelectedImageFile(null);
        setImagePreviewUrl(item.imageUrl || null);
        setIsEditDialogOpen(true);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast({ title: "File too large", description: "Please select an image smaller than 2MB.", variant: "destructive" });
                return;
            }
            setSelectedImageFile(file);
            setImagePreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleFormSubmit = async (e: React.FormEvent, isEdit: boolean) => {
        e.preventDefault();
        setIsSubmitting(true);

        let finalImageUrl = imagePreviewUrl;
        if (selectedImageFile) {
            const formData = new FormData();
            formData.append('file', selectedImageFile);
            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });
                const result = await response.json();
                if (result.success && result.file_url) {
                    finalImageUrl = result.file_url;
                }
            } catch (error) {
                console.error("Upload error:", error);
            }
        }

        let result;
        if (isEdit && editingItem) {
            const stockDelta = parseInt(itemStockChange || "0", 10);
            result = await updateStockAction(editingItem.id, itemName.trim(), undefined, undefined, finalImageUrl, true, stockDelta);
        } else {
            const stockCountValue = parseInt(itemStockCount || "0", 10);
            result = await addStockAction(itemName.trim(), undefined, undefined, finalImageUrl, true, stockCountValue);
        }

        if (result.success) {
            toast({ title: "Success", description: `Product "${itemName}" ${isEdit ? 'updated' : 'added'} successfully.` });
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
            fetchData(); // Refresh the list
        } else {
            toast({ title: "Error", description: result.error || `Failed to ${isEdit ? 'update' : 'add'} product.`, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsSubmitting(true);
        const result = await deleteStockAction(itemToDelete.id);
        if (result.success) {
            toast({ title: "Success", description: `Product "${itemToDelete.name}" deleted successfully.` });
            setIsDeleteDialogOpen(false);
            setItemToDelete(null);
            fetchData();
        } else {
            toast({ title: "Error", description: result.error || "Failed to delete product.", variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    // Sell Entry Handlers
    const openAddSellEntryDialog = () => {
        setSellEntryItems([{ id: Math.random().toString(36).substr(2, 9), productId: '', quantity: '1' }]);
        setOpenProductSearchIndex(null);
        setSellEntryDate(new Date());
        setIsAddSellEntryDialogOpen(true);
    };

    const handleAddSellEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        setIsSubmitting(true);

        const itemsToAdd = sellEntryItems
            .filter(item => item.productId)
            .map(item => {
                const selectedProduct = models.find(m => m.id === item.productId);
                return {
                    productId: item.productId,
                    productName: selectedProduct ? selectedProduct.name : 'Unknown Product',
                    quantity: parseInt(item.quantity) || 0
                };
            })
            .filter(item => item.quantity > 0);

        const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN';
        const status = isAdmin ? 'Approved' : 'Pending';

        const result = await addSellEntryAction(itemsToAdd, currentUser.id, currentUser.name, sellEntryDate.toISOString(), status);

        if (result.success) {
            toast({ title: "Success", description: "Successfully added sell entry." });
            setIsAddSellEntryDialogOpen(false);
            setSellEntryItems([{ id: Math.random().toString(36).substr(2, 9), productId: '', quantity: '1' }]); // Reset form
            fetchData();
        } else {
            toast({ title: "Error", description: result.error || "Failed to add sell entry.", variant: "destructive" });
        }

        setIsSubmitting(false);
    };

    const handleApproveSellEntry = async (entry: SellEntry) => {
        if (!currentUser) return;
        setIsSubmitting(true);
        const result = await approveSellEntryAction(entry.id, currentUser.id, currentUser.name);
        if (result.success) {
            toast({ title: "Success", description: `Sell entry ${entry.entryId} approved.` });
            fetchData();
        } else {
            toast({ title: "Error", description: result.error || "Failed to approve entry.", variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const handleRejectSellEntry = async (entry: SellEntry) => {
        if (!currentUser) return;
        setIsSubmitting(true);
        const result = await rejectSellEntryAction(entry.id, currentUser.id, currentUser.name);
        if (result.success) {
            toast({ title: "Success", description: `Sell entry ${entry.entryId} rejected.` });
            fetchData();
        } else {
            toast({ title: "Error", description: result.error || "Failed to reject entry.", variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const handleDeleteSellEntry = async () => {
        if (!sellEntryToDelete) return;
        setIsSubmitting(true);
        const result = await deleteSellEntryAction(sellEntryToDelete.id);
        if (result.success) {
            toast({ title: "Success", description: `Sell entry ${sellEntryToDelete.entryId} deleted.` });
            setIsDeleteSellEntryDialogOpen(false);
            setSellEntryToDelete(null);
            fetchData();
        } else {
            toast({ title: "Error", description: result.error || "Failed to delete entry.", variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    useEffect(() => {
        if (currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM_ADMIN' && currentUser.role !== 'LR') {
            router.replace('/dashboard');
        }
    }, [currentUser, router]);

    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM_ADMIN' && currentUser.role !== 'LR')) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <p>Loading or Access Denied...</p>
            </div>
        );
    }

    return (
        <div className="px-0 py-2 sm:p-6 lg:p-8 pt-2 sm:pt-2 lg:pt-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="products" className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Products
                    </TabsTrigger>
                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'LR') && (
                        <TabsTrigger value="history" className="flex items-center gap-2">
                            <History className="h-4 w-4" />
                            Stock History
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="products" className="space-y-4">
                    <Card className="shadow-none border-none bg-transparent rounded-lg overflow-hidden">
                        <CardHeader className="border-b bg-transparent p-5">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <Package className="h-5 w-5 text-primary" />
                                        Products Inventory
                                    </CardTitle>
                                    <CardDescription>
                                        Current stock levels and performance details for all products.
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:w-64 sm:flex-none">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search products..."
                                            className="pl-9 h-10"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'LR') && (
                                        <Button onClick={openAddDialog} className="shrink-0 gap-2 h-10">
                                            <PlusCircle className="h-4 w-4" />
                                            <span className="hidden sm:inline">Add Product</span>
                                            <span className="sm:hidden">Add</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 border-none bg-transparent">
                            {/* Mobile View: Modern Cards */}
                            <div className="md:hidden px-0 py-4 space-y-4 bg-transparent">
                                {isLoading ? (
                                    [...Array(3)].map((_, i) => (
                                        <div key={i} className="bg-card rounded-2xl p-5 shadow-sm border space-y-4">
                                            <div className="flex gap-4">
                                                <Skeleton className="h-20 w-20 rounded-xl" />
                                                <div className="space-y-3 flex-1">
                                                    <Skeleton className="h-6 w-3/4" />
                                                    <Skeleton className="h-4 w-1/2" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Skeleton className="h-12 rounded-lg" />
                                                <Skeleton className="h-12 rounded-lg" />
                                            </div>
                                        </div>
                                    ))
                                ) : filteredModels.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-12 text-center bg-card rounded-2xl border shadow-sm"
                                    >
                                        <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                                        <h3 className="text-lg font-semibold">No products found</h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {searchTerm ? `Try searching for something else than "${searchTerm}"` : "Start by adding your first product to the inventory."}
                                        </p>
                                    </motion.div>
                                ) : (
                                    <div className="space-y-3">
                                        <AnimatePresence mode="popLayout">
                                            {filteredModels.map((item, index) => (
                                                <motion.div
                                                    key={item.id}
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.98 }}
                                                    transition={{ duration: 0.2, delay: index * 0.03 }}
                                                    className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden"
                                                >
                                                    <div className="p-4 pb-3 flex gap-4">
                                                        {/* Image */}
                                                        <div className="h-16 w-16 relative rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border/40">
                                                            {item.imageUrl ? (
                                                                <NextImage
                                                                    src={item.imageUrl}
                                                                    alt={item.name}
                                                                    fill
                                                                    className="object-cover"
                                                                    unoptimized={true}
                                                                />
                                                            ) : (
                                                                <ImageIcon className="h-6 w-6 text-muted-foreground/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                                            )}
                                                        </div>

                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                            <h3 className="font-semibold text-base text-foreground/90 leading-snug line-clamp-2">{item.name}</h3>
                                                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                                                                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md">
                                                                    <TrendingUp className="h-3 w-3" /> {item.totalSold || 0} sold
                                                                </span>
                                                                {item.isReadyMade ? (
                                                                    <span className={cn(
                                                                        "text-xs font-bold px-2 py-0.5 rounded-md",
                                                                        (item.stockCount || 0) <= 5 ? "bg-destructive/10 text-destructive" :
                                                                            (item.stockCount || 0) <= 20 ? "bg-amber-500/10 text-amber-600" :
                                                                                "bg-green-500/10 text-green-600"
                                                                    )}>
                                                                        {item.stockCount} in stock
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Custom</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Actions Footer */}
                                                    <div className="bg-muted/30 px-4 py-2 flex justify-end gap-2 border-t border-border/40">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openEditDialog(item)}
                                                            className="h-8 px-3 text-muted-foreground hover:text-primary hover:bg-primary/5 text-xs font-medium"
                                                        >
                                                            <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                                                        </Button>
                                                        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN') && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => { setItemToDelete(item); setIsDeleteDialogOpen(true); }}
                                                                className="h-8 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/5 text-xs font-medium"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                                                            </Button>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>

                            {/* Desktop View: Table (Strictly unchanged layout, only updated text labels) */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12 pl-4">SL</TableHead>
                                            <TableHead className="min-w-[64px]">Image</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Total Sold</TableHead>
                                            <TableHead className="text-center">Stock Level</TableHead>
                                            <TableHead className="text-right pr-4">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            [...Array(5)].map((_, i) => (
                                                <TableRow key={i}>
                                                    <TableCell colSpan={8} className="p-4">
                                                        <Skeleton className="h-10 w-full" />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : filteredModels.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                                    <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                                    {searchTerm ? `No products found matching "${searchTerm}"` : "No products available."}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredModels.map((item, index) => (
                                                <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                                                    <TableCell className="pl-4 font-mono text-muted-foreground">{String(index + 1).padStart(2, '0')}</TableCell>
                                                    <TableCell>
                                                        <div className="h-10 w-10 relative rounded-md overflow-hidden bg-muted flex items-center justify-center border">
                                                            {item.imageUrl ? (
                                                                <NextImage
                                                                    src={item.imageUrl}
                                                                    alt={item.name}
                                                                    fill
                                                                    className="object-cover"
                                                                    unoptimized={true}
                                                                />
                                                            ) : (
                                                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
                                                    <TableCell className="font-mono text-primary font-bold">{item.totalSold || 0}</TableCell>
                                                    <TableCell className="text-center">
                                                        {item.isReadyMade ? (
                                                            <div className={cn(
                                                                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold",
                                                                (item.stockCount || 0) <= 5 ? "bg-destructive/10 text-destructive border border-destructive/20" :
                                                                    (item.stockCount || 0) <= 20 ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                                                                        "bg-green-500/10 text-green-600 border border-green-500/20"
                                                            )}>
                                                                <PackageCheck className="h-3.5 w-3.5" />
                                                                {item.stockCount} in stock
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground italic">Custom Order</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-4">
                                                        <div className="flex justify-end gap-1">
                                                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors">
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN') && (
                                                                <Button variant="ghost" size="icon" onClick={() => { setItemToDelete(item); setIsDeleteDialogOpen(true); }} className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
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
                </TabsContent>

                {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'LR') && (
                    <TabsContent value="history" className="space-y-4">
                        <Card className="shadow-none border-none bg-transparent rounded-lg overflow-hidden">
                            <CardHeader className="border-b bg-transparent p-5">
                                <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-4">
                                    <Button onClick={openAddSellEntryDialog} className="shrink-0 gap-2 h-10">
                                        <PlusCircle className="h-4 w-4" />
                                        <span>Add Sell Entry</span>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {/* Mobile View: Cards */}
                                <div className="md:hidden px-0 py-4 space-y-4 bg-transparent">
                                    {isLoading ? (
                                        [...Array(3)].map((_, i) => (
                                            <div key={i} className="bg-card rounded-2xl p-5 shadow-sm border space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <Skeleton className="h-6 w-24" />
                                                    <Skeleton className="h-6 w-20 rounded-full" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Skeleton className="h-4 w-3/4" />
                                                    <Skeleton className="h-4 w-1/2" />
                                                </div>
                                                <div className="flex justify-end gap-2 pt-2">
                                                    <Skeleton className="h-8 w-8 rounded-full" />
                                                </div>
                                            </div>
                                        ))
                                    ) : sellEntries.length === 0 ? (
                                        <div className="p-12 text-center bg-card rounded-2xl border shadow-sm">
                                            <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                                            <h3 className="text-lg font-semibold">No entries yet</h3>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Add your first sell entry to see history.
                                            </p>
                                        </div>
                                    ) : (
                                        sellEntries.map((entry) => (
                                            <div key={entry.id} className="bg-card rounded-xl p-4 border shadow-sm">
                                                <div className="flex justify-between items-start mb-3">
                                                    <Link href={`/admin/stock-reports/${entry.entryId}`} className="font-mono font-bold text-primary hover:underline text-lg">
                                                        {entry.entryId}
                                                    </Link>
                                                    <span className={cn(
                                                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                                                        entry.status === 'Approved' ? "bg-green-500/10 text-green-600" :
                                                            entry.status === 'Rejected' ? "bg-destructive/10 text-destructive" :
                                                                "bg-amber-500/10 text-amber-600"
                                                    )}>
                                                        {entry.status}
                                                    </span>
                                                </div>

                                                <div className="space-y-2 text-sm text-muted-foreground mb-4 bg-muted/30 p-3 rounded-lg">
                                                    <div className="flex justify-between items-center">
                                                        <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Recorded by:</span>
                                                        <span className="font-medium text-foreground">{entry.recordedByUserName}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="flex items-center gap-1.5"><History className="h-3.5 w-3.5" /> Date:</span>
                                                        <span className="font-medium text-foreground">
                                                            {new Date(entry.createdAt).toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric'
                                                            })}
                                                        </span>
                                                    </div>
                                                    {entry.approvedByUserName && (
                                                        <div className="flex justify-between items-center text-xs pt-2 border-t mt-2">
                                                            <span className="flex items-center gap-1.5">
                                                                {entry.status === 'Rejected' ? 'Rejected by:' : 'Approved by:'}
                                                            </span>
                                                            <span className="font-medium text-foreground">{entry.approvedByUserName}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex justify-end gap-2">
                                                    {entry.status === 'Pending' && (currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN') && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleApproveSellEntry(entry)}
                                                                disabled={isSubmitting}
                                                                className="h-9 text-green-600 hover:text-green-700 hover:bg-green-50 px-3 bg-green-50/50"
                                                            >
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleRejectSellEntry(entry)}
                                                                disabled={isSubmitting}
                                                                className="h-9 text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-3 bg-amber-50/50"
                                                            >
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => { setSellEntryToDelete(entry); setIsDeleteSellEntryDialogOpen(true); }}
                                                        disabled={isSubmitting}
                                                        className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Desktop View: Table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-24">Entry ID</TableHead>
                                                <TableHead className="text-center">Status</TableHead>
                                                <TableHead>Recorded</TableHead>
                                                <TableHead>Approved/Rejected</TableHead>
                                                <TableHead>Date Created</TableHead>
                                                <TableHead className="text-right pr-4">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isLoading ? (
                                                [...Array(5)].map((_, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell colSpan={6} className="p-4">
                                                            <Skeleton className="h-10 w-full" />
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : sellEntries.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                                        <History className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                                        No sell entries found. Add your first entry to get started.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                sellEntries.map((entry) => (
                                                    <TableRow key={entry.id} className="hover:bg-muted/50 transition-colors">
                                                        <TableCell className="font-mono font-semibold text-primary">
                                                            <Link href={`/admin/stock-reports/${entry.entryId}`} className="hover:underline cursor-pointer">
                                                                {entry.entryId}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className={cn(
                                                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                                                                entry.status === 'Approved' ? "bg-green-500/10 text-green-600" :
                                                                    entry.status === 'Rejected' ? "bg-destructive/10 text-destructive" :
                                                                        "bg-amber-500/10 text-amber-600"
                                                            )}>
                                                                {entry.status}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">{entry.recordedByUserName}</TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {entry.approvedByUserName || '-'}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {new Date(entry.createdAt).toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric'
                                                            })}
                                                        </TableCell>
                                                        <TableCell className="text-right pr-4">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {entry.status === 'Pending' && (currentUser?.role === 'ADMIN' || currentUser?.role === 'SYSTEM_ADMIN') && (
                                                                    <>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => handleApproveSellEntry(entry)}
                                                                            disabled={isSubmitting}
                                                                            className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                        >
                                                                            Approve
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => handleRejectSellEntry(entry)}
                                                                            disabled={isSubmitting}
                                                                            className="h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                                        >
                                                                            Reject
                                                                        </Button>
                                                                    </>
                                                                )}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => { setSellEntryToDelete(entry); setIsDeleteSellEntryDialogOpen(true); }}
                                                                    disabled={isSubmitting}
                                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
                    </TabsContent>
                )}
            </Tabs>

            {/* Add Product Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => { if (!isSubmitting) setIsAddDialogOpen(open); }}>
                <DialogContent className="sm:max-w-[600px] border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-gradient-to-br from-background to-muted/30 p-6">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-bold tracking-tight">Add New Product</DialogTitle>
                            <DialogDescription className="text-muted-foreground">Enter details for the new product to add to stock.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => handleFormSubmit(e, false)} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="addItemName" className="text-sm font-semibold text-foreground/80">Name</Label>
                                <Input
                                    id="addItemName"
                                    placeholder="e.g., T-Shirt (Blue)"
                                    className="bg-muted/50 border-input/50 focus:bg-background transition-all h-11"
                                    value={itemName}
                                    onChange={(e) => setItemName(e.target.value)}
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>



                            <div className="space-y-2">
                                <Label htmlFor="addItemStockCount" className="text-sm font-semibold text-foreground/80">Initial Stock Count *</Label>
                                <Input
                                    id="addItemStockCount"
                                    type="number"
                                    placeholder="Enter initial stock level"
                                    className="bg-muted/50 border-input/50 focus:bg-background transition-all h-11"
                                    value={itemStockCount}
                                    onChange={(e) => setItemStockCount(e.target.value)}
                                    required
                                    disabled={isSubmitting}
                                    min="0"
                                    step="1"
                                />
                            </div>

                            <div className="space-y-3">
                                <Label className="text-sm font-semibold text-foreground/80">Product Image (Optional)</Label>
                                <div className="flex items-center gap-4">
                                    <div className="h-24 w-24 rounded-xl bg-muted/50 flex items-center justify-center border-2 border-dashed border-input transition-all overflow-hidden shrink-0 group hover:border-primary/50">
                                        {imagePreviewUrl ? (
                                            <NextImage
                                                src={imagePreviewUrl}
                                                alt="Product preview"
                                                width={96}
                                                height={96}
                                                unoptimized={true}
                                                className="object-cover w-full h-full"
                                            />
                                        ) : (
                                            <ImageIcon className="h-8 w-8 text-muted-foreground/40 group-hover:text-primary/40 transition-colors" />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isSubmitting}
                                            className="bg-background hover:bg-muted/50 transition-all gap-2 h-10 px-4"
                                        >
                                            <UploadCloud className="h-4 w-4" />
                                            {selectedImageFile ? "Change Image" : "Upload Image"}
                                        </Button>
                                        {imagePreviewUrl && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs text-destructive hover:bg-destructive/10 h-8"
                                                onClick={() => { setSelectedImageFile(null); setImagePreviewUrl(null); }}
                                                disabled={isSubmitting}
                                            >
                                                <Trash2 className="mr-1.5 h-3 w-3" /> Remove
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <Input id="addModelImageFile" type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/jpeg,image/png,image/gif" />
                            </div>

                            <DialogFooter className="pt-6 gap-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-end">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsAddDialogOpen(false)}
                                    disabled={isSubmitting}
                                    className="bg-muted/30 hover:bg-muted/50 px-6 h-11 order-2 sm:order-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-gradient-to-r from-orange-500 to-primary hover:from-orange-600 hover:to-orange-500 shadow-lg shadow-orange-500/20 px-8 h-11 font-semibold order-1 sm:order-2"
                                >
                                    {isSubmitting ? "Adding..." : "Add Product"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Product Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!isSubmitting) setIsEditDialogOpen(open); }}>
                <DialogContent className="sm:max-w-[600px] border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-gradient-to-br from-background to-muted/30 p-6">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-bold tracking-tight">Edit Product</DialogTitle>
                            <DialogDescription className="text-muted-foreground">Update the details of this product.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => handleFormSubmit(e, true)} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="editItemName" className="text-sm font-semibold text-foreground/80">Name</Label>
                                <Input
                                    id="editItemName"
                                    className="bg-muted/50 border-input/50 focus:bg-background transition-all h-11"
                                    value={itemName}
                                    onChange={(e) => setItemName(e.target.value)}
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>



                            <div className="space-y-2">
                                <Label htmlFor="editItemStockChange" className="text-sm font-semibold text-foreground/80">Add/Remove Stock *</Label>
                                <Input
                                    id="editItemStockChange"
                                    placeholder="e.g., 50 to add, -20 to remove"
                                    className="bg-muted/50 border-input/50 focus:bg-background transition-all h-11"
                                    value={itemStockChange}
                                    onChange={(e) => setItemStockChange(e.target.value)}
                                    disabled={isSubmitting}
                                />
                                <p className="text-[11px] text-muted-foreground ml-1">
                                    Enter a positive number to add stock, or a negative number to remove it. (Current: {itemStockCount})
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-sm font-semibold text-foreground/80">Product Image (Optional)</Label>
                                <div className="flex items-center gap-4">
                                    <div className="h-24 w-24 rounded-xl bg-muted/50 flex items-center justify-center border-2 border-dashed border-input transition-all overflow-hidden shrink-0 group hover:border-primary/50">
                                        {imagePreviewUrl ? (
                                            <NextImage
                                                src={imagePreviewUrl}
                                                alt="Product preview"
                                                width={96}
                                                height={96}
                                                unoptimized={true}
                                                className="object-cover w-full h-full"
                                            />
                                        ) : (
                                            <ImageIcon className="h-8 w-8 text-muted-foreground/40 group-hover:text-primary/40 transition-colors" />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isSubmitting}
                                            className="bg-background hover:bg-muted/50 transition-all gap-2 h-10 px-4 text-sm font-medium"
                                        >
                                            <UploadCloud className="h-4 w-4" />
                                            {selectedImageFile ? "Change Image" : "Upload Image"}
                                        </Button>
                                        {imagePreviewUrl && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs text-destructive hover:bg-destructive/10 h-8"
                                                onClick={() => { setSelectedImageFile(null); setImagePreviewUrl(null); }}
                                                disabled={isSubmitting}
                                            >
                                                <Trash2 className="mr-1.5 h-3 w-3" /> Remove
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <Input id="editModelImageFile" type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/jpeg,image/png,image/gif" />
                            </div>

                            <DialogFooter className="pt-6 gap-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-end">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsEditDialogOpen(false)}
                                    disabled={isSubmitting}
                                    className="bg-muted/30 hover:bg-muted/50 px-6 h-11 order-2 sm:order-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-gradient-to-r from-orange-500 to-primary hover:from-orange-600 hover:to-orange-500 shadow-lg shadow-orange-500/20 px-8 h-11 font-semibold order-1 sm:order-2"
                                >
                                    {isSubmitting ? "Saving..." : "Save Changes"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the product <span className="font-semibold text-foreground">"{itemToDelete?.name}"</span> and remove its data from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleDelete(); }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Deleting..." : "Delete Product"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Add Sell Entry Dialog */}
            <Dialog open={isAddSellEntryDialogOpen} onOpenChange={(open) => { if (!isSubmitting) setIsAddSellEntryDialogOpen(open); }}>
                <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Add Multiple Sell Entries</DialogTitle>
                        <DialogDescription>Record a new business sale transaction. Required fields are marked with *.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddSellEntry}>
                        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="space-y-2 p-1">
                                <Label className="text-sm font-semibold">Transaction Date *</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal h-11 bg-muted/20 border-input/50",
                                                !sellEntryDate && "text-muted-foreground"
                                            )}
                                            disabled={isSubmitting}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                            {sellEntryDate ? format(sellEntryDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={sellEntryDate}
                                            onSelect={(date) => date && setSellEntryDate(date)}
                                            initialFocus
                                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {sellEntryItems.map((item, index) => (
                                <div key={item.id} className="relative p-4 border rounded-lg bg-muted/10">
                                    {sellEntryItems.length > 1 && (
                                        <div className="absolute right-2 top-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                onClick={() => {
                                                    const newItems = [...sellEntryItems];
                                                    newItems.splice(index, 1);
                                                    setSellEntryItems(newItems);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-[1fr_90px] gap-3 items-end">
                                        <div className="space-y-1">
                                            <Label htmlFor={`productSelect-${index}`}>Product *</Label>
                                            <Popover
                                                open={openProductSearchIndex === index}
                                                onOpenChange={(open) => setOpenProductSearchIndex(open ? index : null)}
                                            >
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={openProductSearchIndex === index}
                                                        className="w-full justify-between"
                                                        disabled={isSubmitting}
                                                    >
                                                        {item.productId
                                                            ? (() => {
                                                                const selectedProduct = models.find(m => m.id === item.productId);
                                                                return selectedProduct ? (
                                                                    <div className="flex items-center gap-2">
                                                                        {selectedProduct.imageUrl && (
                                                                            <NextImage
                                                                                src={selectedProduct.imageUrl}
                                                                                alt={selectedProduct.name}
                                                                                width={24}
                                                                                height={24}
                                                                                className="rounded object-cover"
                                                                            />
                                                                        )}
                                                                        <span className="truncate">{selectedProduct.name}</span>
                                                                    </div>
                                                                ) : "Select a product";
                                                            })()
                                                            : "Select a product"}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[400px] p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Search products..." />
                                                        <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                                            <CommandEmpty>No product found.</CommandEmpty>
                                                            <CommandGroup>
                                                                {models.map((product) => (
                                                                    <CommandItem
                                                                        key={product.id}
                                                                        value={product.name}
                                                                        onSelect={() => {
                                                                            const newItems = [...sellEntryItems];
                                                                            newItems[index].productId = product.id;
                                                                            setSellEntryItems(newItems);
                                                                            setOpenProductSearchIndex(null);
                                                                        }}
                                                                    >
                                                                        <div className="flex items-center gap-3 w-full">
                                                                            {product.imageUrl ? (
                                                                                <NextImage
                                                                                    src={product.imageUrl}
                                                                                    alt={product.name}
                                                                                    width={40}
                                                                                    height={40}
                                                                                    className="rounded object-cover"
                                                                                />
                                                                            ) : (
                                                                                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                                                                    <Package className="h-5 w-5 text-muted-foreground" />
                                                                                </div>
                                                                            )}
                                                                            <span className="flex-1">{product.name}</span>
                                                                            <Check
                                                                                className={cn(
                                                                                    "h-4 w-4",
                                                                                    item.productId === product.id ? "opacity-100" : "opacity-0"
                                                                                )}
                                                                            />
                                                                        </div>
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor={`quantity-${index}`}>Quantity *</Label>
                                            <Input
                                                id={`quantity-${index}`}
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const newItems = [...sellEntryItems];
                                                    newItems[index].quantity = e.target.value;
                                                    setSellEntryItems(newItems);
                                                }}
                                                placeholder="Qty"
                                                required
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSellEntryItems([...sellEntryItems, { id: Math.random().toString(36).substr(2, 9), productId: '', quantity: '1' }])}
                                className="w-full border-dashed border-2 items-center justify-center text-muted-foreground hover:text-foreground"
                                disabled={isSubmitting}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Another Item
                            </Button>
                        </div>
                        <DialogFooter className="pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddSellEntryDialogOpen(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    "Add Sell Entry"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Sell Entry Confirmation */}
            <AlertDialog open={isDeleteSellEntryDialogOpen} onOpenChange={setIsDeleteSellEntryDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Sell Entry?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete sell entry <span className="font-semibold text-foreground">"{sellEntryToDelete?.entryId}"</span>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleDeleteSellEntry(); }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Deleting..." : "Delete Entry"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
