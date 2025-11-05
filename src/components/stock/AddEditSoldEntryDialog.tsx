
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import type { SoldHistoryEntry, ServiceModelItem, TrackingLink } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { addSoldHistoryEntry, updateSoldHistoryEntry } from '@/lib/sold-history-service';
import { updateModelStock } from '@/lib/service-options-service';
import { Loader2, Calendar as CalendarIcon, ChevronsUpDown, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface AddEditSoldEntryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: () => void;
  entryToEdit?: SoldHistoryEntry | null;
  stockItems: ServiceModelItem[];
  allOrders?: TrackingLink[]; // Make optional and handle undefined case
}

export function AddEditSoldEntryDialog({ isOpen, onOpenChange, onSave, entryToEdit, stockItems, allOrders }: AddEditSoldEntryDialogProps) {
  const [orderId, setOrderId] = useState('');
  const [companyName, setCompanyName] = useState(''); // State for company name
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [saleDate, setSaleDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProductPopoverOpen, setIsProductPopoverOpen] = useState(false);
  const { toast } = useToast();

  const isEditMode = !!entryToEdit;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && entryToEdit) {
        setOrderId(entryToEdit.orderId);
        // Find company name from allOrders if available
        const order = allOrders?.find(o => o.id === entryToEdit.orderId);
        setCompanyName(order?.companyName.split('•').pop()?.trim() || '');
        setProductName(entryToEdit.productName);
        setQuantity(entryToEdit.quantity.toString());
        setTotalPrice(entryToEdit.totalPrice.toString());
        setSaleDate(parseISO(entryToEdit.saleDate));
      } else {
        setOrderId('');
        setCompanyName('');
        setProductName('');
        setQuantity('');
        setTotalPrice('');
        setSaleDate(new Date());
      }
    }
  }, [isOpen, entryToEdit, isEditMode, allOrders]);

  useEffect(() => {
    // Ensure allOrders is an array before trying to use .find()
    if (allOrders && Array.isArray(allOrders) && orderId) {
      const matchingOrder = allOrders.find(o => o.id.toLowerCase() === orderId.toLowerCase());
      if (matchingOrder) {
        setCompanyName(matchingOrder.companyName.split('•').pop()?.trim() || matchingOrder.companyName);
      } else {
        setCompanyName('');
      }
    } else {
      setCompanyName('');
    }
  }, [orderId, allOrders]);

  useEffect(() => {
    if (productName && quantity) {
      const product = stockItems.find(item => item.name === productName);
      const numericQuantity = parseInt(quantity, 10);

      if (product && typeof product.sellingPrice === 'number' && !isNaN(numericQuantity) && numericQuantity > 0) {
        const calculatedPrice = product.sellingPrice * numericQuantity;
        setTotalPrice(calculatedPrice.toString());
      } else {
        setTotalPrice(''); // Reset if quantity is invalid or product has no price
      }
    } else {
      setTotalPrice(''); // Reset if no product or quantity
    }
  }, [productName, quantity, stockItems]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !productName || !quantity || !totalPrice || !saleDate) {
      toast({ title: "Validation Error", description: "All fields are required.", variant: "destructive" });
      return;
    }
    const numericQuantity = parseInt(quantity, 10);
    const numericPrice = parseFloat(totalPrice);
    if (isNaN(numericQuantity) || numericQuantity <= 0 || isNaN(numericPrice) || numericPrice < 0) {
      toast({ title: "Validation Error", description: "Please enter valid numbers for quantity and price.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const entryData: Omit<SoldHistoryEntry, 'id'> = {
      orderId,
      productName,
      quantity: numericQuantity,
      totalPrice: numericPrice,
      saleDate: saleDate.toISOString(),
    };

    let result;
    if (isEditMode && entryToEdit) {
      // Note: Editing a sold history might need logic to revert stock changes, which can be complex.
      // For now, we just update the record.
      result = await updateSoldHistoryEntry(entryToEdit.id, entryData);
    } else {
      result = await addSoldHistoryEntry(entryData);
      if (result) {
        // Find the product and decrease its stock
        const product = stockItems.find(item => item.name === productName);
        if (product && product.stockCount !== undefined) {
          await updateModelStock(product.id, -numericQuantity);
        }
      }
    }
    
    setIsSubmitting(false);

    if (result) {
      toast({ title: "Success", description: `Sold entry has been ${isEditMode ? 'updated' : 'added'}.` });
      onSave();
    } else {
      toast({ title: "Error", description: "Could not save the sold entry.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Add'} Sold Entry</DialogTitle>
          <DialogDescription>Manually record a product sale.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="orderId">Job ID</Label>
              <Input id="orderId" value={orderId} onChange={e => setOrderId(e.target.value)} required />
            </div>
             <div className="space-y-1">
                <Label>Company Name</Label>
                <Input value={companyName} readOnly disabled placeholder="Auto-filled" className="bg-muted/50" />
             </div>
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="productName">Product</Label>
            <Popover open={isProductPopoverOpen} onOpenChange={setIsProductPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                  {productName || "Select product..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search product..." />
                  <CommandList>
                    <CommandEmpty>No product found.</CommandEmpty>
                    <CommandGroup>
                      {stockItems.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={item.name}
                          onSelect={() => {
                            setProductName(item.name);
                            setIsProductPopoverOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", productName === item.name ? "opacity-100" : "opacity-0")} />
                          {item.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} required min="1"/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="totalPrice">Total Price</Label>
              <Input id="totalPrice" type="number" value={totalPrice} required min="0" readOnly disabled className="bg-muted/50 cursor-not-allowed"/>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="saleDate">Sale Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !saleDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {saleDate ? format(saleDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={saleDate} onSelect={setSaleDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : (isEditMode ? 'Save Changes' : 'Add Entry')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default AddEditSoldEntryDialog;
