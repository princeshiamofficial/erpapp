
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { User, CustomStatus, ServiceModelItem, ServiceLaminationItem, OrderItem, ServicePaymentMethodItem } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { createOrderAction } from '@/app/(app)/orders/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getModels, getLaminations, getPaymentMethods } from '@/lib/service-options-service';
import { Loader2, PlusCircle, Trash2, ChevronsUpDown, Check, Info, Percent } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface CreateOrderDialogProps {
  currentUser: User;
  availableStatuses: CustomStatus[];
  onOrderCreated: () => void;
  children: React.ReactNode;
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

const initialOrderItemState: DialogOrderItem = {
  id: uuidv4(),
  model: '',
  quantity: '1',
  lamination: '',
  unitPrice: null,
  lineItemTotalPrice: null,
};

export function CreateOrderDialog({ currentUser, availableStatuses, onOrderCreated, children }: CreateOrderDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [jobId, setJobId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [initialStatusId, setInitialStatusId] = useState<string>('');
  const [advancePayment, setAdvancePayment] = useState<string>('');
  const [specialClientDiscount, setSpecialClientDiscount] = useState<string>(''); // Input as string
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [showCustomPaymentInput, setShowCustomPaymentInput] = useState(false);
  const [customPaymentMethodText, setCustomPaymentMethodText] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [orderItems, setOrderItems] = useState<DialogOrderItem[]>([{ ...initialOrderItemState, id: uuidv4() }]);
  const [orderItemsTotal, setOrderItemsTotal] = useState<number>(0);
  const [calculatedDiscountAmount, setCalculatedDiscountAmount] = useState<number>(0);
  const [netPayable, setNetPayable] = useState<number>(0);
  const [amountDue, setAmountDue] = useState<number>(0);


  const [modelOptions, setModelOptions] = useState<ServiceModelItem[]>([]);
  const [laminationOptions, setLaminationOptions] = useState<ServiceLaminationItem[]>([]);
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<ServicePaymentMethodItem[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [popoverOpenStates, setPopoverOpenStates] = useState<Record<string, boolean>>({});
  const [isPaymentMethodPopoverOpen, setIsPaymentMethodPopoverOpen] = useState(false);

  const { toast } = useToast();

  const resetForm = useCallback(() => {
    setJobId('');
    setCompanyName('');
    setAddress('');
    setPhoneNumber('');
    setInitialStatusId('');
    setAdvancePayment('');
    setSpecialClientDiscount('');
    setPaymentMethod('');
    setShowCustomPaymentInput(false);
    setCustomPaymentMethodText('');
    setOrderNotes('');
    setOrderItems([{ ...initialOrderItemState, id: uuidv4() }]);
    setPopoverOpenStates({});
    setIsPaymentMethodPopoverOpen(false);
    setOrderItemsTotal(0);
    setCalculatedDiscountAmount(0);
    setNetPayable(0);
    setAmountDue(0);
    setIsSubmitting(false);
  }, []);

  const fetchOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    try {
      const [fetchedModels, fetchedLaminations, fetchedPaymentMethods] = await Promise.all([
        getModels(),
        getLaminations(),
        getPaymentMethods(),
      ]);
      setModelOptions(fetchedModels);
      setLaminationOptions(fetchedLaminations);
      setPaymentMethodOptions(fetchedPaymentMethods);
    } catch (error) {
      console.error("Failed to fetch order options:", error);
      toast({ title: "Error", description: "Could not load order options.", variant: "destructive" });
    } finally {
      setIsLoadingOptions(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      fetchOptions();
    }
  }, [isOpen, fetchOptions]);

  useEffect(() => {
    if (isOpen && availableStatuses.length > 0) {
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
    } else if (isOpen && availableStatuses.length === 0) {
        setInitialStatusId('');
    }
  }, [isOpen, availableStatuses, initialStatusId]);

  // Effect to calculate totals when orderItems or discount changes
  useEffect(() => {
    const currentItemsTotal = orderItems.reduce((sum, item) => sum + (item.lineItemTotalPrice || 0), 0);
    setOrderItemsTotal(currentItemsTotal);

    let discountNum = 0;
    const discountStr = specialClientDiscount.trim();
    if (discountStr.endsWith('%')) {
        const percentage = parseFloat(discountStr.substring(0, discountStr.length - 1));
        if (!isNaN(percentage) && percentage >= 0) {
            discountNum = (percentage / 100) * currentItemsTotal;
        }
    } else {
        const fixedAmount = parseFloat(discountStr);
        if (!isNaN(fixedAmount) && fixedAmount >= 0) {
            discountNum = fixedAmount;
        }
    }
    // Ensure discount does not exceed total
    discountNum = Math.min(discountNum, currentItemsTotal);
    setCalculatedDiscountAmount(discountNum);

    const currentNetPayable = Math.max(0, currentItemsTotal - discountNum);
    setNetPayable(currentNetPayable);

    const advanceNum = parseFloat(advancePayment) || 0;
    setAmountDue(Math.max(0, currentNetPayable - advanceNum));
  }, [orderItems, specialClientDiscount, advancePayment]);


  const advancePaymentValue = parseFloat(advancePayment);
  const isAdvancePaymentEntered = !isNaN(advancePaymentValue) && advancePaymentValue > 0;

  useEffect(() => {
    if (!isAdvancePaymentEntered) {
        setPaymentMethod('');
        setCustomPaymentMethodText('');
        setShowCustomPaymentInput(false);
    }
  }, [isAdvancePaymentEntered]);

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
          if (field === 'modelName') { // value is the model's name
            const selectedModel = modelOptions.find(opt => opt.name === value);
            updatedItem.model = selectedModel ? selectedModel.name : '';
            updatedItem.unitPrice = selectedModel?.sellingPrice ?? null; // Use sellingPrice for unitPrice
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

  const handleAdvancePaymentChange = (value: string) => {
    setAdvancePayment(value);
    const numericValue = parseFloat(value);
    // Validation against netPayable happens in canSubmit and server-side
    if (!isNaN(numericValue) && numericValue > netPayable && netPayable > 0) {
      toast({
        title: "Validation Warning",
        description: `Advance payment cannot exceed net payable amount of ${formatCurrency(netPayable)}.`,
        variant: "destructive",
      });
    }
  };

  const handleDiscountChange = (value: string) => {
    setSpecialClientDiscount(value); // Store the raw string
    // Validation and calculation is handled in the useEffect
    let discountVal = 0;
    const discountStr = value.trim();
    if (discountStr.endsWith('%')) {
        const percentage = parseFloat(discountStr.substring(0, discountStr.length - 1));
        if (!isNaN(percentage) && percentage >= 0) {
            discountVal = (percentage / 100) * orderItemsTotal;
        }
    } else {
        const fixedAmount = parseFloat(discountStr);
        if (!isNaN(fixedAmount) && fixedAmount >= 0) {
            discountVal = fixedAmount;
        }
    }

    if (discountVal > orderItemsTotal && orderItemsTotal > 0) {
        toast({
            title: "Validation Warning",
            description: `Discount cannot exceed total items price of ${formatCurrency(orderItemsTotal)}.`,
            variant: "destructive"
        });
    }
  };


  const canSubmit = useMemo(() => {
    const parsedAdvPayment = parseFloat(advancePayment) || 0;
    const isAdvPaymentValid = parsedAdvPayment <= netPayable || netPayable === 0; // Check against calculated netPayable
    const isDiscountValid = calculatedDiscountAmount <= orderItemsTotal || orderItemsTotal === 0; // Check against calculatedDiscountAmount

    return !isSubmitting &&
      jobId.trim() &&
      companyName.trim() && address.trim() && phoneNumber.trim() && initialStatusId &&
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
      ) &&
      !(isAdvancePaymentEntered && !paymentMethod.trim()) &&
      !(isAdvancePaymentEntered && paymentMethod.toLowerCase() === 'other' && !customPaymentMethodText.trim()) &&
      isAdvPaymentValid && isDiscountValid;
  }, [isSubmitting, jobId, companyName, address, phoneNumber, initialStatusId, availableStatuses, modelOptions, laminationOptions, isLoadingOptions, orderItems, isAdvancePaymentEntered, paymentMethod, customPaymentMethodText, advancePayment, netPayable, calculatedDiscountAmount, orderItemsTotal]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Basic field validation (already covered by canSubmit mostly)
    if (!jobId.trim() || !companyName.trim() || !address.trim() || !phoneNumber.trim() || !initialStatusId) {
      toast({ title: "Validation Error", description: "Job ID, Company Name, Address, Phone Number, and Initial Status are required.", variant: "destructive" });
      setIsSubmitting(false); return;
    }
    if (orderItems.length === 0 || orderItems.some(item => !item.model || !item.lamination || parseInt(item.quantity) < 1 || item.unitPrice === null || item.lineItemTotalPrice === null)) {
       toast({ title: "Validation Error", description: "All order items must be complete with Model, Quantity, Lamination, and valid pricing.", variant: "destructive" });
       setIsSubmitting(false); return;
    }

    // Advance Payment and Payment Method validation
    const currentIsAdvancePaymentEnteredLogic = (parseFloat(advancePayment) || 0) > 0;
    let finalPaymentMethod = paymentMethod.trim() || null;
    if (currentIsAdvancePaymentEnteredLogic) {
        if (!paymentMethod.trim()) {
            toast({ title: "Validation Error", description: "Payment Method is required when Advance Payment is entered.", variant: "destructive" });
            setIsSubmitting(false); return;
        }
        if (paymentMethod.toLowerCase() === 'other') {
          if (!customPaymentMethodText.trim()) {
            toast({ title: "Validation Error", description: "Please specify the 'Other' payment method.", variant: "destructive" });
            setIsSubmitting(false); return;
          }
          finalPaymentMethod = customPaymentMethodText.trim();
        }
    } else {
        finalPaymentMethod = null;
    }

    const parsedAdvPayment = parseFloat(advancePayment) || 0;
    if (parsedAdvPayment > netPayable && netPayable > 0) { // Check against final netPayable from state
        toast({ title: "Validation Error", description: `Advance payment (${formatCurrency(parsedAdvPayment)}) cannot exceed net payable amount of ${formatCurrency(netPayable)}.`, variant: "destructive"});
        setIsSubmitting(false); return;
    }
    if (calculatedDiscountAmount > orderItemsTotal && orderItemsTotal > 0) { // Check against final calculatedDiscountAmount from state
         toast({ title: "Validation Error", description: `Discount (${formatCurrency(calculatedDiscountAmount)}) cannot exceed total items price of ${formatCurrency(orderItemsTotal)}.`, variant: "destructive"});
        setIsSubmitting(false); return;
    }


    const parsedOrderItems: OrderItem[] = orderItems.map(item => ({
        id: item.id,
        model: item.model,
        quantity: parseInt(item.quantity, 10),
        lamination: item.lamination,
        unitPrice: item.unitPrice!,
        lineItemTotalPrice: item.lineItemTotalPrice!,
    }));

    const combinedCompanyName = `${jobId.trim()} • ${companyName.trim()}`;

    const orderDataForAction = {
      jobId: jobId.trim(),
      companyName: combinedCompanyName,
      address: address.trim(),
      phoneNumber: phoneNumber.trim(),
      orderItems: parsedOrderItems,
      advancePayment: parsedAdvPayment > 0 ? parsedAdvPayment : null, // Send null if 0 or NaN
      specialClientDiscount: specialClientDiscount, // Send the string for server-side parsing
      paymentMethod: finalPaymentMethod,
      orderNotes: orderNotes.trim() || null,
      initialStatusId,
    };

    const result = await createOrderAction(orderDataForAction, currentUser);
    setIsSubmitting(false);

    if ('error' in result) {
      toast({ title: "Order Creation Failed", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Order Created", description: `Order ${result.id} for ${result.companyName} has been created.` });
      onOrderCreated();
      setIsOpen(false);
      resetForm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-3xl xl:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>Enter company details and add order items. Required fields are marked with *.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="jobId">Job ID *</Label>
                <Input id="jobId" value={jobId} onChange={(e) => setJobId(e.target.value)} required placeholder="e.g., CUST101, J123" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required placeholder="e.g., Acme Corp" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="address">Address *</Label>
              <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input id="phoneNumber" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="orderNotes">Order Notes (Optional)</Label>
              <Textarea
                id="orderNotes"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Add any specific instructions or notes for this order..."
                rows={3}
              />
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
                            className="w-full justify-between bg-background"
                            disabled={isLoadingOptions || modelOptions.length === 0}
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
                      <Input id={`quantity-${item.id}`} type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} placeholder="e.g., 100" min="1" required className="bg-background" />
                    </div>
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
                      disabled={isSubmitting || orderItems.length <=1}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive-foreground h-10 w-10"
                      title="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {(isLoadingOptions && (orderItems.length === 0 || (modelOptions.length === 0 || laminationOptions.length === 0 || paymentMethodOptions.length === 0))) &&
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading order options...
                </div>
              }
              <Button type="button" variant="outline" onClick={handleAddItem} className="mt-2" disabled={isSubmitting || isLoadingOptions}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Another Item
              </Button>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
              <div className="space-y-1">
                <Label htmlFor="specialClientDiscount">Special Client Discount</Label>
                <div className="relative">
                   <Input
                    id="specialClientDiscount"
                    type="text" 
                    value={specialClientDiscount}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                    placeholder="e.g., 100 or 10%"
                    className="pl-7"
                  />
                  <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="advancePayment">Advance Payment (BDT - Optional)</Label>
                <Input
                  id="advancePayment"
                  type="number"
                  value={advancePayment}
                  onChange={(e) => handleAdvancePaymentChange(e.target.value)}
                  placeholder="e.g., 500.00"
                  min="0"
                  step="0.01"
                />
              </div>
              {isAdvancePaymentEntered && (
                <div className="space-y-1">
                  <Label htmlFor="paymentMethod">
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
                        disabled={isLoadingOptions || paymentMethodOptions.length === 0}
                      >
                         <span className="flex-1 text-left whitespace-nowrap">
                          {paymentMethod
                            ? paymentMethodOptions.find((option) => option.name === paymentMethod)?.name
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
                      <Label htmlFor="customPaymentMethodText">
                        Specify Other Payment Method
                        <span className="text-destructive"> *</span>
                      </Label>
                      <Input
                        id="customPaymentMethodText"
                        value={customPaymentMethodText}
                        onChange={(e) => setCustomPaymentMethodText(e.target.value)}
                        placeholder="e.g., Specific Mobile Wallet"
                        required={paymentMethod.toLowerCase() === 'other'}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 p-4 border rounded-md bg-muted/30 space-y-2">
                <h4 className="text-md font-semibold text-foreground mb-2">Order Summary</h4>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Order Items Total:</span>
                    <span className="font-medium text-foreground">{formatCurrency(orderItemsTotal)}</span>
                </div>
                {(calculatedDiscountAmount || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Special Discount:</span>
                        <span className="font-medium text-red-600">- {formatCurrency(calculatedDiscountAmount)}</span>
                    </div>
                )}
                <div className="flex justify-between text-sm font-semibold">
                    <span className="text-foreground">Net Payable:</span>
                    <span className="text-foreground">{formatCurrency(netPayable)}</span>
                </div>
                {isAdvancePaymentEntered && (
                    <div className="flex justify-between text-sm mt-1 pt-1 border-t border-dashed border-border">
                        <span className="text-muted-foreground">Advance Paid:</span>
                        <span className="font-medium text-green-600">- {formatCurrency(parseFloat(advancePayment))}</span>
                    </div>
                )}
                 <div className="flex justify-between text-lg font-bold mt-1 pt-1 border-t border-border">
                    <span className="text-primary">Amount Due:</span>
                    <span className="text-primary">{formatCurrency(amountDue)}</span>
                </div>
            </div>


            <div className="space-y-1 mt-4 border-t border-border pt-4">
              <Label htmlFor="initialStatus">Initial Status *</Label>
              <Select value={initialStatusId} onValueChange={setInitialStatusId} required disabled={availableStatuses.length === 0}>
                <SelectTrigger id="initialStatus">
                  <SelectValue placeholder={availableStatuses.length === 0 ? "No statuses available" : "Select initial status"} />
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
