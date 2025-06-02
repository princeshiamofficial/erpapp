
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  currentUser: User;
  onOrderUpdated: () => void;
}

interface DialogOrderItem {
  id: string;
  model: string; // Model name
  quantity: string;
  lamination: string;
  unitPrice: number | null; // Will be model's sellingPrice
  lineItemTotalPrice: number | null;
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'BDT' }).format(value);
};


export function EditOrderDialog({ isOpen, onOpenChange, order, currentUser, onOrderUpdated }: EditOrderDialogProps) {
  const [companyIdInput, setCompanyIdInput] = useState('');
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [advancePayment, setAdvancePayment] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [showCustomPaymentInput, setShowCustomPaymentInput] = useState(false);
  const [customPaymentMethodText, setCustomPaymentMethodText] = useState('');

  const [orderItems, setOrderItems] = useState<DialogOrderItem[]>([]);
  const [totalOrderPrice, setTotalOrderPrice] = useState<number>(0);


  const [paymentMethodOptions, setPaymentMethodOptions] = useState<ServicePaymentMethodItem[]>([]);
  const [modelOptions, setModelOptions] = useState<ServiceModelItem[]>([]);
  const [laminationOptions, setLaminationOptions] = useState<ServiceLaminationItem[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [popoverOpenStates, setPopoverOpenStates] = useState<Record<string, boolean>>({});
  const [isPaymentMethodPopoverOpen, setIsPaymentMethodPopoverOpen] = useState(false);


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
      const parts = order.companyName.split(' • ');
      if (parts.length >= 2) {
        setCompanyIdInput(parts[0].trim());
        setCompanyNameInput(parts.slice(1).join(' • ').trim());
      } else {
        setCompanyIdInput('');
        setCompanyNameInput(order.companyName.trim());
      }
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
      } else if (currentPM.toLowerCase() === 'other' && isStandardOption) {
        setPaymentMethod(currentPM);
        setShowCustomPaymentInput(true);
        setCustomPaymentMethodText(''); 
      } else {
        setPaymentMethod(currentPM);
        setShowCustomPaymentInput(false);
        setCustomPaymentMethodText('');
      }

      setOrderItems(order.orderItems.map(item => ({
        ...item,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice,
        lineItemTotalPrice: item.lineItemTotalPrice,
      })));
    }
     setPopoverOpenStates({});
     setIsPaymentMethodPopoverOpen(false);
     setIsSubmitting(false);
  }, [order, paymentMethodOptions]);


  useEffect(() => {
    if (isOpen) {
      fetchDialogOptions();
    }
  }, [isOpen, fetchDialogOptions]);

  useEffect(() => {
    if (isOpen && order && (paymentMethodOptions.length > 0 || modelOptions.length > 0 || laminationOptions.length > 0 || !isLoadingOptions)) {
      resetForm();
    }
  }, [isOpen, order, paymentMethodOptions, modelOptions, laminationOptions, resetForm, isLoadingOptions]);

  useEffect(() => {
    const currentTotal = orderItems.reduce((sum, item) => sum + (item.lineItemTotalPrice || 0), 0);
    setTotalOrderPrice(currentTotal);
  }, [orderItems]);


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
          if (field === 'modelName') { // value is model name
            const selectedModel = modelOptions.find(opt => opt.name === value);
            updatedItem.model = selectedModel ? selectedModel.name : '';
            updatedItem.unitPrice = selectedModel?.sellingPrice ?? null; // Use sellingPrice
          } else if (field === 'quantity' || field === 'lamination') {
             updatedItem = { ...item, [field]: value as string };
          }

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
      if (order.paymentMethod?.toLowerCase() !== 'other' || value !== order.paymentMethod ) {
        setCustomPaymentMethodText(''); 
      }
    } else {
      setShowCustomPaymentInput(false);
      setCustomPaymentMethodText('');
    }
  };

  const advancePaymentValue = parseFloat(advancePayment);
  const isAdvancePaymentEntered = !isNaN(advancePaymentValue) && advancePaymentValue > 0;

  useEffect(() => {
    if (!isAdvancePaymentEntered) {
        setPaymentMethod('');
        setCustomPaymentMethodText('');
        setShowCustomPaymentInput(false);
    }
  }, [isAdvancePaymentEntered]);

  const handleAdvancePaymentChangeEdit = (value: string) => {
    setAdvancePayment(value);
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && numericValue > totalOrderPrice && totalOrderPrice > 0) {
      toast({
        title: "Validation Error",
        description: `Advance payment cannot exceed total order price of ${formatCurrency(totalOrderPrice)}.`,
        variant: "destructive",
      });
    }
  };

  const canSubmit = useMemo(() => {
    if (!currentUser || !currentUser.role) return false;
    const parsedAdvPayment = parseFloat(advancePayment);
    const isAdvPaymentValid = isNaN(parsedAdvPayment) || parsedAdvPayment <= totalOrderPrice || totalOrderPrice === 0;

    return !isSubmitting &&
      companyIdInput.trim() && // Check companyIdInput
      companyNameInput.trim() && address.trim() && phoneNumber.trim() &&
      !isLoadingOptions &&
      orderItems.length > 0 &&
      orderItems.every(item =>
        item.model &&
        item.quantity &&
        parseInt(item.quantity) > 0 &&
        item.lamination &&
        item.unitPrice !== null &&
        item.lineItemTotalPrice !== null
      ) &&
      !(isAdvancePaymentEntered && !paymentMethod.trim()) &&
      !(isAdvancePaymentEntered && paymentMethod.toLowerCase() === 'other' && !customPaymentMethodText.trim()) &&
      isAdvPaymentValid;
  }, [isSubmitting, companyIdInput, companyNameInput, address, phoneNumber, isLoadingOptions, orderItems, isAdvancePaymentEntered, paymentMethod, customPaymentMethodText, currentUser, advancePayment, totalOrderPrice]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser || !currentUser.role) {
        console.error("EditOrderDialog/handleSubmit: currentUser prop is invalid. Aborting.");
        toast({ title: "Authentication Error", description: "Cannot save changes. Your session may be invalid. Please log in again.", variant: "destructive" });
        return;
    }

    if (!companyIdInput.trim() || !companyNameInput.trim() || !address.trim() || !phoneNumber.trim()) {
      toast({ title: "Validation Error", description: "Company ID, Company Name, Address, and Phone Number are required.", variant: "destructive" });
      return;
    }

    let parsedAdvancePayment: number | null = null;
    if (advancePayment.trim() !== '') {
      parsedAdvancePayment = parseFloat(advancePayment);
      if (isNaN(parsedAdvancePayment) || parsedAdvancePayment < 0) {
        toast({ title: "Validation Error", description: "Advance Payment must be a non-negative number.", variant: "destructive" });
        return;
      }
      if (parsedAdvancePayment > totalOrderPrice && totalOrderPrice > 0) {
         toast({
          title: "Validation Error",
          description: `Advance payment (${formatCurrency(parsedAdvancePayment)}) cannot exceed total order price of ${formatCurrency(totalOrderPrice)}.`,
          variant: "destructive",
        });
        return;
      }
    }
    
    const currentIsAdvancePaymentEntered = parsedAdvancePayment !== null && parsedAdvancePayment > 0;
    let finalPaymentMethod = paymentMethod.trim() || null;

    if (currentIsAdvancePaymentEntered) {
        if (!paymentMethod.trim()) {
            toast({ title: "Validation Error", description: "Payment Method is required when Advance Payment is entered.", variant: "destructive" });
            return;
        }
        if (paymentMethod.toLowerCase() === 'other') {
          if (!customPaymentMethodText.trim()) {
            toast({ title: "Validation Error", description: "Please specify the 'Other' payment method.", variant: "destructive" });
            return;
          }
          finalPaymentMethod = customPaymentMethodText.trim();
        }
    } else {
        finalPaymentMethod = null; 
    }
    
    for (const item of orderItems) {
      if (!item.model || !item.quantity || !item.lamination) {
        toast({ title: "Validation Error", description: "All order items must have Model, Quantity, and Lamination selected.", variant: "destructive" });
        return;
      }
      const quantityNum = parseInt(item.quantity, 10);
      if (isNaN(quantityNum) || quantityNum < 1) {
        toast({ title: "Validation Error", description: `Invalid quantity "${item.quantity}" for model "${item.model}". Quantity must be a positive number.`, variant: "destructive"});
        return;
      }
      if (item.unitPrice === null || item.lineItemTotalPrice === null) {
        toast({ title: "Price Error", description: `Pricing information is missing for model "${item.model}". Ensure model is selected and has a price.`, variant: "destructive" });
        return;
      }
    }


    setIsSubmitting(true);

    const processedOrderItems: OrderItem[] = orderItems.map(item => ({
      id: item.id,
      model: item.model,
      quantity: parseInt(item.quantity, 10),
      lamination: item.lamination,
      unitPrice: item.unitPrice!, 
      lineItemTotalPrice: item.lineItemTotalPrice!,
    }));

    const finalCompanyName = `${companyIdInput.trim()} • ${companyNameInput.trim()}`;

    const updates: Partial<TrackingLink> = {
      companyName: finalCompanyName,
      address: address.trim(),
      phoneNumber: phoneNumber.trim(),
      advancePayment: parsedAdvancePayment,
      paymentMethod: finalPaymentMethod,
      orderItems: processedOrderItems,
    };

    const result = await updateOrderAction(order.id, updates, currentUser);
    setIsSubmitting(false);

    if (result.success && result.order) {
      onOrderUpdated();
      onOpenChange(false);
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not update order.", variant: "destructive" });
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-3xl xl:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit Order: <span className="font-normal">{order?.companyName}</span></DialogTitle>
          <DialogDescription>Modify the details and items for this order (Internal ID: <span className="font-mono">{order?.id}</span>).</DialogDescription>
        </DialogHeader>
        {isLoadingOptions ? (
          <div className="flex justify-center items-center h-60">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-companyId">Company ID *</Label>
                  <Input id="edit-companyId" value={companyIdInput} onChange={(e) => setCompanyIdInput(e.target.value)} required placeholder="e.g., CUST101" disabled={isSubmitting} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-companyNamePart">Company Name *</Label>
                  <Input id="edit-companyNamePart" value={companyNameInput} onChange={(e) => setCompanyNameInput(e.target.value)} required placeholder="e.g., Acme Corp" disabled={isSubmitting} />
                </div>
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
                  <Input id="edit-advancePayment" type="number" value={advancePayment} 
                    onChange={(e) => handleAdvancePaymentChangeEdit(e.target.value)}
                    placeholder="e.g., 500.00" min="0" step="0.01" disabled={isSubmitting} />
                </div>
                {isAdvancePaymentEntered && (
                <div className="space-y-1">
                   <Label htmlFor="edit-paymentMethod">
                      Payment Method
                      <span className="text-destructive"> *</span>
                  </Label>
                  <Popover open={isPaymentMethodPopoverOpen} onOpenChange={setIsPaymentMethodPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isPaymentMethodPopoverOpen}
                        className="w-full justify-between bg-background"
                        disabled={isLoadingOptions || paymentMethodOptions.length === 0 || isSubmitting}
                      >
                         <span className="flex-1 text-left whitespace-nowrap">
                          {paymentMethod
                            ? paymentMethodOptions.find((option) => option.name === paymentMethod)?.name || paymentMethod 
                            : (isLoadingOptions ? "Loading..." : (paymentMethodOptions.length === 0 ? "No methods" : "Select method..."))}
                         </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="min-w-[var(--radix-popover-trigger-width)] w-max max-w-md p-0">
                      <Command>
                        <CommandInput placeholder="Search method..." />
                        <CommandList>
                          <CommandEmpty>No payment method found.</CommandEmpty>
                          <CommandGroup>
                            {paymentMethodOptions.map((option) => (
                              <CommandItem
                                key={option.id}
                                value={option.name}
                                onSelect={(currentValue) => {
                                  handlePaymentMethodChange(paymentMethodOptions.find(o => o.name.toLowerCase() === currentValue.toLowerCase())?.name || currentValue);
                                  setIsPaymentMethodPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    paymentMethod === option.name ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                 <span className="whitespace-nowrap">{option.name}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {showCustomPaymentInput && (
                    <div className="mt-2 space-y-1">
                       <Label htmlFor="edit-customPaymentMethodText">
                        Specify Other Payment Method
                        <span className="text-destructive"> *</span>
                      </Label>
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
                )}
              </div>

              <div className="space-y-3 mt-4 border-t border-border pt-4">
                <Label className="text-lg font-semibold">Order Items *</Label>
                {orderItems.map((item) => (
                  <div key={item.id} className="p-3 border rounded-md bg-secondary/30 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1.5fr_1fr_auto] gap-x-3 gap-y-2 items-end">
                      <div className="space-y-1">
                        <Label htmlFor={`model-${item.id}`}>Model *</Label>
                        <Popover open={popoverOpenStates[item.id] || false} onOpenChange={(open) => togglePopover(item.id, open)}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={popoverOpenStates[item.id] || false}
                              className="w-full justify-between bg-background whitespace-nowrap"
                              disabled={isLoadingOptions || modelOptions.length === 0 || isSubmitting}
                            >
                              <span className="flex-1 text-left whitespace-nowrap">
                                {item.model
                                  ? modelOptions.find((option) => option.name === item.model)?.name
                                  : (isLoadingOptions ? "Loading..." : (modelOptions.length === 0 ? "No models" : "Select model..."))}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="min-w-[var(--radix-popover-trigger-width)] w-max max-w-lg p-0">
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
                                      className="whitespace-nowrap"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          item.model === option.name ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {option.name}
                                      {option.sellingPrice !== undefined && <span className="ml-auto text-xs text-muted-foreground">({formatCurrency(option.sellingPrice)})</span>}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`quantity-${item.id}`}>Quantity *</Label>
                        <Input id={`quantity-${item.id}`} type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} placeholder="e.g., 10" min="1" required className="bg-background" disabled={isSubmitting} />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`lamination-${item.id}`}>Lamination *</Label>
                        <Select value={item.lamination} onValueChange={(value) => handleItemChange(item.id, 'lamination', value)} required disabled={isLoadingOptions || laminationOptions.length === 0 || isSubmitting}>
                          <SelectTrigger id={`lamination-${item.id}`} className="bg-background">
                            <SelectValue placeholder={isLoadingOptions ? "Loading..." : (laminationOptions.length === 0 ? "No laminations" : "Select lamination")} />
                          </SelectTrigger>
                          <SelectContent>
                            {laminationOptions.map(option => (
                              <SelectItem key={option.id} value={option.name}>{option.name}</SelectItem>
                            ))}
                             {laminationOptions.length === 0 && !isLoadingOptions && <div className="p-2 text-sm text-muted-foreground text-center">No laminations configured.</div>}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label>Total Price</Label>
                        <Input value={formatCurrency(item.lineItemTotalPrice)} readOnly disabled className="bg-muted/50 text-foreground" />
                      </div>

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
