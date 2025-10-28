
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { User, CustomStatus, ServiceModelItem, ServiceLaminationItem, OrderItem, ServicePaymentMethodItem, AdvancePaymentRecord, TrackingLink } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { createOrderAction } from '@/app/(app)/orders/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getModels, getLaminations, getPaymentMethods } from '@/lib/service-options-service';
import { Loader2, PlusCircle, Trash2, ChevronsUpDown, Check, Info, Percent, CalendarDays, UploadCloud, Paperclip, XCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CreateOrderDialogProps {
  currentUser: User;
  availableStatuses: CustomStatus[];
  onOrderCreated: () => void;
  children: React.ReactNode;
  allOrders: TrackingLink[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DialogOrderItem {
  id: string;
  model: string;
  quantity: string;
  lamination: string;
  unitPrice: number | null;
  lineItemTotalPrice: number | null;
}

const formatCurrencyBdt = (value: number | null | undefined): string => {
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

export function CreateOrderDialog({ currentUser, availableStatuses, onOrderCreated, children, allOrders, isOpen, onOpenChange }: CreateOrderDialogProps) {
  const [jobId, setJobId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [initialStatusId, setInitialStatusId] = useState<string>('');
  const [advancePaymentAmount, setAdvancePaymentAmount] = useState<string>('');
  const [advancePaymentMethod, setAdvancePaymentMethod] = useState<string>('');
  const [specialClientDiscount, setSpecialClientDiscount] = useState<string>('');
  const [showCustomPaymentInput, setShowCustomPaymentInput] = useState(false);
  const [customPaymentMethodText, setCustomPaymentMethodText] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [newAdvancePaymentNotes, setNewAdvancePaymentNotes] = useState('');

  const [orderItems, setOrderItems] = useState<DialogOrderItem[]>([{ ...initialOrderItemState, id: uuidv4() }]);
  const [orderItemsTotal, setOrderItemsTotal] = useState<number>(0);
  const [calculatedDiscountAmount, setCalculatedDiscountAmount] = useState<number>(0);
  const [netPayable, setNetPayable] = useState<number>(0);
  const [amountDue, setAmountDue] = useState<number>(0);
  
  const [selectedPaymentProof, setSelectedPaymentProof] = useState<File | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const paymentProofRef = useRef<HTMLInputElement>(null);
  const jobIdInputRef = useRef<HTMLInputElement>(null);


  const [modelOptions, setModelOptions] = useState<ServiceModelItem[]>([]);
  const [laminationOptions, setLaminationOptions] = useState<ServiceLaminationItem[]>([]);
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<ServicePaymentMethodItem[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [popoverOpenStates, setPopoverOpenStates] = useState<Record<string, boolean>>({});
  const [isPaymentMethodPopoverOpen, setIsPaymentMethodPopoverOpen] = useState(false);
  const [currentOrderDate, setCurrentOrderDate] = useState<Date | undefined>(new Date());

  const { toast } = useToast();

  const resetForm = useCallback(() => {
    setJobId('');
    setCompanyName('');
    setAddress('');
    setPhoneNumber('');
    setInitialStatusId('');
    setAdvancePaymentAmount('');
    setAdvancePaymentMethod('');
    setSpecialClientDiscount('');
    setShowCustomPaymentInput(false);
    setCustomPaymentMethodText('');
    setOrderNotes('');
    setNewAdvancePaymentNotes('');
    setOrderItems([{ ...initialOrderItemState, id: uuidv4() }]);
    setPopoverOpenStates({});
    setIsPaymentMethodPopoverOpen(false);
    setOrderItemsTotal(0);
    setCalculatedDiscountAmount(0);
    setNetPayable(0);
    setAmountDue(0);
    setIsSubmitting(false);
    setCurrentOrderDate(new Date());
    setIsAutoFilled(false);
    setSelectedPaymentProof(null);
    setIsUploadingProof(false);
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
      setCurrentOrderDate(new Date());

      // Suggest next available Job ID only if the field is currently empty
      if (jobId.trim() === '') {
        if (allOrders && allOrders.length > 0) {
          let maxJobId = 0;
          allOrders.forEach(order => {
            const orderJobIdStr = (order.companyName || '').split(' • ')[0].trim();
            const orderJobIdNum = parseInt(orderJobIdStr, 10);
            if (!isNaN(orderJobIdNum) && orderJobIdNum > maxJobId) {
              maxJobId = orderJobIdNum;
            }
          });
          const newSuggestedId = (maxJobId + 1).toString();
          setJobId(newSuggestedId);
        } else {
          setJobId('1'); // Start with 1 if no orders exist
        }
      }
      setTimeout(() => {
        jobIdInputRef.current?.focus();
      }, 100);
    } else {
        resetForm();
    }
  }, [isOpen, fetchOptions, allOrders, resetForm, jobId]);

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
    discountNum = Math.min(discountNum, currentItemsTotal);
    setCalculatedDiscountAmount(discountNum);

    const currentNetPayable = Math.max(0, currentItemsTotal - discountNum);
    setNetPayable(currentNetPayable);

    const advanceNum = parseFloat(advancePaymentAmount) || 0;
    const grandTotal = currentNetPayable;
    setAmountDue(Math.max(0, grandTotal - advanceNum));
  }, [orderItems, specialClientDiscount, advancePaymentAmount]);

  const advancePaymentValue = parseFloat(advancePaymentAmount);
  const isAdvancePaymentEntered = !isNaN(advancePaymentValue) && advancePaymentValue > 0;
  
  const isProofRequired = useMemo(() => {
    return isAdvancePaymentEntered && advancePaymentMethod.toLowerCase() !== 'cash';
  }, [isAdvancePaymentEntered, advancePaymentMethod]);

  useEffect(() => {
    if (!isAdvancePaymentEntered) {
        setAdvancePaymentMethod('');
        setCustomPaymentMethodText('');
        setNewAdvancePaymentNotes('');
        setShowCustomPaymentInput(false);
        setSelectedPaymentProof(null);
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
          if (field === 'modelName') {
            const selectedModel = modelOptions.find(opt => opt.name === value);
            updatedItem.model = selectedModel ? selectedModel.name : '';
            updatedItem.unitPrice = selectedModel?.sellingPrice ?? null;
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
  
  const handleJobIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newJobId = e.target.value;
    setJobId(newJobId);
    if (isAutoFilled && newJobId.trim() === '') {
      setIsAutoFilled(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      const trimmedJobId = jobId.trim();
      if (!trimmedJobId || !allOrders.length) {
        if(isAutoFilled) {
          // Clear fields if Job ID is cleared
          setCompanyName('');
          setAddress('');
          setPhoneNumber('');
          setIsAutoFilled(false);
        }
        return;
      }

      const existingOrder = allOrders.find(order => {
        const orderJobId = (order.companyName || '').split(' • ')[0].trim();
        return orderJobId.toLowerCase() === trimmedJobId.toLowerCase();
      });

      if (existingOrder) {
        if (!isAutoFilled) {
            const nameParts = (existingOrder.companyName || '').split(' • ');
            const actualCompanyName = nameParts.length > 1 ? nameParts.slice(1).join(' • ').trim() : '';

            setCompanyName(actualCompanyName);
            setAddress(existingOrder.address);
            setPhoneNumber(existingOrder.phoneNumber);
            setIsAutoFilled(true);

            toast({
              title: "Existing Job ID Found",
              description: `Details for "${trimmedJobId}" have been auto-filled.`,
            });
        }
      } else if (isAutoFilled) {
        setCompanyName('');
        setAddress('');
        setPhoneNumber('');
        setIsAutoFilled(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [jobId, allOrders, toast, isAutoFilled]);

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

  const handleAdvancePaymentMethodChange = (value: string) => {
    setAdvancePaymentMethod(value);
    if (value.toLowerCase() === 'other') {
      setShowCustomPaymentInput(true);
      setCustomPaymentMethodText('');
    } else {
      setShowCustomPaymentInput(false);
      setCustomPaymentMethodText('');
    }
  };
  
  const handleAdvancePaymentAmountChange = (value: string) => {
    setAdvancePaymentAmount(value);
    const numericValue = parseFloat(value);
    const grandTotal = netPayable;
    if (!isNaN(numericValue) && numericValue > grandTotal && grandTotal > 0) {
      toast({
        title: "Validation Warning",
        description: `Advance payment cannot exceed grand total of ${formatCurrencyBdt(grandTotal)}.`,
        variant: "destructive",
      });
    }
  };

  const handleDiscountChange = (value: string) => {
    setSpecialClientDiscount(value);
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
            description: `Special Client Discount cannot exceed total items price of ${formatCurrencyBdt(orderItemsTotal)}.`,
            variant: "destructive"
        });
    }
  };

  const canSubmit = useMemo(() => {
    const parsedAdvPayment = parseFloat(advancePaymentAmount) || 0;
    const grandTotal = netPayable;
    const isAdvPaymentValid = parsedAdvPayment <= grandTotal || grandTotal === 0;
    const isDiscountValid = calculatedDiscountAmount <= orderItemsTotal || orderItemsTotal === 0;

    return !isSubmitting &&
      !isUploadingProof &&
      jobId.trim() &&
      companyName.trim() && address.trim() && phoneNumber.trim() && initialStatusId && currentOrderDate &&
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
      !(isAdvancePaymentEntered && !advancePaymentMethod.trim()) &&
      !(isAdvancePaymentEntered && advancePaymentMethod.toLowerCase() === 'other' && !customPaymentMethodText.trim()) &&
      !(isProofRequired && !selectedPaymentProof) &&
      isAdvPaymentValid && isDiscountValid;
  }, [isSubmitting, isUploadingProof, jobId, companyName, address, phoneNumber, initialStatusId, currentOrderDate, availableStatuses, modelOptions, laminationOptions, isLoadingOptions, orderItems, isAdvancePaymentEntered, advancePaymentMethod, customPaymentMethodText, advancePaymentAmount, netPayable, calculatedDiscountAmount, orderItemsTotal, selectedPaymentProof, isProofRequired]);

  const handleProofFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "File too large", description: "Please select an image smaller than 5MB.", variant: "destructive" });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid File Type", description: "Please select an image file.", variant: "destructive" });
        return;
      }
      setSelectedPaymentProof(file);
    }
  };

  const handleRemoveProofFile = () => {
    setSelectedPaymentProof(null);
    if (paymentProofRef.current) paymentProofRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validations
    if (!canSubmit) {
      if (isAdvancePaymentEntered && isProofRequired && !selectedPaymentProof) {
        toast({ title: "Validation Error", description: "Payment proof is required unless the payment method is 'Cash'.", variant: "destructive" });
      } else {
        toast({ title: "Validation Error", description: "Please fill all required fields correctly.", variant: "destructive" });
      }
      return;
    }
    
    setIsSubmitting(true);
    let uploadedProofUrl: string | null = null;
    
    if (isAdvancePaymentEntered && selectedPaymentProof) {
      setIsUploadingProof(true);
      const formData = new FormData();
      formData.append('file', selectedPaymentProof);
      try {
        const response = await fetch('https://erp.colorhutbd.xyz/file/upload.php', { method: 'POST', body: formData });
        const result = await response.json();
        if (response.ok && result.success && result.file_url) {
          uploadedProofUrl = result.file_url;
        } else {
          throw new Error(result.message || 'File upload failed');
        }
      } catch (error) {
        toast({ title: "Payment Proof Upload Failed", description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" });
        setIsUploadingProof(false);
        setIsSubmitting(false);
        return;
      }
      setIsUploadingProof(false);
    }

    const orderDataForAction = {
      jobId: jobId.trim(),
      companyName: companyName.trim(),
      address: address.trim(),
      phoneNumber: phoneNumber.trim(),
      createdAt: currentOrderDate!.toISOString(),
      orderItems: orderItems.map(item => ({ ...item, quantity: parseInt(item.quantity, 10) })),
      advancePaymentAmount: parseFloat(advancePaymentAmount) || null,
      advancePaymentMethod: advancePaymentMethod.trim() ? (advancePaymentMethod.toLowerCase() === 'other' ? customPaymentMethodText.trim() : advancePaymentMethod.trim()) : null,
      advancePaymentDocumentUrl: uploadedProofUrl,
      newAdvancePaymentNotes: newAdvancePaymentNotes,
      specialClientDiscount: calculatedDiscountAmount > 0 ? calculatedDiscountAmount : null,
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
      onOpenChange(false);
      resetForm();
      window.open(`/track/${result.id}`, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
                <Input id="jobId" ref={jobIdInputRef} value={jobId} onChange={handleJobIdChange} required placeholder="e.g., CUST101, J123" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required placeholder="e.g., Color Hut" readOnly={isAutoFilled} className={cn(isAutoFilled && "bg-muted/50 cursor-not-allowed")} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="address">Address *</Label>
              <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} required readOnly={isAutoFilled} className={cn(isAutoFilled && "bg-muted/50 cursor-not-allowed")} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9]/g, '');
                    if (numericValue.length <= 11) {
                      setPhoneNumber(numericValue);
                    }
                  }}
                  required
                  pattern="0\d{10}"
                  maxLength={11}
                  title="Phone number must be an 11-digit number starting with 0."
                  placeholder="01xxxxxxxxx"
                  readOnly={isAutoFilled}
                  className={cn(isAutoFilled && "bg-muted/50 cursor-not-allowed")}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="orderDate">Order Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !currentOrderDate && "text-muted-foreground"
                      )}
                      disabled={isSubmitting}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {currentOrderDate ? format(currentOrderDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={currentOrderDate}
                      onSelect={setCurrentOrderDate}
                      initialFocus
                      disabled={isSubmitting}
                    />
                  </PopoverContent>
                </Popover>
              </div>
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
                            <span className="flex items-center gap-2 flex-1 text-left whitespace-nowrap overflow-hidden">
                              {item.model && modelOptions.find((option) => option.name === item.model)?.imageUrl ? (
                                  <Avatar className="h-5 w-5 rounded-sm">
                                      <AvatarImage src={modelOptions.find((option) => option.name === item.model)?.imageUrl || undefined} alt={item.model} />
                                      <AvatarFallback className="rounded-sm bg-muted text-xs">IMG</AvatarFallback>
                                  </Avatar>
                              ) : null}
                              <span className="truncate">
                              {item.model
                                ? modelOptions.find((option) => option.name === item.model)?.name
                                : (isLoadingOptions ? "Loading..." : (modelOptions.length === 0 ? "No models" : "Select model..."))}
                              </span>
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
                                    className="flex items-center gap-2"
                                  >
                                    <Check
                                      className={cn(
                                        "h-4 w-4 shrink-0",
                                        item.model === option.name ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <Avatar className="h-8 w-8 rounded-sm shrink-0">
                                      <AvatarImage src={option.imageUrl || undefined} alt={option.name} data-ai-hint="product photo" />
                                      <AvatarFallback className="rounded-sm bg-muted text-xs">IMG</AvatarFallback>
                                    </Avatar>
                                    <span className="flex-1 truncate">{option.name}</span>
                                    {option.isReadyMade && <span className="text-xs text-green-600 font-semibold">(Stock: {option.stockCount ?? 0})</span>}
                                    {option.sellingPrice !== undefined && <span className="ml-auto text-xs text-muted-foreground">({formatCurrencyBdt(option.sellingPrice)})</span>}
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
                      <Input value={formatCurrencyBdt(item.lineItemTotalPrice)} readOnly disabled className="bg-muted/50 text-foreground" />
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
                <Label htmlFor="advancePaymentAmount">Advance Payment</Label>
                <Input
                  id="advancePaymentAmount"
                  type="number"
                  value={advancePaymentAmount}
                  onChange={(e) => handleAdvancePaymentAmountChange(e.target.value)}
                  placeholder="e.g., 500.00"
                  min="0"
                  step="0.01"
                />
              </div>
              {isAdvancePaymentEntered && (
                <>
                <div className="space-y-1">
                  <Label htmlFor="advancePaymentMethod">
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
                          {advancePaymentMethod
                            ? paymentMethodOptions.find((option) => option.name === advancePaymentMethod)?.name
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
                                  handleAdvancePaymentMethodChange(paymentMethodOptions.find(o => o.name.toLowerCase() === currentValue.toLowerCase())?.name || currentValue);
                                  setIsPaymentMethodPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    advancePaymentMethod === option.name ? "opacity-100" : "opacity-0"
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
                        required={advancePaymentMethod.toLowerCase() === 'other'}
                      />
                    </div>
                  )}
                </div>
                 <div className="space-y-1">
                    <Label htmlFor="newAdvancePaymentNotes">Reference/Notes</Label>
                    <Input id="newAdvancePaymentNotes" value={newAdvancePaymentNotes} onChange={e=>setNewAdvancePaymentNotes(e.target.value)} placeholder="Reference or Transaction ID"/>
                </div>
                 {isProofRequired && (
                  <div className="space-y-1 md:col-span-2 lg:col-span-3">
                    <Label htmlFor="payment-proof">
                      Payment Proof <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="payment-proof"
                        type="file"
                        ref={paymentProofRef}
                        onChange={handleProofFileChange}
                        className="flex-1"
                        required={isProofRequired}
                        accept="image/*"
                      />
                      {selectedPaymentProof && (
                        <Button type="button" variant="ghost" size="icon" onClick={handleRemoveProofFile}>
                          <XCircle className="h-4 w-4 text-destructive"/>
                        </Button>
                      )}
                    </div>
                    {selectedPaymentProof && <p className="text-xs text-muted-foreground">File: {selectedPaymentProof.name}</p>}
                  </div>
                )}
                </>
              )}
            </div>

            <div className="mt-4 p-4 border rounded-md bg-muted/30 space-y-2">
                <h4 className="text-md font-semibold text-foreground mb-2">Order Summary</h4>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Order Items Total:</span>
                    <span className="font-medium text-foreground">{formatCurrencyBdt(orderItemsTotal)}</span>
                </div>
                {(calculatedDiscountAmount || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Special Client Discount:</span>
                        <span className="font-medium text-red-600">- {formatCurrencyBdt(calculatedDiscountAmount)}</span>
                    </div>
                )}
                <div className="flex justify-between text-sm font-semibold">
                    <span className="text-foreground">Net Payable:</span>
                    <span className="text-foreground">{formatCurrencyBdt(netPayable)}</span>
                </div>
                {isAdvancePaymentEntered && (
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Advance Paid:</span>
                        <span className="font-medium text-green-600">- {formatCurrencyBdt(parseFloat(advancePaymentAmount))}</span>
                    </div>
                )}
                 <div className="flex justify-between text-lg font-bold mt-1 pt-1 border-t border-border">
                    <span className="text-primary">Amount Due:</span>
                    <span className="text-primary">{formatCurrencyBdt(amountDue)}</span>
                </div>
            </div>

          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting || isUploadingProof ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isUploadingProof ? "Uploading..." : "Creating..."}</> : "Create Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
