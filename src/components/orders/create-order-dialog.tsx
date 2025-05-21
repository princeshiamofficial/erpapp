
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { User, CustomStatus, ServiceModelItem, ServiceLaminationItem } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { createOrderAction } from '@/app/(app)/orders/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getModels, getLaminations } from '@/lib/service-options-service';
import { Loader2, PlusCircle, Trash2, ChevronsUpDown, Check } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';

interface CreateOrderDialogProps {
  currentUser: User;
  availableStatuses: CustomStatus[];
  onOrderCreated: () => void;
  children: React.ReactNode;
}

interface DialogOrderItem {
  id: string;
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

const PAYMENT_METHODS = ["Cash", "Card", "Bank Transfer", "Mobile Banking", "Cheque", "Other"];

export function CreateOrderDialog({ currentUser, availableStatuses, onOrderCreated, children }: CreateOrderDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [initialStatusId, setInitialStatusId] = useState<string>('');
  const [advancePayment, setAdvancePayment] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  const initialOrderItemState: DialogOrderItem = {
    id: uuidv4(),
    model: '',
    quantity: '1',
    lamination: '',
    unitPrice: null,
    lineItemTotalPrice: null,
  };
  const [orderItems, setOrderItems] = useState<DialogOrderItem[]>([{ ...initialOrderItemState }]);

  const [modelOptions, setModelOptions] = useState<ServiceModelItem[]>([]);
  const [laminationOptions, setLaminationOptions] = useState<ServiceLaminationItem[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [popoverOpenStates, setPopoverOpenStates] = useState<Record<string, boolean>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const resetForm = useCallback(() => {
    setCompanyName('');
    setAddress('');
    setPhoneNumber('');
    setInitialStatusId('');
    setAdvancePayment('');
    setPaymentMethod('');
    setOrderItems([{ ...initialOrderItemState, id: uuidv4() }]);
    setPopoverOpenStates({});
  }, []);

  const fetchOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    try {
      const [fetchedModels, fetchedLaminations] = await Promise.all([
        getModels(),
        getLaminations()
      ]);
      setModelOptions(fetchedModels);
      setLaminationOptions(fetchedLaminations);
    } catch (error) {
      console.error("Failed to fetch model/lamination options:", error);
      toast({ title: "Error", description: "Could not load order options.", variant: "destructive" });
    } finally {
      setIsLoadingOptions(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      fetchOptions();
      const isCurrentStatusInAvailable = initialStatusId && availableStatuses.some(s => s.id === initialStatusId);
      if (!initialStatusId || !isCurrentStatusInAvailable) {
        const orderSubmittedStatus = availableStatuses.find(s => s.id === "order-submitted");
        if (orderSubmittedStatus) {
          setInitialStatusId(orderSubmittedStatus.id);
        } else if (availableStatuses.length > 0 && availableStatuses[0]) {
          setInitialStatusId(availableStatuses[0].id);
        } else {
          setInitialStatusId('');
        }
      }
    }
  }, [isOpen, availableStatuses, fetchOptions, initialStatusId]);


  const calculateLineItemTotal = (unitPrice: number | null, quantityStr: string): number | null => {
    if (unitPrice === null) return null;
    const quantity = parseInt(quantityStr, 10);
    if (isNaN(quantity) || quantity < 1) return null;
    return unitPrice * quantity;
  };

  const handleItemChange = (itemId: string, field: keyof DialogOrderItem, value: string | number | null) => {
    setOrderItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };

          if (field === 'model') {
            const selectedModel = modelOptions.find(opt => opt.name === value);
            updatedItem.unitPrice = selectedModel?.price ?? null;
            updatedItem.lineItemTotalPrice = calculateLineItemTotal(updatedItem.unitPrice, updatedItem.quantity);
          } else if (field === 'quantity') {
            updatedItem.lineItemTotalPrice = calculateLineItemTotal(updatedItem.unitPrice, String(value));
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleAddItem = () => {
    setOrderItems([...orderItems, { ...initialOrderItemState, id: uuidv4() }]);
  };

  const handleRemoveItem = (id: string) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter(item => item.id !== id));
    }
  };

  const togglePopover = (itemId: string, open?: boolean) => {
    setPopoverOpenStates(prev => ({ ...prev, [itemId]: open === undefined ? !prev[itemId] : open }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !address || !phoneNumber || !initialStatusId) {
      toast({
        title: "Validation Error",
        description: "Company Name, Address, Phone Number, and Initial Status are required.",
        variant: "destructive",
      });
      return;
    }

    if (orderItems.some(item => !item.model || !item.quantity || !item.lamination)) {
      toast({
        title: "Validation Error",
        description: "All order items must have Model, Quantity, and Lamination selected.",
        variant: "destructive",
      });
      return;
    }

    const parsedOrderItems: Array<Omit<DialogOrderItem, 'id'>> = [];
    for (const item of orderItems) {
      const quantity = parseInt(item.quantity, 10);
      if (isNaN(quantity) || quantity < 1) {
        toast({ title: "Validation Error", description: `Invalid quantity for model "${item.model}". Quantity must be a positive number.`, variant: "destructive" });
        return;
      }
      if (item.unitPrice === null || item.lineItemTotalPrice === null) {
        toast({ title: "Price Error", description: `Pricing information is missing for model "${item.model}". Ensure models have prices set.`, variant: "destructive" });
        return;
      }
      parsedOrderItems.push({
        model: item.model,
        quantity: item.quantity,
        lamination: item.lamination,
        unitPrice: item.unitPrice,
        lineItemTotalPrice: item.lineItemTotalPrice,
      });
    }

    let parsedAdvancePayment: number | null = null;
    if (advancePayment.trim() !== '') {
      parsedAdvancePayment = parseFloat(advancePayment);
      if (isNaN(parsedAdvancePayment) || parsedAdvancePayment < 0) {
        toast({ title: "Validation Error", description: "Advance Payment must be a non-negative number.", variant: "destructive" });
        return;
      }
    }


    if (availableStatuses.length === 0 && !initialStatusId) {
      toast({
        title: "Status Error",
        description: "No order statuses are available or selected. Cannot create order.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);

    const orderData = {
      companyName,
      address,
      phoneNumber,
      orderItems: parsedOrderItems.map(item => ({
        ...item,
        quantity: Number(item.quantity), // Ensure quantity is number for action
      })),
      advancePayment: parsedAdvancePayment,
      paymentMethod: paymentMethod.trim() || null,
      initialStatusId,
    };

    const result = await createOrderAction(orderData, currentUser);

    if ('error' in result) {
      toast({
        title: "Order Creation Failed",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Order Created",
        description: `Order ${result.id} for ${result.companyName} has been created.`,
      });
      onOrderCreated();
      setIsOpen(false);
      resetForm();
    }
    setIsSubmitting(false);
  };

  const canSubmit = !isSubmitting &&
    companyName && address && phoneNumber && initialStatusId &&
    (availableStatuses.length > 0 || !!initialStatusId) &&
    modelOptions.length > 0 &&
    laminationOptions.length > 0 &&
    !isLoadingOptions &&
    orderItems.length > 0 &&
    orderItems.every(item =>
      item.model &&
      item.quantity &&
      parseInt(item.quantity) > 0 &&
      item.lamination &&
      item.unitPrice !== null &&
      item.lineItemTotalPrice !== null
    );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-3xl xl:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>Enter company details and add order items. All fields are required.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-1">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input id="phoneNumber" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="space-y-1">
                <Label htmlFor="advancePayment">Advance Payment (BDT - Optional)</Label>
                <Input id="advancePayment" type="number" value={advancePayment} onChange={(e) => setAdvancePayment(e.target.value)} placeholder="e.g., 500.00" min="0" step="0.01" />
                </div>
                <div className="space-y-1">
                <Label htmlFor="paymentMethod">Payment Method (Optional)</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="paymentMethod">
                    <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                    {PAYMENT_METHODS.map(method => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                </div>
            </div>


            <div className="space-y-3 mt-4 border-t border-border pt-4">
              <Label className="text-lg font-semibold">Order Items</Label>
              {orderItems.map((item, index) => (
                <div key={item.id} className="p-3 border rounded-md bg-secondary/30 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_2fr_1.5fr_auto] gap-3 items-end">
                    <div className="space-y-1">
                      <Label htmlFor={`model-${item.id}`}>Model</Label>
                      <Popover open={popoverOpenStates[item.id] || false} onOpenChange={(open) => togglePopover(item.id, open)}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={popoverOpenStates[item.id] || false}
                            className="w-full justify-between"
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
                                      handleItemChange(item.id, 'model', currentValue === item.model ? '' : currentValue);
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
                    <div className="space-y-1">
                      <Label htmlFor={`quantity-${item.id}`}>Quantity</Label>
                      <Input id={`quantity-${item.id}`} type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} placeholder="e.g., 100" min="1" required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`lamination-${item.id}`}>Lamination</Label>
                      <Select value={item.lamination} onValueChange={(value) => handleItemChange(item.id, 'lamination', value)} required disabled={isLoadingOptions || laminationOptions.length === 0}>
                        <SelectTrigger id={`lamination-${item.id}`}>
                          <SelectValue placeholder={isLoadingOptions ? "Loading..." : (laminationOptions.length === 0 ? "No laminations" : "Select lamination")} />
                        </SelectTrigger>
                        <SelectContent>
                          {laminationOptions.map(option => (
                            <SelectItem key={option.id} value={option.name}>{option.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Line Total</Label>
                      <Input value={formatCurrency(item.lineItemTotalPrice)} readOnly disabled className="bg-muted/50" />
                    </div>

                    {orderItems.length > 1 && (
                       <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={isSubmitting}
                        className="h-10 w-10 text-destructive hover:bg-destructive/10 hover:text-destructive-foreground"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {(isLoadingOptions && (orderItems.length === 0 || (modelOptions.length === 0 || laminationOptions.length === 0))) &&
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading model & lamination options...
                </div>
              }
              <Button type="button" variant="outline" onClick={handleAddItem} className="mt-2" disabled={isSubmitting || isLoadingOptions}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Another Item
              </Button>
            </div>

            <div className="space-y-1 mt-4 border-t border-border pt-4">
              <Label htmlFor="initialStatus">Initial Status</Label>
              <Select value={initialStatusId} onValueChange={setInitialStatusId} required>
                <SelectTrigger id="initialStatus" disabled={availableStatuses.length === 0}>
                  <SelectValue placeholder={availableStatuses.length === 0 ? "Loading statuses..." : "Select initial status"} />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuses.map(status => (
                    <SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableStatuses.length === 0 && !isSubmitting && !isLoadingOptions && <p className="text-xs text-muted-foreground mt-1">Statuses are loading or unavailable. Please wait or check admin settings.</p>}
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => { setIsOpen(false); }} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
