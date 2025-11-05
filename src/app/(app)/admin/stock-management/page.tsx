
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
    ChevronLeft, 
    ChevronRight, 
    MoreVertical, 
    Edit,
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
    Eye
} from "lucide-react";
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadialChart } from '@/components/ui/radial-chart';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import type { ServiceModelItem, TrackingLink } from '@/types';
import { getStockItems } from '@/lib/stock-service'; // Use new stock service
import { getOrders } from '@/lib/order-service';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addStockItemAction, updateStockItemAction, deleteStockItemAction } from './actions'; // Use new stock actions

const formatNumber = (num: number) => {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
};

const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};


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


const PerformanceGauge = ({ value }: { value: number }) => {
    const data = [
        { name: 'performance', value: value, fill: 'hsl(var(--primary))' }
    ];
    return (
        <div className="w-20 h-10">
             <RadialChart
                data={data}
                startAngle={180}
                endAngle={0}
                innerRadius={30}
                outerRadius={40}
                cy="40px"
             />
        </div>
    )
}

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


export default function StockManagementPage() {
    const { currentUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [stockItems, setStockItems] = useState<ServiceModelItem[]>([]);
    const [allOrders, setAllOrders] = useState<TrackingLink[]>([]);
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
            const [fetchedItems, fetchedOrders] = await Promise.all([
                getStockItems(),
                getOrders(),
            ]);
            setStockItems(fetchedItems);
            setAllOrders(fetchedOrders);
        } catch (error) {
            console.error("Error fetching stock items or orders:", error);
            toast({ title: "Error", description: "Could not load stock items or order data.", variant: "destructive" });
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
          isReadyMade: item.isReadyMade ?? true,
          stockCount: item.stockCount ?? 0,
        });
        setItemName(item.name);
        setItemBuyingPrice((item.buyingPrice ?? 0).toString());
        setItemSellingPrice((item.sellingPrice ?? 0).toString());
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
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleAddEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemName.trim()) {
            toast({ title: "Validation Error", description: "Name cannot be empty.", variant: "destructive" });
            return;
        }
        
        if (itemStockCount.trim() === '') {
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
        let sold = 0;
        let topSeller = { name: "N/A", quantity: 0 };
        const soldCounts = new Map<string, number>();
        
        allOrders.forEach(order => {
            order.orderItems.forEach(item => {
                soldCounts.set(item.model, (soldCounts.get(item.model) || 0) + item.quantity);
            });
        });
        
        stockItems.forEach(item => {
            if (item.isReadyMade) {
                const currentStock = item.stockCount ?? 0;
                if (currentStock > 0) {
                    active++;
                    value += (item.buyingPrice ?? 0) * currentStock;
                }
            }
            const quantitySold = soldCounts.get(item.name) || 0;
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
    }, [stockItems, allOrders]);

    const getPerformanceColor = (performance: string) => {
        switch (performance.toLowerCase()) {
            case 'excellent': return 'text-green-500';
            case 'good': return 'text-yellow-500';
            case 'bad': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    return (
        <div className="p-4 sm:p-6 min-h-full space-y-6 bg-transparent">
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

            <div className="bg-white rounded-xl shadow-lg">
                <div className="overflow-x-auto">
                    <div className="min-w-full">
                         {isLoading ? (
                            <div className="p-4 space-y-2">
                                {[...Array(5)].map((_,i) => <Skeleton key={i} className="h-16 w-full" />)}
                            </div>
                         ) : filteredModels.map((product, index) => (
                            <div key={product.id} className={`grid grid-cols-11 items-center gap-4 px-4 py-3 ${index < filteredModels.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                <div className="col-span-12 md:col-span-3 flex items-center gap-4">
                                    <NextImage src={product.imageUrl || `https://placehold.co/64x64/F2F2F2/333333?text=${product.name.charAt(0)}`} alt={product.name} width={48} height={48} className="rounded-lg bg-gray-100 object-cover" unoptimized={!product.imageUrl?.startsWith('https://colorhutbd.xyz')} />
                                    <div>
                                        <p className="font-semibold text-gray-800">{product.name}</p>
                                        <div className="flex items-center gap-1 text-sm text-gray-500">
                                            <span>Review: 4.5</span>
                                            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="col-span-6 md:col-span-2">
                                    <p className="text-xs text-gray-500 mb-1">Performance</p>
                                    <p className={`font-semibold ${getPerformanceColor('Good')}`}>Good</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                        <div className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {formatNumber(allOrders.flatMap(o => o.orderItems).filter(i => i.model === product.name).reduce((sum, i) => sum + i.quantity, 0))}</div>
                                        <div className="flex items-center gap-1"><Eye className="h-3 w-3" /> {formatNumber(994)}</div>
                                    </div>
                                </div>

                                <div className="col-span-6 md:col-span-1 flex items-center justify-center">
                                    <PerformanceGauge value={75} />
                                </div>

                                <div className="col-span-6 md:col-span-1">
                                    <p className="text-xs text-gray-500">Stock</p>
                                    <div className="flex items-center gap-1 font-semibold text-gray-800">
                                        <Box className="h-4 w-4 text-gray-400"/>
                                        {(product.stockCount ?? 0)}
                                    </div>
                                </div>

                                <div className="col-span-6 md:col-span-2">
                                    <p className="text-xs text-gray-500">Product Price</p>
                                    <p className="font-semibold text-gray-800">
                                        {formatCurrency(product.sellingPrice)}
                                    </p>
                                </div>

                                <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-2">
                                     <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-200" onClick={() => openEditDialog(product)}>
                                        <Edit className="h-4 w-4"/>
                                     </Button>
                                      <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-200">
                                        <Eye className="h-4 w-4"/>
                                     </Button>
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-200">
                                                <MoreVertical className="h-4 w-4"/>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openDeleteDialog(product)}>Delete</DropdownMenuItem>
                                        </DropdownMenuContent>
                                     </DropdownMenu>
                                </div>
                            </div>
                         ))}
                    </div>
                </div>
                 <div className="flex items-center justify-between p-4">
                    <Button variant="outline">
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Previous
                    </Button>
                    <span className="text-sm text-gray-500">Page 1 of 10</span>
                    <Button variant="outline">
                        Next
                        <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            </div>

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
                            <p className="text-xs text-muted-foreground">{editingItem ? 'Enter a positive number to add stock, or a negative number to remove it.' : 'Required for new ready-made items.'}</p>
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
