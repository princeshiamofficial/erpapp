
"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TrackingLink, User, ServicePaymentMethodItem, OrderItem, ServiceModelItem, ServiceLaminationItem } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { updateOrderAction } from '@/app/(app)/orders/actions';
import { getPaymentMethods, getModels, getLaminations } from '@/lib/service-options-service';
import { Loader2, PlusCircle, Trash2, ChevronsUpDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface EditOrderDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  order: TrackingLink;
  currentUser: User; // Not directly used for permissions here, but kept for consistency or future use
  onOrderUpdated: () => void;
}

interface DialogOrderItem {
  id: string; // Client-side ID for list management, or existing ID from order
  model: string;
  quantity: string;
  lamination: string;
  unitPrice: number | null;
  lineItemTotalPrice: number | null;
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT' }).format(value);
};


export function EditOrderDialog({ isOpen, onOpenChange, order, currentUser, onOrderUpdated }: EditOrderDialogProps) {
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [advancePayment, setAdvancePayment] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [showCustomPaymentInput, setShowCustomPaymentInput] = useState(false);
  const [customPaymentMethodText, setCustomPaymentMethodText] = useState('');

  const [orderItems, setOrderItems] = useState<DialogOrderItem[]>([]);

  const [paymentMethodOptions, setPaymentMethodOptions] = useState<ServicePaymentMethodItem[]>([]);
  const [modelOptions, setModelOptions] = useState<ServiceModelItem[]>([]);
  const [laminationOptions, setLaminationOptions] = useState<ServiceLaminationItem[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [popoverOpenStates, setPopoverOpenStates] = useState<Record<string, boolean>>({});


  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchDialogOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    try {
      const [fetchedPaymentMethods, fetchedModels, fetchedLaminations] = await Promise.all([
        getPaymentMethods(),
        getModels(),
        getLaminations()
      ]);
      setPaymentMethodOptions(fetchedPaymentMethods);
      setModelOptions(fetchedModels);
      setLaminationOptions(fetchedLaminations);
    } catch (error) {
      console.error("Failed to fetch dialog options:", error);
      toast({ title: "Error", description: "Could not load dialog options.", variant: "destructive" });
    } finally {
      setIsLoadingOptions(false);
    }
  }, [toast]);

  const resetForm = useCallback(() => {
    if (order) {
      setCompanyName(order.companyName);
      setAddress(order.address);
      setPhoneNumber(order.phoneNumber);
      setAdvancePayment(order.advancePayment?.toString() || '');

      const currentPM = order.paymentMethod || '';
      const isStandardOption = paymentMethodOptions.some(opt => opt.name === currentPM);
      const hasOtherOption = paymentMethodOptions.some(opt => opt.name.toLowerCase() === 'other');

      if (currentPM && !isStandardOption && hasOtherOption) {
        setPaymentMethod("Other");
        setShowCustomPaymentInput(true);
        setCustomPaymentMethodText(currentPM);
      } else {
        setPaymentMethod(currentPM);
        setShowCustomPaymentInput(currentPM.toLowerCase() === 'other' && hasOtherOption);
        setCustomPaymentMethodText( (currentPM.toLowerCase() === 'other' && isStandardOption) ? '' : (isStandardOption ? '' : currentPM) );
      }
      
      setOrderItems(order.orderItems.map(item => ({
        ...item,
        quantity: item.quantity.toString(), // Ensure quantity is string for input
      })));
    }
     setPopoverOpenStates({});
  }, [order, paymentMethodOptions]);


  useEffect(() => {
    if (isOpen) {
      fetchDialogOptions();
      // resetForm will be called within fetchDialogOptions's effect or if order changes
    }
  }, [isOpen, fetchDialogOptions]);
  
  useEffect(() => {
    if (isOpen && order && paymentMethodOptions.length > 0) { // Ensure options are loaded before resetting
      resetForm();
    }
  }, [isOpen, order, paymentMethodOptions, resetForm]);


  const calculateLineItemTotal = (unitPrice: number | null, quantityStr: string): number | null => {
    if (unitPrice === null) return null;
    const quantity = parseInt(quantityStr, 10);
    if (isNaN(quantity) || quantity < 1) return null;
    return unitPrice * quantity;
  };

  const handleItemChange = (itemId: string, field: keyof DialogOrderItem | 'modelName', value: string | number | null) => {
    setOrderItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          let updatedItem = { ...item };
          if (field === 'modelName') { // Special handling for model selection
            const selectedModel = modelOptions.find(opt => opt.name === value);
            updatedItem.model = selectedModel ? selectedModel.name : '';
            updatedItem.unitPrice = selectedModel?.price ?? null;
          } else if (field === 'quantity' || field === 'lamination') {
             updatedItem = { ...item, [field]: value as string };
          } else {
            // This case should not be hit for model, quantity, lamination
            // If other fields were directly editable, they'd go here.
          }

          // Recalculate line item total if model (unitPrice) or quantity changes
          if (field === 'modelName' || field === 'quantity') {
            updatedItem.lineItemTotalPrice = calculateLineItemTotal(updatedItem.unitPrice, updatedItem.quantity);
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleAddItem = () => {
    setOrderItems(prevItems => [
      ...prevItems,
      { 
        id: uuidv4(), 
        model: '', 
        quantity: '1', 
        lamination: '', 
        unitPrice: null, 
        lineItemTotalPrice: null 
      }
    ]);
  };

  const handleRemoveItem = (idToRemove: string) => {
    if (orderItems.length > 1) {
      setOrderItems(prevItems => prevItems.filter(item => item.id !== idToRemove));
    }
  };
  
  const togglePopover = (itemId: string, open?: boolean) => {
    setPopoverOpenStates(prev => ({ ...prev, [itemId]: open === undefined ? !prev[itemId] : open }));
  };


  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value);
    if (value.toLowerCase() === 'other') {
      setShowCustomPaymentInput(true);
      setCustomPaymentMethodText(''); 
    } else {
      setShowCustomPaymentInput(false);
      setCustomPaymentMethodText('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !address.trim() || !phoneNumber.trim()) {
      toast({ title: "Validation Error", description: "Company Name, Address, and Phone Number are required.", variant: "destructive" });
      return;
    }

    if (orderItems.some(item => !item.model || !item.quantity || parseInt(item.quantity, 10) < 1 || !item.lamination || item.unitPrice === null)) {
      toast({
        title: "Validation Error",
        description: "All order items must have Model, a valid Quantity (>=1), Lamination, and an associated Unit Price (via model selection).",
        variant: "destructive",
      });
      return;
    }


    let finalPaymentMethod = paymentMethod.trim() || null;
    if (paymentMethod.toLowerCase() === 'other') {
      if (!customPaymentMethodText.trim()) {
        toast({ title: "Validation Error", description: "Please specify the 'Other' payment method.", variant: "destructive" });
        return;
      }
      finalPaymentMethod = customPaymentMethodText.trim();
    }

    let parsedAdvancePayment: number | null = null;
    if (advancePayment.trim() !== '') {
      parsedAdvancePayment = parseFloat(advancePayment);
      if (isNaN(parsedAdvancePayment) || parsedAdvancePayment < 0) {
        toast({ title: "Validation Error", description: "Advance Payment must be a non-negative number.", variant: "destructive" });
        return;
      }
    }

    setIsSubmitting(true);

    const processedOrderItems: OrderItem[] = orderItems.map(item => {
      const quantity = parseInt(item.quantity, 10);
      // Validation for unitPrice being null should prevent this, but good to be safe
      const unitPrice = item.unitPrice ?? 0; 
      const lineItemTotalPrice = calculateLineItemTotal(unitPrice, item.quantity) ?? 0;

      return {
        id: item.id, 
        model: item.model,
        quantity: quantity,
        lamination: item.lamination,
        unitPrice: unitPrice,
        lineItemTotalPrice: lineItemTotalPrice,
      };
    });


    const updates: Partial<TrackingLink> = {
      companyName: companyName.trim(),
      address: address.trim(),
      phoneNumber: phoneNumber.trim(),
      advancePayment: parsedAdvancePayment,
      paymentMethod: finalPaymentMethod,
      orderItems: processedOrderItems, // Include updated order items
    };

    const result = await updateOrderAction(order.id, updates);
    setIsSubmitting(false);

    if (result.success && result.order) {
      toast({ title: "Order Updated", description: `Order ${result.order.id} has been updated.` });
      onOrderUpdated();
      onOpenChange(false);
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not update order.", variant: "destructive" });
    }
  };

  const canSubmit = !isSubmitting &&
    companyName.trim() && address.trim() && phoneNumber.trim() &&
    !isLoadingOptions &&
    orderItems.length > 0 &&
    orderItems.every(item =>
      item.model &&
      item.quantity &&
      parseInt(item.quantity, 10) > 0 &&
      item.lamination &&
      item.unitPrice !== null && // Unit price should be set by model selection
      item.lineItemTotalPrice !== null
    ) &&
    !(paymentMethod.toLowerCase() === 'other' && !customPaymentMethodText.trim());

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-3xl xl:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit Order: <span className="font-mono text-primary">{order?.id}</span></DialogTitle>
          <DialogDescription>Modify the details and items for this order.</DialogDescription>
        </DialogHeader>
        {isLoadingOptions ? (
            <div className="flex justify-center items-center h-60">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {/* Top Level Order Details */}
            <div className="space-y-1">
              <Label htmlFor="edit-companyName">Company Name *</Label>
              <Input id="edit-companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required disabled={isSubmitting} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-address">Address *</Label>
              <Textarea id="edit-address" value={address} onChange={(e) => setAddress(e.target.value)} required disabled={isSubmitting} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-phoneNumber">Phone Number *</Label>
              <Input id="edit-phoneNumber" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required disabled={isSubmitting} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div className="space-y-1">
                <Label htmlFor="edit-advancePayment">Advance Payment (BDT - Optional)</Label>
                <Input id="edit-advancePayment" type="number" value={advancePayment} onChange={(e) => setAdvancePayment(e.target.value)} placeholder="e.g., 500.00" min="0" step="0.01" disabled={isSubmitting} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-paymentMethod">Payment Method (Optional)</Label>
                <Select value={paymentMethod} onValueChange={handlePaymentMethodChange} disabled={isLoadingOptions || paymentMethodOptions.length === 0 || isSubmitting}>
                  <SelectTrigger id="edit-paymentMethod">
                    <SelectValue placeholder={isLoadingOptions ? "Loading..." : (paymentMethodOptions.length === 0 ? "No methods" : "Select payment method")} />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethodOptions.map(option => (
                      <SelectItem key={option.id} value={option.name}>{option.name}</SelectItem>
                    ))}
                    {paymentMethodOptions.length === 0 && <div className="p-2 text-sm text-muted-foreground text-center">No payment methods available.</div>}
                  </SelectContent>
                </Select>
                {showCustomPaymentInput && (
                  <div className="mt-2 space-y-1">
                    <Label htmlFor="edit-customPaymentMethodText">Specify Other Payment Method *</Label>
                    <Input
                      id="edit-customPaymentMethodText"
                      value={customPaymentMethodText}
                      onChange={(e) => setCustomPaymentMethodText(e.target.value)}
                      placeholder="e.g., Specific Wallet"
                      required={paymentMethod.toLowerCase() === 'other'}
                      disabled={isSubmitting}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Order Items Section */}
            <div className="space-y-3 mt-4 border-t border-border pt-4">
              <Label className="text-lg font-semibold">Order Items *</Label>
              {orderItems.map((item, index) => (
                <div key={item.id} className="p-3 border rounded-md bg-secondary/30 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_2fr_1.5fr_auto] gap-x-3 gap-y-2 items-end">
                    {/* Model (Combobox) */}
                    <div className="space-y-1">
                      <Label htmlFor={`model-${item.id}`}>Model *</Label>
                      <Popover open={popoverOpenStates[item.id] || false} onOpenChange={(open) => togglePopover(item.id, open)}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={popoverOpenStates[item.id] || false}
                            className="w-full justify-between bg-background"
                            disabled={isLoadingOptions || modelOptions.length === 0}
                          >
                            {item.model
                              ? modelOptions.find((option) => option.name === item.model)?.name
                              : (isLoadingOptions ? "Loading..." : (modelOptions.length === 0 ? "No models" : "Select model..."))}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Search model..." />
                            <CommandList>
                              <CommandEmpty>No model found.</CommandEmpty>
                              <CommandGroup>
                                {modelOptions.map((option) => (
                                  <CommandItem
                                    key={option.id}
                                    value={option.name}
                                    onSelect={(currentValue) => {
                                      handleItemChange(item.id, 'modelName', currentValue === item.model ? '' : currentValue);
                                      togglePopover(item.id, false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        item.model === option.name ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {option.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Quantity */}
                    <div className="space-y-1">
                      <Label htmlFor={`quantity-${item.id}`}>Quantity *</Label>
                      <Input id={`quantity-${item.id}`} type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} placeholder="e.g., 10" min="1" required className="bg-background" />
                    </div>

                    {/* Lamination */}
                    <div className="space-y-1">
                      <Label htmlFor={`lamination-${item.id}`}>Lamination *</Label>
                      <Select value={item.lamination} onValueChange={(value) => handleItemChange(item.id, 'lamination', value)} required disabled={isLoadingOptions || laminationOptions.length === 0}>
                        <SelectTrigger id={`lamination-${item.id}`} className="bg-background">
                          <SelectValue placeholder={isLoadingOptions ? "Loading..." : (laminationOptions.length === 0 ? "No laminations" : "Select lamination")} />
                        </SelectTrigger>
                        <SelectContent>
                          {laminationOptions.map(option => (
                            <SelectItem key={option.id} value={option.name}>{option.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Line Total (Read-only) */}
                    <div className="space-y-1">
                      <Label>Line Total</Label>
                      <Input value={formatCurrency(item.lineItemTotalPrice)} readOnly disabled className="bg-muted/50 text-foreground" />
                    </div>

                    {/* Remove Button */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={isSubmitting || orderItems.length <= 1}
                        className="h-10 w-10 text-destructive hover:bg-destructive/10 hover:text-destructive-foreground"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={handleAddItem} className="mt-2" disabled={isSubmitting || isLoadingOptions}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Another Item
              </Button>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
