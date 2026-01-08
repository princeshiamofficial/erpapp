
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { User, VendorProduct, VendorBill, BillItem, VendorBillStatus, ServicePaymentMethodItem, BillPaymentRecord } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { addVendorBill, updateVendorBill } from '@/lib/vendor-bill-service';
import { Loader2, PlusCircle, Trash2, ChevronsUpDown, Check, CalendarDays, Percent } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddEditBillDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onBillSaved: () => void;
  bill?: VendorBill | null;
  currentUser: User;
  vendors: User[];
  products: VendorProduct[];
}

interface DialogBillItem {
  id: string;
  productName: string;
  quantity: string;
  unitPrice: number | null;
  lineItemTotalPrice: number | null;
}

const formatCurrencyBdt = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT' }).format(value);
};

const initialBillItemState: DialogBillItem = {
  id: uuidv4(),
  productName: '',
  quantity: '1',
  unitPrice: null,
  lineItemTotalPrice: null,
};

export function AddEditBillDialog({ isOpen, onOpenChange, onBillSaved, bill, currentUser, vendors, products }: AddEditBillDialogProps) {
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [billDate, setBillDate] = useState<Date | undefined>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [billItems, setBillItems] = useState<DialogBillItem[]>([{ ...initialBillItemState }]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [billItemsTotal, setBillItemsTotal] = useState<number>(0);
  const [discount, setDiscount] = useState('');
  const [calculatedDiscount, setCalculatedDiscount] = useState(0);
  const [netTotal, setNetTotal] = useState(0);
  
  const [popoverOpenStates, setPopoverOpenStates] = useState<Record<string, boolean>>({});
  const [isLoadingOptions, setIsLoadingOptions] = useState(false); // Although not fetching here, keep for consistency if needed later

  const { toast } = useToast();
  const isEditMode = !!bill;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && bill) {
        setSelectedVendorId(bill.vendorId);
        setBillDate(new Date(bill.billDate));
        setDueDate(bill.dueDate ? new Date(bill.dueDate) : undefined);
        setBillItems(bill.items.map(item => ({
          ...item,
          quantity: item.quantity.toString(),
        })));
        setNotes(bill.notes || '');
        setDiscount(bill.discount > 0 ? bill.discount.toString() : '');
      } else {
        setSelectedVendorId('');
        setBillDate(new Date());
        setDueDate(undefined);
        setBillItems([{ ...initialBillItemState, id: uuidv4() }]);
        setNotes('');
        setDiscount('');
      }
      setIsSubmitting(false);
    }
  }, [isOpen, bill, isEditMode]);
  
  const filteredProductsByVendor = useMemo(() => {
    if (!selectedVendorId) {
      return products;
    }
    const selectedVendor = vendors.find(v => v.id === selectedVendorId);
    if (!selectedVendor || !selectedVendor.category) {
      return [];
    }
    return products.filter(p => p.category === selectedVendor.category);
  }, [selectedVendorId, vendors, products]);


  useEffect(() => {
    const total = billItems.reduce((sum, item) => sum + (item.lineItemTotalPrice || 0), 0);
    setBillItemsTotal(total);

    let discountVal = 0;
    const discountStr = discount.trim();
    if (discountStr.endsWith('%')) {
        const percentage = parseFloat(discountStr.slice(0, -1));
        if (!isNaN(percentage) && percentage >= 0) {
            discountVal = (percentage / 100) * total;
        }
    } else {
        const fixedAmount = parseFloat(discountStr);
        if (!isNaN(fixedAmount) && fixedAmount >= 0) {
            discountVal = fixedAmount;
        }
    }
    discountVal = Math.min(discountVal, total);
    setCalculatedDiscount(discountVal);

    const currentNetTotal = Math.max(0, total - discountVal);
    setNetTotal(currentNetTotal);
  }, [billItems, discount]);

  const canSubmit = useMemo(() => {
    if (isSubmitting) return false;
    if (!selectedVendorId || !billDate) return false;
    if (billItems.length === 0 || billItems.some(item => !item.productName || !item.quantity || parseInt(item.quantity) <= 0)) return false;
    return true;
  }, [isSubmitting, selectedVendorId, billDate, billItems]);


  const calculateLineItemTotal = (unitPrice: number | null, quantityStr: string): number | null => {
    if (unitPrice === null) return null;
    const quantity = parseInt(quantityStr, 10);
    if (isNaN(quantity) || quantity < 1) return null;
    return unitPrice * quantity;
  };

  const handleItemChange = (itemId: string, field: 'productName' | 'quantity', value: string) => {
     setBillItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          let updatedItem = { ...item, [field]: value };
          if (field === 'productName') {
            const selectedProduct = products.find(p => p.name === value);
            updatedItem.unitPrice = selectedProduct?.price ?? null;
          }
          updatedItem.lineItemTotalPrice = calculateLineItemTotal(updatedItem.unitPrice, updatedItem.quantity);
          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleAddItem = () => {
    setBillItems([...billItems, { ...initialBillItemState, id: uuidv4() }]);
  };

  const handleRemoveItem = (id: string) => {
    if (billItems.length > 1) {
      setBillItems(billItems.filter(item => item.id !== id));
    }
  };
  
  const togglePopover = (itemId: string, open?: boolean) => {
    setPopoverOpenStates(prev => ({ ...prev, [itemId]: open === undefined ? !prev[itemId] : open }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast({ title: "Validation Error", description: "Please fill all required fields correctly.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    
    const existingPayments = (isEditMode && bill?.payments) || [];
    const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
    const finalAmountDue = Math.max(0, netTotal - totalPaid);
    const status: VendorBillStatus = finalAmountDue <= 0 ? 'Paid' : (totalPaid > 0 ? 'Partially Paid' : 'Unpaid');
    
    const billPayload: Omit<VendorBill, 'id'> = {
      vendorId: selectedVendorId,
      vendorName: vendors.find(v => v.id === selectedVendorId)?.name || 'Unknown',
      billDate: billDate!.toISOString(),
      dueDate: dueDate ? dueDate.toISOString() : null,
      items: billItems.map(item => ({...item, quantity: parseInt(item.quantity), unitPrice: item.unitPrice!, lineItemTotalPrice: item.lineItemTotalPrice!})),
      notes: notes.trim() || null,
      subtotal: billItemsTotal,
      discount: calculatedDiscount,
      total: netTotal,
      paidAmount: totalPaid,
      dueAmount: finalAmountDue,
      status,
      payments: existingPayments,
      createdAt: isEditMode && bill ? bill.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUserId: isEditMode && bill ? bill.createdByUserId : currentUser.id,
      createdByUserName: isEditMode && bill ? bill.createdByUserName : currentUser.name,
      billId: isEditMode && bill ? bill.billId : null,
    };

    let result;
    if (isEditMode && bill) {
      result = await updateVendorBill(bill.id, billPayload);
    } else {
      result = await addVendorBill(billPayload);
    }
    
    setIsSubmitting(false);

    if (result) {
        toast({ title: `Bill ${isEditMode ? 'Updated' : 'Created'}`, description: `Vendor bill has been saved successfully.`});
        onBillSaved();
        onOpenChange(false); // This will now correctly close the dialog
    } else {
        toast({ title: "Error", description: "Failed to save the vendor bill.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Create'} Vendor Bill</DialogTitle>
          <DialogDescription>
            {isEditMode ? `Update bill for vendor` : 'Create a new bill for a vendor purchase.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-1">
                <Label htmlFor="vendor">Vendor</Label>
                <Select value={selectedVendorId} onValueChange={setSelectedVendorId} required>
                    <SelectTrigger><SelectValue placeholder="Select a vendor" /></SelectTrigger>
                    <SelectContent>
                        {vendors.map(vendor => <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="billDate">Bill Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !billDate && "text-muted-foreground")}>
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {billDate ? format(billDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={billDate} onSelect={setBillDate} initialFocus /></PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-3 mt-4 border-t border-border pt-4">
              <Label className="text-lg font-semibold">Bill Items</Label>
              {billItems.map((item) => (
                <div key={item.id} className="p-3 border rounded-md bg-secondary/30 space-y-3">
                   <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-x-3 gap-y-2 items-end">
                      <div className="space-y-1">
                        <Label htmlFor={`product-${item.id}`}>Product</Label>
                        <Popover open={popoverOpenStates[item.id] || false} onOpenChange={(open) => togglePopover(item.id, open)}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between bg-background" disabled={!selectedVendorId}>
                                    <span className="truncate">{item.productName || "Select product..."}</span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command><CommandInput placeholder="Search product..." /><CommandList><CommandEmpty>No product found for this vendor's category.</CommandEmpty>
                                <CommandGroup>
                                    {filteredProductsByVendor.map(p => (
                                        <CommandItem key={p.id} value={p.name} onSelect={(val) => { handleItemChange(item.id, 'productName', val); togglePopover(item.id, false);}}>
                                            <Check className={cn("mr-2 h-4 w-4", item.productName === p.name ? "opacity-100" : "opacity-0")} />
                                            {p.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                </CommandList></Command>
                            </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`quantity-${item.id}`}>Quantity</Label>
                        <Input id={`quantity-${item.id}`} type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} min="1" required className="bg-background" />
                      </div>
                      <div className="space-y-1">
                        <Label>Total Price</Label>
                        <Input value={formatCurrencyBdt(item.lineItemTotalPrice)} readOnly disabled className="bg-muted/50 text-foreground" />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} disabled={billItems.length <= 1} className="h-10 w-10 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                   </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={handleAddItem} className="mt-2"><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-1">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add any relevant notes for this bill..."/>
            </div>

            <Separator className="my-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                <div className="space-y-1">
                    <Label htmlFor="discount">Discount</Label>
                    <div className="relative">
                       <Input id="discount" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="e.g., 100 or 5%" className="pl-7"/>
                       <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
            </div>
            
            <div className="mt-4 p-4 border rounded-md bg-muted/30 space-y-2">
              <h4 className="text-md font-semibold text-foreground mb-2">Summary</h4>
              <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium text-foreground">{formatCurrencyBdt(billItemsTotal)}</span>
              </div>
              {calculatedDiscount > 0 && (
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="font-medium text-red-600">- {formatCurrencyBdt(calculatedDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold mt-1 pt-1 border-t border-border">
                <span className="text-primary">Net Total:</span>
                <span className="text-primary">{formatCurrencyBdt(netTotal)}</span>
              </div>
            </div>

          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Bill'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddEditBillDialog;
    

    
```
- src/components/vendors/DeleteBillReportDialog.tsx:
```tsx

"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { BillReport } from "@/types";
import { Loader2, AlertTriangle } from 'lucide-react';

interface DeleteBillReportDialogProps {
  report: BillReport;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteBillReportDialog({ report, onConfirmDelete, isDeleting, isOpen, onOpenChange }: DeleteBillReportDialogProps) {
  
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!isDeleting) onOpenChange(open); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Bill Report?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the bill report for invoice <span className="font-semibold">{report.invoiceId}</span>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { if (!isDeleting) onOpenChange(false); }} disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirmDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90" 
            disabled={isDeleting}
          >
            {isDeleting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
            ) : "Yes, Delete Report"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteBillReportDialog;

```
- src/components/vendors/DeleteCategoryDialog.tsx:
```tsx

"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import type { VendorCategory } from "@/types";
import { Loader2 } from 'lucide-react';

interface DeleteCategoryDialogProps {
  category: VendorCategory;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteCategoryDialog({ category, onConfirmDelete, isDeleting, isOpen, onOpenChange }: DeleteCategoryDialogProps) {
  
  const handleDelete = async () => {
    await onConfirmDelete();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!isDeleting) onOpenChange(open)}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the category "<span className="font-semibold">{category.name}</span>". This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { if (!isDeleting) onOpenChange(false) }} disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90" 
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : "Delete Category"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteCategoryDialog;

```
- src/components/vendors/DeleteProductDialog.tsx:
```tsx

"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import type { VendorProduct } from "@/types";
import { Loader2 } from 'lucide-react';

interface DeleteProductDialogProps {
  product: VendorProduct;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteProductDialog({ product, onConfirmDelete, isDeleting, isOpen, onOpenChange }: DeleteProductDialogProps) {
  
  const handleDelete = async () => {
    await onConfirmDelete();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!isDeleting) onOpenChange(open)}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the product "<span className="font-semibold">{product.name}</span>". This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { if (!isDeleting) onOpenChange(false) }} disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90" 
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : "Delete Product"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteProductDialog;

```
- src/lib/api-helper2.ts:
```ts


// NOTE: This is a new helper file for the v3 API. It is not yet used by the application.
// To use this, you would import functions from this file instead of 'api-helper.ts'.

const API_V3_URL = 'https://data.colorhutbd.xyz/index.php';

export async function fetchFromApiV3(endpoint: string, options: RequestInit = {}) {
    if (!API_V3_URL) {
        throw new Error("API v3 URL is not configured in environment variables (API_V3_URL).");
    }

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Add CORS headers for local development
    const requestOptions: RequestInit = {
        ...options,
        headers,
        mode: 'cors', // Explicitly set mode to cors
    };


    const response = await fetch(`${API_V3_URL}${endpoint}`, requestOptions);

    if (!response.ok) {
        const errorText = await response.text();
        let errorData = { message: `API v3 request failed with status ${response.status}. Endpoint: ${endpoint}. Response: ${errorText}` };
        try {
            const parsedJson = JSON.parse(errorText);
            errorData.message = parsedJson.message || parsedJson.error || errorData.message;
        } catch (e) {
            // Not a JSON response, the raw text is the best we have.
        }
        console.error("API v3 Error Response:", errorData.message);
        throw new Error(errorData.message);
    }
    
    // Handle cases where the response might be empty (e.g., DELETE requests)
    const responseText = await response.text();
    if (!responseText) {
        return { success: true };
    }
    
    try {
        return JSON.parse(responseText);
    } catch (e) {
        console.error("API v3 Error: Response is not valid JSON.", responseText);
        throw new Error("API v3 returned an unexpected response format.");
    }
}

/**
 * Ensures a collection exists in the v3 API. If not, it creates it.
 * @param collectionName The name of the collection to ensure exists.
 */
export const ensureCollectionExistsV3 = async (collectionName: string) => {
    try {
        await fetchFromApiV3(`/collections/${collectionName}`);
    } catch (error) {
        if (error instanceof Error && error.message.toLowerCase().includes('not found')) {
            console.log(`V3 Collection '${collectionName}' not found. Attempting to create it...`);
            try {
                await fetchFromApiV3('/collections', {
                    method: 'POST',
                    body: JSON.stringify({ name: collectionName }),
                });
                console.log(`V3 Collection '${collectionName}' created successfully.`);
            } catch (creationError) {
                // If creation fails because it already exists (due to a race condition), we can ignore it.
                if (creationError instanceof Error && creationError.message.toLowerCase().includes('already exists')) {
                    console.log(`V3 Collection '${collectionName}' already exists. Race condition handled.`);
                    return; // This is a successful outcome.
                }
                // For other creation errors, we should still throw.
                console.error(`Failed to create v3 collection '${collectionName}':`, creationError);
                throw new Error(`Could not create required v3 collection '${collectionName}'.`);
            }
        } else {
            // Re-throw other errors (e.g., network issues)
            throw error;
        }
    }
};
```
- src/lib/attendance-service.ts:
```ts


"use server";

import { fetchFromApiV3, ensureCollectionExistsV3 } from './api-helper2';
import type { AttendanceRecord, User, AttendanceStatus } from '@/types';
import { format, isToday, parseISO } from 'date-fns';

const getCollectionNameForDate = (date: Date): string => {
  return `attendance-${format(date, 'yyyy-MM')}`;
};

const MARK_COLLECTION_NAME = 'attendance-mark';

export const getAttendanceForMonth = async (date: Date): Promise<AttendanceRecord[]> => {
  const collectionName = getCollectionNameForDate(date);
  try {
    await ensureCollectionExistsV3(collectionName);
    const response = await fetchFromApiV3(`collections/${collectionName}/documents?limit=4444&orderBy=checkInTime&direction=desc`);
    if (response && Array.isArray(response.documents)) {
      return response.documents.map((doc: { id: string, data: any }) => ({
        id: doc.id,
        ...doc.data,
      } as AttendanceRecord));
    }
    return [];
  } catch (error) {
    console.error(`Error fetching attendance for ${collectionName} via API v3:`, error);
    return [];
  }
};

export const addOrUpdateAttendanceRecord = async (recordData: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord | null> => {
  const checkInDate = new Date(recordData.checkInTime);
  const collectionName = getCollectionNameForDate(checkInDate);
  const documentId = `${recordData.employeeId}_${format(checkInDate, 'yyyy-MM-dd')}`;

  try {
    await ensureCollectionExistsV3(collectionName);
    const existingDoc = await fetchFromApiV3(`collections/${collectionName}/documents/${documentId}`).catch(() => null);

    const payload = { data: { ...(existingDoc?.data || {}), ...recordData } };

    if (existingDoc) {
      await fetchFromApiV3(`collections/${collectionName}/documents/${documentId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
        const createPayload = { id: documentId, data: recordData };
        await fetchFromApiV3(`collections/${collectionName}/documents`, {
            method: 'POST',
            body: JSON.stringify(createPayload),
        });
    }

    const savedDoc = await fetchFromApiV3(`collections/${collectionName}/documents/${documentId}`);
    return { id: savedDoc.id, ...savedDoc.data } as AttendanceRecord;
  } catch (error) {
    console.error(`Error adding/updating attendance record to ${collectionName} via API v3:`, error);
    if (error instanceof Error) throw error;
    return null;
  }
};


export const getAttendanceMark = async (userId: string): Promise<{ status: 'Checked In' | 'Checked Out', lastCheckInTime: string | null, lastCheckOutTime: string | null, attendanceStatus: AttendanceStatus, checkInLocation?: { lat: number; lng: number; } } | null> => {
    if (!userId) return null;
    try {
        await ensureCollectionExistsV3(MARK_COLLECTION_NAME);
        const doc = await fetchFromApiV3(`collections/${MARK_COLLECTION_NAME}/documents/${userId}`);
        // Check if the mark is from today
        if (doc && doc.data && doc.data.date && isToday(parseISO(doc.data.date))) {
            return doc.data;
        }
        return null; // Return null if not found or not for today
    } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
            return null; // Document doesn't exist, which is a valid state
        }
        console.error(`Error fetching attendance mark for user ${userId}:`, error);
        return null;
    }
};

export const setAttendanceMark = async (userId: string, data: any): Promise<boolean> => {
    if (!userId) return false;
    try {
        await ensureCollectionExistsV3(MARK_COLLECTION_NAME);
        const doc = await fetchFromApiV3(`collections/${MARK_COLLECTION_NAME}/documents/${userId}`).catch(() => null);
        
        const payload = {
            id: userId,
            data: { ...data, date: new Date().toISOString() }
        };

        if (doc) {
             await fetchFromApiV3(`collections/${MARK_COLLECTION_NAME}/documents/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
        } else {
             await fetchFromApiV3(`collections/${MARK_COLLECTION_NAME}/documents`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
        }
        return true;
    } catch (error) {
        console.error(`Error setting attendance mark for user ${userId}:`, error);
        return false;
    }
};

export const saveAttendanceAction = async (
  currentUser: User,
  recordData: Partial<Omit<AttendanceRecord, 'id' | 'employeeId' | 'employeeName'>>
): Promise<{ success: boolean; error?: string }> => {
  if (!currentUser?.id) {
    return { success: false, error: "User not authenticated." };
  }
  
  if (!recordData.checkInTime) {
    return { success: false, error: "Check-in time is missing."};
  }

  const fullRecordData: Omit<AttendanceRecord, 'id'> = {
    employeeId: currentUser.id,
    employeeName: currentUser.name,
    date: recordData.checkInTime.split('T')[0],
    checkInTime: recordData.checkInTime,
    status: recordData.status || 'On Time',
    checkOutTime: recordData.checkOutTime || null,
    hoursWorked: recordData.hoursWorked || null,
    lateReason: recordData.lateReason || null,
    earlyOutReason: recordData.earlyOutReason || null,
    location: recordData.location || 'Unknown',
    checkInLocation: recordData.checkInLocation,
    checkOutLocation: recordData.checkOutLocation,
  };

  try {
    // Save historical record
    const historyResult = await addOrUpdateAttendanceRecord(fullRecordData);
    if (!historyResult) {
      return { success: false, error: "Failed to save historical attendance record." };
    }

    // Save current day mark
    const markData = {
        status: recordData.checkOutTime ? 'Checked Out' : 'Checked In',
        lastCheckInTime: recordData.checkInTime,
        lastCheckOutTime: recordData.checkOutTime || null,
        attendanceStatus: recordData.status || 'On Time', // Persist the status
        checkInLocation: recordData.checkInLocation,
    };
    const markResult = await setAttendanceMark(currentUser.id, markData);
    if (!markResult) {
       console.warn(`[saveAttendanceAction] Historical record saved, but failed to save current day mark for user ${currentUser.id}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error in saveAttendanceAction:", error);
    return { success: false, error: "An unexpected server error occurred." };
  }
};
