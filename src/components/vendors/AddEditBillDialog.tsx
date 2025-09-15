
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
import { getPaymentMethods } from '@/lib/service-options-service';
import { Loader2, PlusCircle, Trash2, ChevronsUpDown, Check, CalendarDays, Percent, ReceiptText } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { cn } from '@/lib/utils';
import { Separator } from "@/components/ui/separator";
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
  const [amountDue, setAmountDue] = useState(0);
  
  const [newPaidAmount, setNewPaidAmount] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [newPaymentNotes, setNewPaymentNotes] = useState('');

  const [existingPayments, setExistingPayments] = useState<BillPaymentRecord[]>([]);

  const [popoverOpenStates, setPopoverOpenStates] = useState<Record<string, boolean>>({});
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<ServicePaymentMethodItem[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);


  const { toast } = useToast();
  const isEditMode = !!bill;

  const fetchOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    try {
      const fetchedPaymentMethods = await getPaymentMethods();
      setPaymentMethodOptions(fetchedPaymentMethods);
    } catch (error) {
      toast({ title: "Error", description: "Could not load payment methods.", variant: "destructive" });
    } finally {
      setIsLoadingOptions(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      fetchOptions();
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
        setExistingPayments(bill.payments || []);
        // Reset new payment fields for edit mode
        setNewPaidAmount('');
        setNewPaymentMethod('');
        setNewPaymentNotes('');
      } else {
        setSelectedVendorId('');
        setBillDate(new Date());
        setDueDate(undefined);
        setBillItems([{ ...initialBillItemState, id: uuidv4() }]);
        setNotes('');
        setDiscount('');
        setExistingPayments([]);
        setNewPaidAmount('');
        setNewPaymentMethod('');
        setNewPaymentNotes('');
      }
      setIsSubmitting(false);
    }
  }, [isOpen, bill, isEditMode, fetchOptions]);
  
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

    const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0) + (parseFloat(newPaidAmount) || 0);
    setAmountDue(Math.max(0, currentNetTotal - totalPaid));
  }, [billItems, discount, newPaidAmount, existingPayments]);

  const canSubmit = useMemo(() => {
    if (isSubmitting) return false;
    if (!selectedVendorId || !billDate) return false;
    if (billItems.length === 0 || billItems.some(item => !item.productName || !item.quantity || parseInt(item.quantity) <= 0)) return false;
    
    const paidAmountNum = parseFloat(newPaidAmount) || 0;
    if (paidAmountNum > 0 && !newPaymentMethod) {
      return false;
    }
    
    return true;
  }, [isSubmitting, selectedVendorId, billDate, billItems, newPaidAmount, newPaymentMethod]);


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
    
    const allPayments = [...existingPayments];
    const newPaidAmountNum = parseFloat(newPaidAmount) || 0;
    if (newPaidAmountNum > 0) {
      allPayments.push({
        id: uuidv4(),
        amount: newPaidAmountNum,
        date: new Date().toISOString(),
        paymentMethod: newPaymentMethod,
        notes: newPaymentNotes.trim() || null,
        recordedByUserId: currentUser.id,
        recordedByUserName: currentUser.name,
      });
    }

    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    const finalAmountDue = Math.max(0, netTotal - totalPaid);
    const status: VendorBillStatus = finalAmountDue <= 0 ? 'Paid' : (totalPaid > 0 ? 'Partially Paid' : 'Unpaid');
    
    const billPayload: Omit<VendorBill, 'id'> = {
      vendorId: selectedVendorId,
      vendorName: vendors.find(v => v.id === selectedVendorId)?.name || 'Unknown',
      billDate: billDate!.toISOString(),
      dueDate: dueDate ? dueDate.toISOString() : null,
      items: billItems.map(item => ({...item, quantity: parseInt(item.quantity), unitPrice: item.unitPrice!, lineItemTotalPrice: item.lineItemTotalPrice!})),
      notes: notes || null,
      subtotal: billItemsTotal,
      discount: calculatedDiscount,
      total: netTotal,
      paidAmount: totalPaid,
      dueAmount: finalAmountDue,
      status,
      payments: allPayments,
      createdAt: isEditMode && bill ? bill.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUserId: isEditMode && bill ? bill.createdByUserId : currentUser.id,
      createdByUserName: isEditMode && bill ? bill.createdByUserName : currentUser.name,
    };

    let result = null;
    if (isEditMode && bill) {
      result = await updateVendorBill(bill.id, billPayload);
    } else {
      result = await addVendorBill(billPayload);
    }
    
    setIsSubmitting(false);

    if (result) {
        toast({ title: `Bill ${isEditMode ? 'Updated' : 'Created'}`, description: `Vendor bill has been saved successfully.`});
        onBillSaved();
        onOpenChange(false);
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
              {billItems.map((item, index) => (
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

            {existingPayments.length > 0 && (
            <div className="mt-4 space-y-2">
                <Label className="text-md font-semibold flex items-center"><ReceiptText className="mr-2 h-5 w-5 text-primary/80"/>Payment History</Label>
                <div className="max-h-40 overflow-y-auto border rounded-md bg-muted/20 p-2 custom-scrollbar">
                <Table size="sm">
                    <TableHeader><TableRow><TableHead className="h-8 text-xs">Date</TableHead><TableHead className="h-8 text-xs">Amount</TableHead><TableHead className="h-8 text-xs">Method</TableHead><TableHead className="h-8 text-xs">Notes</TableHead></TableRow></TableHeader>
                    <TableBody>
                    {existingPayments.map(p => (
                        <TableRow key={p.id}><TableCell className="text-xs py-1.5">{format(new Date(p.date), 'd MMM yyyy')}</TableCell><TableCell className="text-xs py-1.5">{formatCurrencyBdt(p.amount)}</TableCell><TableCell className="text-xs py-1.5">{p.paymentMethod}</TableCell><TableCell className="text-xs py-1.5">{p.notes || 'N/A'}</TableCell></TableRow>
                    ))}
                    </TableBody>
                </Table>
                </div>
            </div>
            )}
            
            <Separator className="my-4" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                <div className="space-y-1">
                    <Label htmlFor="discount">Discount</Label>
                    <div className="relative">
                       <Input id="discount" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="e.g., 100 or 5%" className="pl-7"/>
                       <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="paidAmount">Add Payment</Label>
                    <Input id="paidAmount" type="number" value={newPaidAmount} onChange={(e) => setNewPaidAmount(e.target.value)} placeholder="e.g., 5000" min="0" />
                </div>
                 {(parseFloat(newPaidAmount) || 0) > 0 && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod} required={(parseFloat(newPaidAmount) || 0) > 0}>
                        <SelectTrigger><SelectValue placeholder="Select method..." /></SelectTrigger>
                        <SelectContent>
                          {isLoadingOptions ? <div className="p-2 text-sm">Loading...</div> : paymentMethodOptions.map(opt => <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 md:col-span-2 lg:col-span-3">
                        <Label htmlFor="paymentNotes">Payment Notes</Label>
                        <Input id="paymentNotes" value={newPaymentNotes} onChange={(e) => setNewPaymentNotes(e.target.value)} placeholder="Optional notes for this payment" />
                    </div>
                  </>
                )}
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
              <div className="flex justify-between text-sm font-semibold">
                  <span className="text-foreground">Net Total:</span>
                  <span className="text-foreground">{formatCurrencyBdt(netTotal)}</span>
              </div>
              <div className="flex justify-between text-sm pt-1 border-t border-dashed">
                    <span className="text-muted-foreground">Total Paid:</span>
                    <span className="font-medium text-green-600">{formatCurrencyBdt(existingPayments.reduce((sum, p) => sum + p.amount, 0) + (parseFloat(newPaidAmount) || 0))}</span>
              </div>
              <div className="flex justify-between text-lg font-bold mt-1 pt-1 border-t border-border">
                <span className="text-primary">Amount Due:</span>
                <span className="text-primary">{formatCurrencyBdt(amountDue)}</span>
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

    