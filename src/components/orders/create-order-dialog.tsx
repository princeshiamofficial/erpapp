
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { User, CustomStatus, ServiceModelItem, ServiceLaminationItem, OrderItem, ServicePaymentMethodItem, AdvancePaymentRecord, TrackingLink } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { createOrderAction, getClientDetailsAction } from '@/app/(app)/orders/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getModels, getLaminations, getPaymentMethods } from '@/lib/service-options-service';
import { Loader2, PlusCircle, Trash2, ChevronsUpDown, Check, Info, Percent, CalendarDays, UploadCloud, Paperclip, XCircle, Star, Gift } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CreateOrderDialogProps {
  currentUser: User;
  availableStatuses: CustomStatus[];
  onOrderCreated: () => void;
  children: React.ReactNode;
  allOrders: TrackingLink[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<TrackingLink>;
}

interface DialogOrderItem {
  id: string;
  model: string;
  quantity: string;
  lamination: string;
  unitPrice: number | null;
  lineItemTotalPrice: number | null;
  isGift?: boolean;
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
  isGift: false,
};

export function CreateOrderDialog({ currentUser, availableStatuses, onOrderCreated, children, allOrders, isOpen, onOpenChange, initialData }: CreateOrderDialogProps) {
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
  const [isStarred, setIsStarred] = useState<number>(0);
  const [isOrderDatePopoverOpen, setIsOrderDatePopoverOpen] = useState(false);
  const [isDeliveryDatePopoverOpen, setIsDeliveryDatePopoverOpen] = useState(false);
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
  const [acceptedDeliveryDate, setAcceptedDeliveryDate] = useState<Date | undefined>(undefined);

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
    setAcceptedDeliveryDate(undefined);
    setIsAutoFilled(false);
    setSelectedPaymentProof(null);
    setIsUploadingProof(false);
    setIsStarred(0);
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

      if (initialData) {
        const nameParts = (initialData.companyName || '').split(' • ');
        const actualCompanyName = nameParts.length > 1 ? nameParts.slice(1).join(' • ').trim() : initialData.companyName || '';
        
        setCompanyName(actualCompanyName);
        setAddress(initialData.address || '');
        setPhoneNumber(initialData.phoneNumber || '');
        setOrderNotes(initialData.orderNotes || '');
        
        if (initialData.orderItems && initialData.orderItems.length > 0) {
          setOrderItems(initialData.orderItems.map(item => ({
            id: uuidv4(),
            model: item.model,
            quantity: item.quantity.toString(),
            lamination: item.lamination,
            unitPrice: item.unitPrice,
            lineItemTotalPrice: item.lineItemTotalPrice,
          })));
        }

        if (initialData.specialClientDiscount) {
          setSpecialClientDiscount(initialData.specialClientDiscount.toString());
        }

        setIsAutoFilled(true);
      }

      setTimeout(() => {
        jobIdInputRef.current?.focus();
      }, 100);
    } else {
      resetForm();
    }
  }, [isOpen, fetchOptions, resetForm, initialData]);

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
    const currentItemsTotal = orderItems.reduce((sum, item) => sum + (item.isGift ? 0 : (item.lineItemTotalPrice || 0)), 0);
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
    return false; // Disabled as per user request
  }, []);

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
    const handler = setTimeout(async () => {
      const trimmedJobId = jobId.trim();

      if (!trimmedJobId) {
        if (isAutoFilled && !initialData) {
          // Clear fields if Job ID is cleared and we're not in quotation mode
          setCompanyName('');
          setAddress('');
          setPhoneNumber('');
          setIsAutoFilled(false);
        }
        return;
      }

      try {
        const res = await getClientDetailsAction(trimmedJobId);
        if (res && res.success && res.client) {
          if (!isAutoFilled || (isAutoFilled && initialData)) {
            const client = res.client;
            setCompanyName(client.company_name);
            setAddress(client.address);
            setPhoneNumber(client.phone_number);
            setIsAutoFilled(true);

            toast({
              title: "Existing Client Found",
              description: `Details for "${trimmedJobId}" have been auto-filled from clients database.`,
            });
          }
          return;
        }
      } catch (err) {
        console.error("Error fetching client details:", err);
      }

      // Fallback: search in allOrders list
      if (allOrders && allOrders.length > 0) {
        const existingOrder = allOrders.find(order => {
          const orderJobId = (order.companyName || '').split(' • ')[0].trim();
          return orderJobId.toLowerCase() === trimmedJobId.toLowerCase();
        });

        if (existingOrder) {
          if (!isAutoFilled || (isAutoFilled && initialData)) {
            const nameParts = (existingOrder.companyName || '').split(' • ');
            const actualCompanyName = nameParts.length > 1 ? nameParts.slice(1).join(' • ').trim() : '';

            setCompanyName(actualCompanyName);
            setAddress(existingOrder.address);
            setPhoneNumber(existingOrder.phoneNumber);
            setIsAutoFilled(true);

            toast({
              title: "Existing Job ID Found",
              description: `Details for "${trimmedJobId}" have been auto-filled from existing orders.`,
            });
          }
          return;
        }
      }

      if (isAutoFilled && !initialData) {
        // ONLY clear if we are NOT in quotation mode.
        // In quotation mode, we want to keep the quotation details even for a new Job ID.
        setCompanyName('');
        setAddress('');
        setPhoneNumber('');
        setIsAutoFilled(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [jobId, allOrders, toast, isAutoFilled, initialData]);

  const handleAddItem = () => {
    setOrderItems([...orderItems, { ...initialOrderItemState, id: uuidv4() }]);
  };

  const handleRemoveItem = (id: string) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter(item => item.id !== id));
    }
  };

  const handleToggleGift = (itemId: string) => {
    setOrderItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, isGift: !item.isGift } : item
      )
    );
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
      !(isAdvancePaymentEntered && newAdvancePaymentNotes.trim().length < 4) &&
      isAdvPaymentValid && isDiscountValid;
  }, [isSubmitting, isUploadingProof, companyName, address, phoneNumber, initialStatusId, currentOrderDate, availableStatuses, modelOptions, laminationOptions, isLoadingOptions, orderItems, isAdvancePaymentEntered, advancePaymentMethod, customPaymentMethodText, newAdvancePaymentNotes, advancePaymentAmount, netPayable, calculatedDiscountAmount, orderItemsTotal]);


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
      toast({ title: "Validation Error", description: "Please fill all required fields correctly.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    let uploadedProofUrl: string | null = null;

    if (isAdvancePaymentEntered && selectedPaymentProof) {
      setIsUploadingProof(true);
      const formData = new FormData();
      formData.append('file', selectedPaymentProof);
      try {
        const response = await fetch('/api/upload', { method: 'POST', body: formData });
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
      orderItems: orderItems.map(item => ({ ...item, quantity: parseInt(item.quantity, 10), isGift: item.isGift || false })),
      advancePaymentAmount: parseFloat(advancePaymentAmount) || null,
      advancePaymentMethod: advancePaymentMethod.trim() ? (advancePaymentMethod.toLowerCase() === 'other' ? customPaymentMethodText.trim() : advancePaymentMethod.trim()) : null,
      advancePaymentDocumentUrl: uploadedProofUrl,
      newAdvancePaymentNotes: newAdvancePaymentNotes,
      specialClientDiscount: calculatedDiscountAmount > 0 ? calculatedDiscountAmount : null,
      orderNotes: orderNotes.trim() || null,
      initialStatusId,
      acceptedDeliveryDate: acceptedDeliveryDate ? acceptedDeliveryDate.toISOString() : null,
      isStarred,
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

  const giftTotal = orderItems.reduce((sum, item) => sum + (item.isGift ? (item.lineItemTotalPrice || 0) : 0), 0);

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
                <Label htmlFor="jobId">Job ID</Label>
                <Input id="jobId" ref={jobIdInputRef} value={jobId} onChange={handleJobIdChange} placeholder="Leave blank for new client" />
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
                <Label htmlFor="phoneNumber" className="h-5 flex items-center">Phone Number *</Label>
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
                <Label htmlFor="orderDate" className="h-5 flex items-center">Order Date *</Label>
                <Popover open={isOrderDatePopoverOpen} onOpenChange={setIsOrderDatePopoverOpen}>
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
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={currentOrderDate}
                      onSelect={(date) => { setCurrentOrderDate(date); setIsOrderDatePopoverOpen(false); }}
                      initialFocus
                      disabled={isSubmitting}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label htmlFor="acceptedDeliveryDate" className="h-5 flex items-center">Delivery Date (Optional)</Label>
                <Popover open={isDeliveryDatePopoverOpen} onOpenChange={setIsDeliveryDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !acceptedDeliveryDate && "text-muted-foreground"
                      )}
                      disabled={isSubmitting}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {acceptedDeliveryDate ? format(acceptedDeliveryDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={acceptedDeliveryDate}
                      onSelect={(date) => { setAcceptedDeliveryDate(date); setIsDeliveryDatePopoverOpen(false); }}
                      initialFocus
                      disabled={isSubmitting}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 h-5 cursor-pointer">
                  <Star className={cn("h-4 w-4 transition-all", isStarred > 0 ? "fill-amber-500 text-amber-500 scale-110" : "text-muted-foreground")} />
                  Priority Star Rating
                </Label>
                <div className="flex items-center justify-between h-10 px-3 border rounded-md bg-background">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((starIndex) => {
                      const isFull = isStarred >= starIndex;
                      const isHalf = !isFull && isStarred >= starIndex - 0.5;

                      return (
                        <button
                          key={starIndex}
                          type="button"
                          onClick={() => {
                            if (isStarred === starIndex) {
                              setIsStarred(0);
                            } else if (isStarred === starIndex - 0.5) {
                              setIsStarred(starIndex);
                            } else {
                              setIsStarred(starIndex - 0.5);
                            }
                          }}
                          className="relative cursor-pointer transition-transform hover:scale-110 active:scale-95 shrink-0 outline-none"
                        >
                          {isFull ? (
                            <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                          ) : isHalf ? (
                            <div className="relative">
                              <Star className="h-5 w-5 text-muted-foreground/30 dark:text-muted-foreground/20" />
                              <div className="absolute top-0 left-0 overflow-hidden w-[50%] h-full">
                                <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                              </div>
                            </div>
                          ) : (
                            <Star className="h-5 w-5 text-muted-foreground/30 dark:text-muted-foreground/20 hover:text-amber-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
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
              <div className="border rounded-md bg-background overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[45%]">Model *</TableHead>
                      <TableHead className="w-[15%]">Quantity *</TableHead>
                      <TableHead className="w-[20%]">Lamination *</TableHead>
                      <TableHead className="w-[15%] text-right pr-4">Total Price</TableHead>
                      <TableHead className="w-[5%] text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="p-2 align-middle">
                          <Popover open={popoverOpenStates[item.id] || false} onOpenChange={(open) => togglePopover(item.id, open)}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" aria-expanded={popoverOpenStates[item.id] || false} className="w-full justify-between bg-background text-sm" disabled={isLoadingOptions || modelOptions.length === 0}>
                                <span className="flex items-center gap-1.5 flex-1 text-left whitespace-nowrap overflow-hidden">
                                  {item.model && modelOptions.find((option) => option.name === item.model)?.imageUrl ? (
                                    <Avatar className="h-4 w-4 rounded-sm shrink-0">
                                      <AvatarImage src={modelOptions.find((option) => option.name === item.model)?.imageUrl || undefined} alt={item.model} />
                                      <AvatarFallback className="rounded-sm bg-muted text-xs">IMG</AvatarFallback>
                                    </Avatar>
                                  ) : null}
                                  <span className="truncate">
                                    {item.model ? modelOptions.find((option) => option.name === item.model)?.name : (isLoadingOptions ? "Loading..." : (modelOptions.length === 0 ? "No models" : "Select model..."))}
                                  </span>
                                </span>
                                <ChevronsUpDown className="ml-1.5 h-3 w-3 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="min-w-[var(--radix-popover-trigger-width)] w-max max-w-lg p-0 max-h-[var(--radix-popover-content-available-height)] flex flex-col">
                              <Command className="max-h-[var(--radix-popover-content-available-height)]">
                                <CommandInput placeholder="Search model..." />
                                <CommandList className="max-h-[200px] overflow-y-auto">
                                  <CommandEmpty>No model found.</CommandEmpty>
                                  <CommandGroup>
                                    {modelOptions.map((option) => (
                                      <CommandItem key={option.id} value={option.name} onSelect={(currentValue) => { handleItemChange(item.id, 'modelName', currentValue === item.model ? '' : currentValue); togglePopover(item.id, false); }} className="flex items-center gap-2">
                                        <Check className={cn("h-4 w-4 shrink-0", item.model === option.name ? "opacity-100" : "opacity-0")} />
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
                        </TableCell>
                        <TableCell className="p-2 align-middle">
                          <Input id={`quantity-${item.id}`} type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} placeholder="e.g., 100" min="1" required className="bg-background text-sm h-9" />
                        </TableCell>
                        <TableCell className="p-2 align-middle">
                          <Select value={item.lamination} onValueChange={(value) => handleItemChange(item.id, 'lamination', value)} required disabled={isLoadingOptions || laminationOptions.length === 0}>
                            <SelectTrigger id={`lamination-${item.id}`} className="bg-background text-sm h-9"><SelectValue placeholder={isLoadingOptions ? "Loading..." : (laminationOptions.length === 0 ? "No laminations" : "Select lamination")} /></SelectTrigger>
                            <SelectContent>{laminationOptions.map(option => (<SelectItem key={option.id} value={option.name} className="text-sm">{option.name}</SelectItem>))}{laminationOptions.length === 0 && !isLoadingOptions && <div className="p-2 text-sm text-muted-foreground text-center">No laminations.</div>}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell 
                          className="p-2 align-middle text-right pr-4 font-semibold text-sm whitespace-nowrap cursor-pointer select-none"
                          onDoubleClick={() => handleToggleGift(item.id)}
                        >
                          <span style={item.isGift ? { textDecoration: 'line-through', textDecorationColor: '#ef4444', color: '#6b7280' } : undefined}>
                            {formatCurrencyBdt(item.lineItemTotalPrice)}
                          </span>
                          {item.isGift && " (Gift)"}
                        </TableCell>
                        <TableCell className="p-2 align-middle text-right">
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} disabled={isSubmitting || orderItems.length <= 1} className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive-foreground" title="Remove item"><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
                      Payment Method *
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
                          Specify Other Payment Method *
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
                    <Label htmlFor="newAdvancePaymentNotes">Reference/Notes *</Label>
                    <Input id="newAdvancePaymentNotes" value={newAdvancePaymentNotes} onChange={(e) => setNewAdvancePaymentNotes(e.target.value)} placeholder="Reference or Transaction ID" required={isAdvancePaymentEntered} minLength={4} />
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 p-4 border rounded-md bg-muted/30 space-y-2">
              <h4 className="text-md font-semibold text-foreground mb-2">Order Summary</h4>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order Items Total:</span>
                <span className="font-medium text-foreground">{formatCurrencyBdt(orderItemsTotal)}</span>
              </div>
              {giftTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center">
                    <Gift className="h-4 w-4 mr-1 text-yellow-500" />
                    Gift Value:
                  </span>
                  <span className="font-medium text-yellow-500">{formatCurrencyBdt(giftTotal)}</span>
                </div>
              )}
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
