
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { User, VendorProduct, OrderItem } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, ChevronsUpDown, Check, CalendarDays, Percent } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AddEditBillDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onBillSaved: () => void;
  bill?: any | null; // Replace 'any' with a proper Bill type later
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
  const [billId, setBillId] = useState('');
  const [billDate, setBillDate] = useState<Date | undefined>(new Date());
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [billItems, setBillItems] = useState<DialogBillItem[]>([{ ...initialBillItemState }]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [billItemsTotal, setBillItemsTotal] = useState<number>(0);
  
  const [popoverOpenStates, setPopoverOpenStates] = useState<Record<string, boolean>>({});

  const { toast } = useToast();
  const isEditMode = !!bill;

  useEffect(() => {
    // This will run when the dialog opens or the bill prop changes.
    // Here you would populate the form if in edit mode.
    if (isOpen) {
      if (isEditMode) {
        // set form fields from bill prop
      } else {
        // reset form for add mode
      }
    }
  }, [isOpen, bill, isEditMode]);
  
  useEffect(() => {
    const total = billItems.reduce((sum, item) => sum + (item.lineItemTotalPrice || 0), 0);
    setBillItemsTotal(total);
  }, [billItems]);


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
    toast({ title: "In Progress", description: "This feature is currently under development." });
    // Logic for submitting the bill will go here
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <div className="sm:col-span-1 space-y-1">
                <Label htmlFor="vendor">Vendor *</Label>
                <Select value={selectedVendorId} onValueChange={setSelectedVendorId} required>
                    <SelectTrigger><SelectValue placeholder="Select a vendor" /></SelectTrigger>
                    <SelectContent>
                        {vendors.map(vendor => <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-1 space-y-1">
                <Label htmlFor="billId">Bill/Invoice ID</Label>
                <Input id="billId" value={billId} onChange={(e) => setBillId(e.target.value)} placeholder="e.g., INV-12345" />
              </div>
              <div className="sm:col-span-1 space-y-1">
                <Label htmlFor="billDate">Bill Date *</Label>
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
              <Label className="text-lg font-semibold">Bill Items *</Label>
              {billItems.map((item, index) => (
                <div key={item.id} className="p-3 border rounded-md bg-secondary/30 space-y-3">
                   <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-x-3 gap-y-2 items-end">
                      <div className="space-y-1">
                        <Label htmlFor={`product-${item.id}`}>Product *</Label>
                        <Popover open={popoverOpenStates[item.id] || false} onOpenChange={(open) => togglePopover(item.id, open)}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between bg-background">
                                    <span className="truncate">{item.productName || "Select product..."}</span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command><CommandInput placeholder="Search product..." /><CommandList><CommandEmpty>No product found.</CommandEmpty>
                                <CommandGroup>
                                    {products.map(p => (
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
                        <Label htmlFor={`quantity-${item.id}`}>Quantity *</Label>
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

            <div className="mt-4 p-4 border rounded-md bg-muted/30 space-y-2">
              <h4 className="text-md font-semibold text-foreground mb-2">Summary</h4>
              <div className="flex justify-between text-lg font-bold mt-1 pt-1 border-t border-border">
                <span className="text-primary">Total Bill Amount:</span>
                <span className="text-primary">{formatCurrencyBdt(billItemsTotal)}</span>
              </div>
            </div>

          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Bill'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddEditBillDialog;

