
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import NextImage from 'next/image';
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
    Edit
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
import type { ServiceModelItem, TrackingLink } from '@/types';
import { getStockItems } from '@/lib/stock-service'; 
import { getSoldHistory } from '@/lib/sold-history-service';
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
    const [soldHistory, setSoldHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modelSearchTerm, setModelSearchTerm] = useState('');

    const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    
    const [itemName, setItemName] = useState('');
    const [itemBuyingPrice, setItemBuyingPrice] = useState('0');
    const [itemSellingPrice, setItemSellingPrice] = useState('0');
    const [itemStockCount, setItemStockCount] = useState('0');

    const [editingItem, setEditingItem] = useState<ItemToEdit | null>(null);
    const [itemToDelete, setItemToDelete] = useState<ItemToDelete | null>(null);

    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedItems, fetchedSoldHistory] = await Promise.all([
                getStockItems(),
                getSoldHistory(),
            ]);
            setStockItems(fetchedItems);
            setSoldHistory(fetchedSoldHistory);
        } catch (error) {
            console.error("Error fetching stock items or sold history:", error);
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
        setItemStockCount((item.stockCount ?? 0).toString());
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
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleAddEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemName.trim()) {
            toast({ title: "Validation Error", description: "Name cannot be empty.", variant: "destructive" });
            return;
        }
        
        if (!itemStockCount.trim()) {
            toast({ title: "Validation Error", description: "Stock count is required for stock items.", variant: "destructive"});
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
            const stockChange = stockCountValue - (editingItem.stockCount || 0);
            result = await updateStockItemAction(editingItem.id, itemName.trim(), buyingPriceValue, sellingPriceValue, finalImageUrl, true, stockChange);
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
        let sold = 0;
        let topSeller = { name: "N/A", quantity: 0 };
        const sCounts = new Map<string, number>();
        
        soldHistory.forEach(item => {
            sCounts.set(item.productName, (sCounts.get(item.productName) || 0) + item.quantity);
        });
        
        stockItems.forEach(item => {
            const currentStock = item.stockCount ?? 0;
            if (currentStock > 0) {
                active++;
                value += (item.buyingPrice ?? 0) * currentStock;
            }
            
            const quantitySold = sCounts.get(item.name) || 0;

            sold += quantitySold;
            if (quantitySold > topSeller.quantity) {
                topSeller = { name: item.name, quantity: quantitySold };
            }
        });

        return {
            activeProducts: active,
            totalValue: value,
            totalSold: sold,
            winningProduct: topSeller.quantity > 0 ? topSeller.name : "N/A",
        };
    }, [stockItems, soldHistory]);
    
    const soldHistoryData = useMemo(() => {
        return [...soldHistory].sort((a,b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
    }, [soldHistory]);

    const stockContent = (
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><Package className="h-5 w-5 text-primary"/>Stock Items</CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-0.5">Manage available products and their inventory.</CardDescription>
            </div>
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
        </CardHeader>
        <CardContent className="p-0 max-h-[calc(100vh-450px)] overflow-y-auto">
          <div className="overflow-x-auto">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead className="w-12 pl-4">SL</TableHead>
                          <TableHead className="min-w-[64px]">Image</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Buying Price</TableHead>
                          <TableHead>Selling Price</TableHead>
                          <TableHead className="text-center">Stock</TableHead>
                          <TableHead className="text-center">Sold</TableHead>
                          <TableHead className="pr-4 text-right">Actions</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                   {isLoading ? (
                      [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-16 w-full rounded-md" /></TableCell></TableRow>)
                    ) : filteredModels.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="p-6 text-center text-muted-foreground">
                          <Package className="mx-auto h-10 w-10 opacity-50 mb-2" />
                          No {modelSearchTerm ? `products found for "${modelSearchTerm}"` : `products found.`}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredModels.map((item, index) => (
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
                                  unoptimized={!item.imageUrl?.startsWith('https://colorhutbd.xyz')}
                              />
                          </TableCell>
                          <TableCell>
                             <span className="font-medium text-foreground">{item.name}</span>
                          </TableCell>
                          <TableCell className="font-mono">{formatCurrency(item.buyingPrice)}</TableCell>
                          <TableCell className="font-mono">{formatCurrency(item.sellingPrice)}</TableCell>
                          <TableCell className="text-center">
                                <span className={cn(
                                    "text-sm font-semibold flex items-center justify-center gap-1 p-1 rounded-full",
                                    item.stockCount !== undefined && item.stockCount > 0 ? "text-green-600" : "text-destructive"
                                )}>
                                    <Box className="h-4 w-4" />
                                    {item.stockCount ?? 0}
                                </span>
                          </TableCell>
                           <TableCell className="text-center">
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                {item.totalSold || 0}
                              </div>
                          </TableCell>
                          <TableCell className="pr-4 text-right">
                             <div className="flex items-center justify-end gap-2">
                              <Button variant="outline" size="icon" onClick={() => openEditDialog(item)} title={`Edit item`} className="h-8 w-8">
                                  <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => openDeleteDialog(item)} 
                                  title={`Delete item`} 
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
    );
    
    const soldHistoryContent = (
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
            <CardTitle className="text-card-foreground text-xl flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary"/>Sold History</CardTitle>
            <CardDescription className="text-muted-foreground text-sm mt-0.5">A log of all products sold across all orders.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 max-h-[calc(100vh-450px)] overflow-y-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Total Price</TableHead>
                        <TableHead>Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        [...Array(5)].map((_, i) => <TableRow key={`sold-skel-${i}`}><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>)
                    ) : soldHistoryData.length > 0 ? (
                        soldHistoryData.map((item, index) => (
                           <TableRow key={`${item.orderId}-${index}`}>
                               <TableCell><Link href={`/track/${item.orderId}`} className="text-primary hover:underline font-mono text-xs">{item.orderId}</Link></TableCell>
                               <TableCell>{item.productName}</TableCell>
                               <TableCell>{item.quantity}</TableCell>
                               <TableCell>{formatCurrency(item.totalPrice)}</TableCell>
                               <TableCell>{formatDate(item.saleDate)}</TableCell>
                           </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="p-6 text-center text-muted-foreground">No sales history found.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    );

    return (
        <div className="p-4 sm:p-6 min-h-full space-y-6">
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
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="stock">Stock</TabsTrigger>
                    <TabsTrigger value="sold_history">Sold History</TabsTrigger>
                </TabsList>
                <TabsContent value="stock" className="mt-4">
                    {stockContent}
                </TabsContent>
                <TabsContent value="sold_history" className="mt-4">
                    {soldHistoryContent}
                </TabsContent>
            </Tabs>


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
                            <Label htmlFor="itemStockCount">{editingItem ? 'Update Stock Count' : 'Initial Stock'} *</Label>
                            <Input 
                                id="itemStockCount"
                                type="number"
                                value={itemStockCount}
                                onChange={(e) => setItemStockCount(e.target.value)}
                                required
                                disabled={isSubmitting}
                                placeholder={editingItem ? "Enter the new total stock count" : "e.g., 100"}
                                step="1"
                            />
                            <p className="text-xs text-muted-foreground">{editingItem ? 'Enter the new total stock quantity. The change will be calculated automatically.' : 'Required for new stock items.'}</p>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="modelImageFile">Product Image (Optional)</Label>
                            <div className="flex items-center gap-4 mt-1">
                                {imagePreviewUrl ? <NextImage src={imagePreviewUrl} alt="Product preview" width={80} height={80} className="rounded-md object-cover border bg-muted" unoptimized={!imagePreviewUrl.startsWith('https://colorhutbd.xyz')} onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/80x80.png`; (e.target as HTMLImageElement).alt = 'Error loading image'; }} /> : <div className="h-20 w-20 rounded-md bg-muted flex items-center justify-center border border-dashed"><ImageIcon className="h-8 w-8 text-muted-foreground" /></div>}
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
        </div>
    );
}
