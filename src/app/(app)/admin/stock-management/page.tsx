
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import NextImage from 'next/image';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { 
    Package, 
    TrendingUp, 
    Star, 
    BarChart, 
    Box,
    ShoppingCart,
    Trash2,
    PlusCircle,
    UploadCloud,
    ImageIcon,
    PackageCheck,
    AlertTriangle,
    Layers,
    RefreshCw,
    Search,
    Edit,
    MoreVertical,
    X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import type { ServiceModelItem, TrackingLink, SoldHistoryEntry, User } from '@/types';
import { getStockItems } from '@/lib/stock-service'; 
import { getSoldHistory, deleteSoldHistoryEntry } from '@/lib/sold-history-service';
import { getOrders } from '@/lib/order-service';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addStockItemAction, updateStockItemAction, deleteStockItemAction } from './actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseISO, format } from 'date-fns';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const AddEditSoldEntryDialog = dynamic(() => import('@/components/stock/AddEditSoldEntryDialog').then(mod => mod.AddEditSoldEntryDialog));

const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};

const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
        return format(parseISO(dateString), 'd MMM, yyyy');
    } catch (e) {
        return 'Invalid Date';
    }
}

const StatCard = ({ title, value, unit, icon: Icon, iconBg, children }: { title: string, value: string, unit?: string, icon?: React.ElementType, iconBg?: string, children?: React.ReactNode }) => (
    <div className="flex-1 p-4">
        <p className="text-sm text-gray-500">{title}</p>
        <div className="flex items-center gap-2 mt-1">
            {Icon && <div className={`p-1.5 rounded-md ${iconBg}`}><Icon className="h-4 w-4 text-white"/></div>}
            <span className="text-xl font-bold text-gray-800">{value}</span>
            {children ? children : (unit && <span className="text-sm text-gray-500">{unit}</span>)}
        </div>
    </div>
);


interface ItemToEdit {
  id: string;
  name: string;
  buyingPrice: string;
  sellingPrice: string;
  imageUrl?: string | null;
  stockCount?: number;
}
interface ItemToDelete {
  id: string;
  name: string;
}

export default function StockManagementPage() {
    const { currentUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState("stock");
    const [stockItems, setStockItems] = useState<ServiceModelItem[]>([]);
    const [soldHistory, setSoldHistory] = useState<SoldHistoryEntry[]>([]);
    const [allOrders, setAllOrders] = useState<TrackingLink[]>([]); 
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modelSearchTerm, setModelSearchTerm] = useState('');

    const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    
    const [itemName, setItemName] = useState('');
    const [itemBuyingPrice, setItemBuyingPrice] = useState('0');
    const [itemSellingPrice, setItemSellingPrice] = useState('0');
    const [itemStockCount, setItemStockCount] = useState('');

    const [editingItem, setEditingItem] = useState<ItemToEdit | null>(null);
    const [itemToDelete, setItemToDelete] = useState<ItemToDelete | null>(null);

    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [isSoldEntryDialogOpen, setIsSoldEntryDialogOpen] = useState(false);
    const [soldEntryToEdit, setSoldEntryToEdit] = useState<SoldHistoryEntry | null>(null);

    const [soldEntryToDelete, setSoldEntryToDelete] = useState<SoldHistoryEntry | null>(null);
    const [isDeletingSoldEntry, setIsDeletingSoldEntry] = useState(false);

    const [imageToView, setImageToView] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedItems, fetchedSoldHistory, fetchedOrders] = await Promise.all([
                getStockItems(),
                getSoldHistory(),
                getOrders(), 
            ]);
            setStockItems(fetchedItems);
            setSoldHistory(fetchedSoldHistory);
            setAllOrders(fetchedOrders); 
        } catch (error) {
            console.error("Error fetching stock data:", error);
            toast({ title: "Error", description: "Could not load stock data.", variant: "destructive" });
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
        if (!modelSearchTerm) return stockItems;
        return stockItems.filter(item =>
            item.name.toLowerCase().includes(modelSearchTerm.toLowerCase())
        );
    }, [stockItems, modelSearchTerm]);
    
    const openAddDialog = () => {
        setEditingItem(null);
        setItemName('');
        setItemBuyingPrice('0');
        setItemSellingPrice('0');
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
          stockCount: item.stockCount ?? 0,
        });
        setItemName(item.name);
        setItemBuyingPrice((item.buyingPrice ?? 0).toString());
        setItemSellingPrice((item.sellingPrice ?? 0).toString());
        setItemStockCount(''); // Input for change, not new total
        setSelectedImageFile(null);
        setImagePreviewUrl(item.imageUrl || null);
        setIsAddEditDialogOpen(true);
    };

    const openDeleteDialog = (item: ServiceModelItem) => {
        setItemToDelete({ id: item.id, name: item.name });
        setIsDeleteDialogOpen(true);
    };
    
    const handleOpenAddSoldEntry = () => {
        setSoldEntryToEdit(null);
        setIsSoldEntryDialogOpen(true);
    };

    const handleOpenEditSoldEntry = (entry: SoldHistoryEntry) => {
        setSoldEntryToEdit(entry);
        setIsSoldEntryDialogOpen(true);
    };
    
    const handleConfirmDeleteSoldEntry = async () => {
        if (!soldEntryToDelete) return;
        setIsDeletingSoldEntry(true);
        const result = await deleteSoldHistoryEntry(soldEntryToDelete.id);
        if (result) {
            toast({ title: "Sold Entry Deleted", description: "The sales record has been removed." });
            fetchData();
        } else {
            toast({ title: "Error", description: "Failed to delete sold entry.", variant: "destructive" });
        }
        setIsDeletingSoldEntry(false);
        setSoldEntryToDelete(null);
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
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleAddEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemName.trim()) {
            toast({ title: "Validation Error", description: "Name cannot be empty.", variant: "destructive" });
            return;
        }
        
        const buyingPriceValue = parseFloat(itemBuyingPrice);
        const sellingPriceValue = parseFloat(itemSellingPrice);
        const stockCountValue = parseInt(itemStockCount || "0", 10);

        if (isNaN(buyingPriceValue) || buyingPriceValue < 0) {
            toast({ title: "Validation Error", description: "Buying Price must be a non-negative number.", variant: "destructive" });
            return;
        }
        if (isNaN(sellingPriceValue) || sellingPriceValue < 0) {
            toast({ title: "Validation Error", description: "Selling Price must be a non-negative number.", variant: "destructive" });
            return;
        }
        if (isNaN(stockCountValue)) {
            toast({ title: "Validation Error", description: "Stock count must be a valid integer.", variant: "destructive"});
            return;
        }

        setIsSubmitting(true);
        let finalImageUrl: string | null = editingItem?.imageUrl || null;

        if (selectedImageFile) {
            const formData = new FormData();
            formData.append('file', selectedImageFile);
            try {
                const response = await fetch('https://colorhutbd.xyz/model-image/index.php', {
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
            finalImageUrl = null;
        }

        let result;
        if (editingItem) { 
            result = await updateStockItemAction(editingItem.id, itemName.trim(), buyingPriceValue, sellingPriceValue, finalImageUrl, true, stockCountValue);
            if (result.success) {
                toast({ title: "Success", description: `Item "${itemName.trim()}" updated.` });
            }
        } else { 
            result = await addStockItemAction(itemName.trim(), buyingPriceValue, sellingPriceValue, finalImageUrl, true, stockCountValue);
            if (result.success) {
                toast({ title: "Success", description: `Item "${itemName.trim()}" added.` });
            }
        }

        if (result && result.success) {
            setIsAddEditDialogOpen(false);
            await fetchData();
        } else if (result) {
            toast({ title: "Error", description: result.error || `Could not save item.`, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    const handleDeleteSubmit = async () => {
        if (!itemToDelete) return;
        setIsSubmitting(true);
        const result = await deleteStockItemAction(itemToDelete.id);
        if (result.success) {
            toast({ title: "Success", description: `Item "${itemToDelete.name}" deleted.` });
            setIsDeleteDialogOpen(false);
            setItemToDelete(null);
            await fetchData();
        } else {
            toast({ title: "Error", description: result.error || `Could not delete item. It might be in use.`, variant: "destructive" });
        }
        setIsSubmitting(false);
    };

    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM_ADMIN')) {
        return <div className="p-8 text-center">Access Denied.</div>;
    }
    
    const { winningProduct, totalSold, activeProducts, totalValue } = useMemo(() => {
        let active = 0;
        let value = 0;
        let sCounts = new Map<string, number>();
        
        soldHistory.forEach(item => {
            sCounts.set(item.productName, (sCounts.get(item.productName) || 0) + item.quantity);
        });
        
        let topSeller = { name: "N/A", quantity: 0 };

        stockItems.forEach(item => {
            const currentStock = item.stockCount ?? 0;
            if (currentStock > 0) {
                active++;
                value += (item.buyingPrice ?? 0) * currentStock;
            }
            
            const quantitySold = sCounts.get(item.name) || 0;

            if (quantitySold > topSeller.quantity) {
                topSeller = { name: item.name, quantity: quantitySold };
            }
        });
        
        const totalSoldItems = Array.from(sCounts.values()).reduce((acc, curr) => acc + curr, 0);

        return {
            activeProducts: active,
            totalValue: value,
            totalSold: totalSoldItems,
            winningProduct: topSeller.quantity > 0 ? topSeller.name : "N/A",
        };
    }, [stockItems, soldHistory]);
    
    const soldHistoryData = useMemo(() => {
        return [...soldHistory].sort((a,b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
    }, [soldHistory]);

    const stockContent = (
      <div className="h-full flex flex-col">
        <div className="sticky top-0 z-20 bg-background pt-4 pb-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
            <h2 className="text-card-foreground text-xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary"/>
              Products
            </h2>
            <div className="flex items-center gap-2">
                <div className="relative mt-0 sm:mt-0 w-full sm:w-auto">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={`Search products...`}
                        value={modelSearchTerm}
                        onChange={(e) => setModelSearchTerm(e.target.value)}
                        className="pl-9 bg-background/50 h-9"
                    />
                </div>
            </div>
          </div>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-lg" />)}
                </div>
            ) : filteredModels.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                    <Package className="mx-auto h-12 w-12 opacity-50 mb-4" />
                    <h3 className="text-lg font-semibold">No Products Found</h3>
                    <p className="text-sm">{modelSearchTerm ? `No products match "${modelSearchTerm}".` : "Add a product to get started."}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredModels.map(item => {
                        const quantitySold = soldHistory.filter(s => s.productName === item.name).reduce((acc, s) => acc + s.quantity, 0);
                        return (
                            <Card key={item.id} className="overflow-hidden shadow-lg border-border/20 rounded-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group bg-card">
                                <CardContent className="p-0">
                                    <div className="relative cursor-pointer" onClick={() => item.imageUrl && setImageToView(item.imageUrl)}>
                                        <NextImage
                                            src={item.imageUrl || `https://colorhutbd.xyz/image/product-not-found.jpg`}
                                            alt={item.name}
                                            width={300}
                                            height={300}
                                            className="object-cover w-full h-40 bg-muted"
                                        />
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 border-2 border-white/20 text-white">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onSelect={() => openEditDialog(item)} className="cursor-pointer">
                                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => openDeleteDialog(item)} className="cursor-pointer text-destructive focus:text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <div className={cn(
                                            "absolute bottom-2 right-2 text-xs font-bold flex items-center gap-1.5 p-1.5 rounded-full backdrop-blur-sm",
                                            (item.stockCount ?? 0) > 0 ? "bg-green-500/20 text-green-100 border border-green-400/50" : "bg-red-500/20 text-red-100 border border-red-400/50"
                                        )}>
                                            <Box className="h-4 w-4" />
                                            Stock: {item.stockCount ?? 0}
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <h4 className="font-bold text-md truncate text-foreground" title={item.name}>{item.name}</h4>
                                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                                            <span>Buy: <span className="font-mono text-foreground font-semibold">{formatCurrency(item.buyingPrice)}</span></span>
                                            <span>Sell: <span className="font-mono text-foreground font-semibold">{formatCurrency(item.sellingPrice)}</span></span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-dashed">
                                            <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                                                <ShoppingCart className="h-4 w-4 text-primary" />
                                                <span className="font-semibold">{quantitySold}</span> Sold
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
      </div>
    );
    
    const soldHistoryContent = (
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <div className="flex justify-between items-center">
            <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary"/>Sold History</CardTitle>
            <Button onClick={handleOpenAddSoldEntry}>Add Sold Entry</Button>
          </div>
          <CardDescription className="text-muted-foreground text-sm mt-0.5">A log of all products sold across all orders.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 max-h-[calc(100vh-450px)] overflow-y-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Recorded by</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Total Price</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right pr-4">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        [...Array(5)].map((_, i) => <TableRow key={`sold-skel-${i}`}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
                    ) : soldHistoryData.length > 0 ? (
                        soldHistoryData.map((item, index) => (
                           <TableRow key={item.id}>
                               <TableCell><Link href={`/track/${item.orderId}`} className="text-primary hover:underline font-mono text-xs">{item.orderId}</Link></TableCell>
                               <TableCell>{item.productName}</TableCell>
                               <TableCell>{item.quantity}</TableCell>
                               <TableCell>{formatCurrency(item.totalPrice)}</TableCell>
                               <TableCell>{formatDate(item.saleDate)}</TableCell>
                               <TableCell className="text-right pr-4">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onSelect={() => handleOpenEditSoldEntry(item)} className="cursor-pointer"><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                      <DropdownMenuItem onSelect={() => setSoldEntryToDelete(item)} className="cursor-pointer text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                               </TableCell>
                           </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="p-6 text-center text-muted-foreground">No sales history found.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    );

    return (
        <>
            <div className="h-screen flex flex-col p-4 sm:p-6">
                <div className="sticky top-0 z-30 mb-6">
                    <Card className="shadow-lg rounded-xl">
                        <CardContent className="p-2">
                            <div className="flex flex-col md:flex-row md:items-center md:divide-x md:divide-gray-200">
                                <StatCard title="Active Product" value={activeProducts.toString()} unit="Products" icon={Package} iconBg="bg-green-500" />
                                <StatCard title="Total Inventory Value" value={formatCurrency(totalValue)} unit="BDT" icon={BarChart} iconBg="bg-blue-500" />
                                <StatCard title="Winning Product" value={winningProduct} icon={Star} iconBg="bg-orange-400" />
                                <StatCard title="Product Sold" value={totalSold.toLocaleString()} unit="Items" icon={ShoppingCart} iconBg="bg-purple-500"/>
                                <div className="flex-1 p-4 flex items-center justify-center">
                                    <Button className="w-full h-12" onClick={openAddDialog}>
                                        <PlusCircle className="mr-2 h-5 w-5" />
                                        Add Products
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                
                <div className="flex-1 flex flex-col min-h-0">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                        <TabsList>
                            <TabsTrigger value="stock">Stock</TabsTrigger>
                            <TabsTrigger value="sold_history">Sold History</TabsTrigger>
                        </TabsList>
                        <TabsContent value="stock" className="mt-4 flex-1 flex flex-col min-h-0">
                             <div className="flex-1 overflow-y-auto custom-scrollbar -m-4">
                               {stockContent}
                             </div>
                        </TabsContent>
                        <TabsContent value="sold_history" className="mt-4">
                            {soldHistoryContent}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
                
            <AddEditSoldEntryDialog
                isOpen={isSoldEntryDialogOpen}
                onOpenChange={setIsSoldEntryDialogOpen}
                onSave={fetchData}
                entryToEdit={soldEntryToEdit}
                stockItems={stockItems}
                allOrders={allOrders}
            />
            
            {soldEntryToDelete && (
                <AlertDialog open={!!soldEntryToDelete} onOpenChange={() => setSoldEntryToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Sold Entry?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete the sales record for {soldEntryToDelete.quantity}x "{soldEntryToDelete.productName}"? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setSoldEntryToDelete(null)} disabled={isDeletingSoldEntry}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmDeleteSoldEntry} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isDeletingSoldEntry}>
                                {isDeletingSoldEntry ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}


            <Dialog open={isAddEditDialogOpen} onOpenChange={(open) => { if (!isSubmitting) setIsAddEditDialogOpen(open); }}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit' : 'Add New'} Product</DialogTitle>
                        <DialogDescription>{editingItem ? 'Update the details of this product.' : 'Enter details for the new product.'}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddEditSubmit} className="space-y-4 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="itemName">Name</Label>
                            <Input id="itemName" value={itemName} onChange={(e) => setItemName(e.target.value)} required disabled={isSubmitting} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="itemBuyingPrice">Buying Price (BDT)</Label>
                                <Input id="itemBuyingPrice" type="number" value={itemBuyingPrice} onChange={(e) => setItemBuyingPrice(e.target.value)} required disabled={isSubmitting} placeholder="e.g., 1000.00" min="0" step="0.01" />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="itemSellingPrice">Selling Price (BDT)</Label>
                                <Input id="itemSellingPrice" type="number" value={itemSellingPrice} onChange={(e) => setItemSellingPrice(e.target.value)} required disabled={isSubmitting} placeholder="e.g., 1500.00" min="0" step="0.01" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="itemStockCount">{editingItem ? 'Add/Remove Stock' : 'Initial Stock'} *</Label>
                            <Input 
                                id="itemStockCount"
                                type="number"
                                value={itemStockCount}
                                onChange={(e) => setItemStockCount(e.target.value)}
                                required
                                disabled={isSubmitting}
                                placeholder={editingItem ? "e.g., 50 to add, -20 to remove" : "e.g., 100"}
                                step="1"
                            />
                             <p className="text-xs text-muted-foreground">{editingItem ? 'Enter a positive number to add stock, or a negative number to remove it.' : 'Required for new stock items.'}</p>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="modelImageFile">Product Image (Optional)</Label>
                            <div className="flex items-center gap-4 mt-1">
                                {imagePreviewUrl ? <NextImage src={imagePreviewUrl} alt="Product preview" width={80} height={80} className="rounded-md object-cover border bg-muted" unoptimized={!imagePreviewUrl.startsWith('https://colorhutbd.xyz')} onError={(e) => { (e.target as HTMLImageElement).src = `https://colorhutbd.xyz/image/product-not-found.jpg`; (e.target as HTMLImageElement).alt = 'Error loading image'; }} /> : <div className="h-20 w-20 rounded-md bg-muted flex items-center justify-center border border-dashed"><ImageIcon className="h-8 w-8 text-muted-foreground" /></div>}
                                <div className="flex flex-col gap-2">
                                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}><UploadCloud className="mr-2 h-4 w-4" /> {selectedImageFile ? "Change Image" : "Upload Image"}</Button>
                                    {imagePreviewUrl && <Button type="button" variant="ghost" size="sm" className="text-xs text-destructive hover:bg-destructive/10" onClick={handleRemoveImage} disabled={isSubmitting}><Trash2 className="mr-1 h-3 w-3" /> Remove Image</Button>}
                                </div>
                            </div>
                            <Input id="modelImageFile" type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/jpeg,image/png,image/gif" />
                        </div>
                        <DialogFooter className="pt-4"><Button type="button" variant="outline" onClick={() => setIsAddEditDialogOpen(false)} disabled={isSubmitting}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : (editingItem ? "Save Changes" : "Add Product")}</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {itemToDelete && (
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-destructive" /> Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone. This will permanently delete the product "<span className="font-semibold">{itemToDelete.name}</span>".</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setItemToDelete(null)} disabled={isSubmitting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteSubmit} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isSubmitting}>{isSubmitting ? "Deleting..." : `Yes, delete product`}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            <Dialog open={!!imageToView} onOpenChange={() => setImageToView(null)}>
              <DialogContent className="max-w-3xl p-2">
                <DialogHeader>
                  <DialogTitle className="sr-only">Product Image</DialogTitle>
                </DialogHeader>
                {imageToView && (
                  <NextImage
                    src={imageToView}
                    alt="Product full view"
                    width={800}
                    height={800}
                    className="rounded-md object-contain w-full h-auto max-h-[80vh]"
                  />
                )}
              </DialogContent>
            </Dialog>
        </>
    );
}
