

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
import type { TrackingLink, User, ServicePaymentMethodItem, OrderItem, ServiceModelItem, ServiceLaminationItem, AdvancePaymentRecord } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { updateOrderAction } from '@/app/(app)/orders/actions';
import { getPaymentMethods, getModels, getLaminations } from '@/lib/service-options-service';
import { Loader2, PlusCircle, Trash2, ChevronsUpDown, Check, Info, Percent, CalendarDays, ReceiptText, Truck } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


interface EditOrderDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  order: TrackingLink;
  currentUser: User;
  onOrderUpdated: () => void;
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

const formatDateForDialogInput = (dateString: string | Date | undefined): string => {
  if (!dateString) return "N/A";
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, "PPP");
  } catch (e) {
    return "Invalid Date";
  }
};


export function EditOrderDialog({ isOpen, onOpenChange, order, currentUser, onOrderUpdated }: EditOrderDialogProps) {
  const [jobIdInput, setJobIdInput] = useState('');
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [createdAt, setCreatedAt] = useState<Date | undefined>(undefined);
  const [specialClientDiscount, setSpecialClientDiscount] = useState<string>('');
  const [shippingCharge, setShippingCharge] = useState<string>(''); // Added
  const [orderNotes, setOrderNotes] = useState('');

  const [orderItems, setOrderItems] = useState<DialogOrderItem[]>([]);
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
  
  const [newAdvanceAmount, setNewAdvanceAmount] = useState('');
  const [newAdvancePaymentMethod, setNewAdvancePaymentMethod] = useState('');
  const [showNewCustomPaymentInput, setShowNewCustomPaymentInput] = useState(false);
  const [newCustomPaymentMethodText, setNewCustomPaymentMethodText] = useState('');
  const [newAdvancePaymentNotes, setNewAdvancePaymentNotes] = useState('');

  const [existingAdvancePayments, setExistingAdvancePayments] = useState<AdvancePaymentRecord[]>([]);
  const [totalExistingAdvancePaid, setTotalExistingAdvancePaid] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchDialogOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    try {
      const [fetchedPaymentMethods, fetchedModels, fetchedLaminations] = await Promise.all([
        getPaymentMethods(), getModels(), getLaminations()
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
      const companyNameString = order.companyName || "";
      const separator = " • ";
      const firstSeparatorIndex = companyNameString.indexOf(separator);
      if (firstSeparatorIndex !== -1) {
        setJobIdInput(companyNameString.substring(0, firstSeparatorIndex).trim());
        setCompanyNameInput(companyNameString.substring(firstSeparatorIndex + separator.length).trim());
      } else {
        setJobIdInput(''); setCompanyNameInput(companyNameString.trim());
      }
      setAddress(order.address);
      setPhoneNumber(order.phoneNumber);
      setCreatedAt(order.createdAt ? parseISO(order.createdAt) : undefined);
      setSpecialClientDiscount(order.specialClientDiscount?.toString() || '');
      setShippingCharge(order.shippingCharge?.toString() || '');
      setOrderNotes(order.orderNotes || '');
      setOrderItems(order.orderItems.map(item => ({ ...item, quantity: item.quantity.toString() })));

      const currentAdvancePayments = order.advancePayments || [];
      if (currentAdvancePayments.length === 0 && order.advancePayment && order.advancePayment > 0) {
          const legacyRecord: AdvancePaymentRecord = {
              id: 'legacy-advance-001',
              amount: order.advancePayment,
              date: order.createdAt,
              paymentMethod: order.paymentMethod || "Unknown",
              notes: "Initial advance payment (legacy).",
              recordedByUserId: order.crmUserId,
              recordedByUserName: order.crmUserName,
          };
          setExistingAdvancePayments([legacyRecord]);
      } else {
        setExistingAdvancePayments(currentAdvancePayments);
      }
    }
    setNewAdvanceAmount(''); setNewAdvancePaymentMethod(''); setNewAdvancePaymentNotes('');
    setShowNewCustomPaymentInput(false); setNewCustomPaymentMethodText('');
    setPopoverOpenStates({}); setIsPaymentMethodPopoverOpen(false);
    setIsSubmitting(false);
  }, [order]);

  useEffect(() => {
    if (isOpen) fetchDialogOptions();
  }, [isOpen, fetchDialogOptions]);

  useEffect(() => {
    if (isOpen && order && !isLoadingOptions) resetForm();
  }, [isOpen, order, isLoadingOptions, resetForm]);

  useEffect(() => {
    const currentItemsTotal = orderItems.reduce((sum, item) => sum + (item.lineItemTotalPrice || 0), 0);
    setOrderItemsTotal(currentItemsTotal);

    let discountNum = 0;
    const discountStr = specialClientDiscount.trim();
    if (discountStr.endsWith('%')) {
        const percentage = parseFloat(discountStr.substring(0, discountStr.length - 1));
        if (!isNaN(percentage) && percentage >= 0) discountNum = (percentage / 100) * currentItemsTotal;
    } else {
        const fixedAmount = parseFloat(discountStr);
        if (!isNaN(fixedAmount) && fixedAmount >= 0) discountNum = fixedAmount;
    }
    discountNum = Math.min(discountNum, currentItemsTotal);
    setCalculatedDiscountAmount(discountNum);

    const currentNetPayable = Math.max(0, currentItemsTotal - discountNum);
    setNetPayable(currentNetPayable);
    
    const currentTotalExistingAdvance = existingAdvancePayments.reduce((sum, record) => sum + record.amount, 0);
    setTotalExistingAdvancePaid(currentTotalExistingAdvance);

    const newAdvanceNum = parseFloat(newAdvanceAmount) || 0;
    const chargeNum = parseFloat(shippingCharge) || 0;
    const grandTotal = currentNetPayable + chargeNum;

    setAmountDue(Math.max(0, grandTotal - currentTotalExistingAdvance - newAdvanceNum));
  }, [orderItems, specialClientDiscount, newAdvanceAmount, existingAdvancePayments, shippingCharge]);

  const calculateLineItemTotal = (unitPrice: number | null, quantityStr: string): number | null => {
    if (unitPrice === null) return null;
    const quantity = parseInt(quantityStr, 10);
    if (isNaN(quantity) || quantity < 1) return null;
    return unitPrice * quantity;
  };

  const handleItemChange = (itemId: string, field: keyof DialogOrderItem | 'modelName', value: string | number | null) => {
    setOrderItems(prevItems => prevItems.map(item => {
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
    }));
  };

  const handleAddItem = () => setOrderItems(prev => [...prev, { id: uuidv4(), model: '', quantity: '1', lamination: '', unitPrice: null, lineItemTotalPrice: null }]);
  const handleRemoveItem = (id: string) => { if (orderItems.length > 1) setOrderItems(prev => prev.filter(item => item.id !== id)); };
  const togglePopover = (itemId: string, open?: boolean) => setPopoverOpenStates(prev => ({ ...prev, [itemId]: open === undefined ? !prev[itemId] : open }));

  const handleNewAdvancePaymentMethodChange = (value: string) => {
    setNewAdvancePaymentMethod(value);
    setShowNewCustomPaymentInput(value.toLowerCase() === 'other');
    if (value.toLowerCase() !== 'other') setNewCustomPaymentMethodText('');
  };
  
  const handleDiscountChangeEdit = (value: string) => {
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
  
  const isNewAdvanceEntered = (parseFloat(newAdvanceAmount) || 0) > 0;

  useEffect(() => {
    if (!isNewAdvanceEntered) {
        setNewAdvancePaymentMethod('');
        setNewCustomPaymentMethodText('');
        setShowNewCustomPaymentInput(false);
    }
  }, [isNewAdvanceEntered]);


  const canSubmit = useMemo(() => {
    if (!currentUser || !currentUser.role) return false;
    const totalAdvanceAfterNew = totalExistingAdvancePaid + (parseFloat(newAdvanceAmount) || 0);
    const grandTotal = netPayable + (parseFloat(shippingCharge) || 0);
    const isAdvPaymentValid = totalAdvanceAfterNew <= grandTotal || grandTotal === 0;
    const isDiscountValid = calculatedDiscountAmount <= orderItemsTotal || orderItemsTotal === 0;

    return !isSubmitting && jobIdInput.trim() && companyNameInput.trim() && address.trim() && phoneNumber.trim() && createdAt &&
      !isLoadingOptions && orderItems.length > 0 && orderItems.every(item => item.model && item.quantity && parseInt(item.quantity) > 0 && item.lamination && item.unitPrice !== null && item.lineItemTotalPrice !== null) &&
      !(isNewAdvanceEntered && !newAdvancePaymentMethod.trim()) &&
      !(isNewAdvanceEntered && newAdvancePaymentMethod.toLowerCase() === 'other' && !newCustomPaymentMethodText.trim()) &&
      isAdvPaymentValid && isDiscountValid;
  }, [isSubmitting, jobIdInput, companyNameInput, address, phoneNumber, createdAt, isLoadingOptions, orderItems, isNewAdvanceEntered, newAdvancePaymentMethod, newCustomPaymentMethodText, currentUser, totalExistingAdvancePaid, newAdvanceAmount, netPayable, shippingCharge, orderItemsTotal, calculatedDiscountAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUser.role) {
        toast({ title: "Authentication Error", variant: "destructive" }); return;
    }
    if (!jobIdInput.trim() || !companyNameInput.trim() || !address.trim() || !phoneNumber.trim() || !createdAt) {
      toast({ title: "Validation Error", description: "Job ID, Company, Address, Phone, Date Created are required.", variant: "destructive" }); return;
    }
    if (orderItems.length === 0 || orderItems.some(item => !item.model || !item.lamination || parseInt(item.quantity) < 1 || item.unitPrice === null || item.lineItemTotalPrice === null)) {
       toast({ title: "Validation Error", description: "All order items must be complete.", variant: "destructive" }); return;
    }
    const parsedNewAdvAmount = parseFloat(newAdvanceAmount) || 0;
    if (parsedNewAdvAmount > 0 && !newAdvancePaymentMethod.trim()) {
        toast({ title: "Validation Error", description: "Payment Method is required for new advance payment.", variant: "destructive" }); return;
    }
    if (parsedNewAdvAmount > 0 && newAdvancePaymentMethod.toLowerCase() === 'other' && !newCustomPaymentMethodText.trim()) {
        toast({ title: "Validation Error", description: "Specify 'Other' payment method.", variant: "destructive" }); return;
    }
    
    const parsedShippingCharge = parseFloat(shippingCharge) || 0;
    const totalAdvanceAfterNew = totalExistingAdvancePaid + parsedNewAdvAmount;
    const grandTotal = netPayable + parsedShippingCharge;
    if (totalAdvanceAfterNew > grandTotal && grandTotal > 0) {
        toast({ title: "Validation Error", description: `Total advance payment cannot exceed grand total.`, variant: "destructive"}); return;
    }
    if (calculatedDiscountAmount > orderItemsTotal && orderItemsTotal > 0) {
         toast({ title: "Validation Error", description: `Discount cannot exceed total items price.`, variant: "destructive"}); return;
    }

    setIsSubmitting(true);
    const finalUpdates: Partial<TrackingLink> & { newAdvancePaymentAmount?: number | null; newAdvancePaymentMethod?: string | null; newAdvancePaymentNotes?: string | null; } = {
      companyName: `${jobIdInput.trim()} • ${companyNameInput.trim()}`,
      address: address.trim(),
      phoneNumber: phoneNumber.trim(),
      createdAt: createdAt.toISOString(),
      specialClientDiscountString: specialClientDiscount.trim() || null,
      shippingCharge: parsedShippingCharge > 0 ? parsedShippingCharge : null,
      orderNotes: orderNotes.trim() || null,
      orderItems: orderItems.map(item => ({ ...item, quantity: parseInt(item.quantity, 10), unitPrice: item.unitPrice!, lineItemTotalPrice: item.lineItemTotalPrice! })),
      advancePayments: [...existingAdvancePayments],
    };

    if (parsedNewAdvAmount > 0) {
        const newRecord: AdvancePaymentRecord = {
            id: uuidv4(),
            amount: parsedNewAdvAmount,
            date: new Date().toISOString(),
            paymentMethod: newAdvancePaymentMethod.toLowerCase() === 'other' ? newCustomPaymentMethodText.trim() : newAdvancePaymentMethod.trim(),
            notes: newAdvancePaymentNotes.trim() || null,
            recordedByUserId: currentUser.id,
            recordedByUserName: currentUser.name,
        };
        finalUpdates.advancePayments = [...(finalUpdates.advancePayments || []), newRecord];
    }
    
    const result = await updateOrderAction(order.id, finalUpdates, currentUser);
    setIsSubmitting(false);
    if (result.success && result.order) {
      onOrderUpdated(); onOpenChange(false);
    } else {
      toast({ title: "Update Failed", description: result.error || "Could not update order.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-3xl xl:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit Order: <span className="font-normal">{order?.companyName}</span></DialogTitle>
          <DialogDescription>Modify details for order ID: <span className="font-mono">{order?.id}</span>.</DialogDescription>
        </DialogHeader>
        {isLoadingOptions ? (<div className="flex justify-center items-center h-60"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>)
        : (<form onSubmit={handleSubmit}><div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1"><Label htmlFor="edit-jobId">Job ID *</Label><Input id="edit-jobId" value={jobIdInput} onChange={(e) => setJobIdInput(e.target.value)} required disabled={isSubmitting} /></div>
                <div className="space-y-1"><Label htmlFor="edit-companyNamePart">Company Name *</Label><Input id="edit-companyNamePart" value={companyNameInput} onChange={(e) => setCompanyNameInput(e.target.value)} required disabled={isSubmitting} /></div>
              </div>
              <div className="space-y-1"><Label htmlFor="edit-address">Address *</Label><Textarea id="edit-address" value={address} onChange={(e) => setAddress(e.target.value)} required disabled={isSubmitting} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-phoneNumber">Phone Number *</Label>
                  <Input
                    id="edit-phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      const numericValue = e.target.value.replace(/[^0-9]/g, '');
                      if (numericValue.length <= 11) {
                        setPhoneNumber(numericValue);
                      }
                    }}
                    required
                    disabled={isSubmitting}
                    pattern="0\d{10}"
                    maxLength={11}
                    title="Phone number must be an 11-digit number starting with 0."
                    placeholder="01xxxxxxxxx"
                  />
                </div>
                <div className="space-y-1"><Label htmlFor="edit-orderDate">Date Created *</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal",!createdAt && "text-muted-foreground")} disabled={isSubmitting}><CalendarDays className="mr-2 h-4 w-4" />{createdAt ? formatDateForDialogInput(createdAt) : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={createdAt} onSelect={setCreatedAt} initialFocus disabled={isSubmitting} /></PopoverContent></Popover></div>
              </div>
              <div className="space-y-1"><Label htmlFor="edit-orderNotes">Order Notes (Optional)</Label><Textarea id="edit-orderNotes" value={orderNotes} onChange={e => setOrderNotes(e.target.value)} rows={3} disabled={isSubmitting}/></div>
              <div className="space-y-3 mt-4 border-t border-border pt-4"><Label className="text-lg font-semibold">Order Items *</Label>
                {orderItems.map((item) => (<div key={item.id} className="p-3 border rounded-md bg-secondary/30 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1.5fr_1fr_auto] gap-x-3 gap-y-2 items-end">
                    <div className="space-y-1"><Label htmlFor={`model-${item.id}`}>Model *</Label>
                      <Popover open={popoverOpenStates[item.id] || false} onOpenChange={(open) => togglePopover(item.id, open)}>
                        <PopoverTrigger asChild><Button variant="outline" role="combobox" aria-expanded={popoverOpenStates[item.id] || false} className="w-full justify-between bg-background whitespace-nowrap" disabled={isLoadingOptions || modelOptions.length === 0 || isSubmitting}><span className="flex-1 text-left whitespace-nowrap">{item.model ? modelOptions.find((option) => option.name === item.model)?.name : (isLoadingOptions ? "Loading..." : (modelOptions.length === 0 ? "No models" : "Select model..."))}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
                        <PopoverContent className="min-w-[var(--radix-popover-trigger-width)] w-max max-w-lg p-0"><Command><CommandInput placeholder="Search model..." /><CommandList><CommandEmpty>No model found.</CommandEmpty><CommandGroup>{modelOptions.map((option) => (<CommandItem key={option.id} value={option.name} onSelect={(currentValue) => { handleItemChange(item.id, 'modelName', currentValue === item.model ? '' : currentValue); togglePopover(item.id, false);}} className="whitespace-nowrap"><Check className={cn("mr-2 h-4 w-4", item.model === option.name ? "opacity-100" : "opacity-0")}/>{option.name}{option.sellingPrice !== undefined && <span className="ml-auto text-xs text-muted-foreground">({formatCurrencyBdt(option.sellingPrice)})</span>}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1"><Label htmlFor={`quantity-${item.id}`}>Quantity *</Label><Input id={`quantity-${item.id}`} type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} min="1" required className="bg-background" disabled={isSubmitting} /></div>
                    <div className="space-y-1"><Label htmlFor={`lamination-${item.id}`}>Lamination *</Label>
                      <Select value={item.lamination} onValueChange={(value) => handleItemChange(item.id, 'lamination', value)} required disabled={isLoadingOptions || laminationOptions.length === 0 || isSubmitting}>
                        <SelectTrigger id={`lamination-${item.id}`} className="bg-background"><SelectValue placeholder={isLoadingOptions ? "Loading..." : (laminationOptions.length === 0 ? "No laminations" : "Select lamination")} /></SelectTrigger>
                        <SelectContent>{laminationOptions.map(option => (<SelectItem key={option.id} value={option.name}>{option.name}</SelectItem>))}{laminationOptions.length === 0 && !isLoadingOptions && <div className="p-2 text-sm text-muted-foreground text-center">No laminations configured.</div>}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label>Total Price</Label><Input value={formatCurrencyBdt(item.lineItemTotalPrice)} readOnly disabled className="bg-muted/50 text-foreground" /></div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} disabled={isSubmitting || orderItems.length <= 1} className="h-10 w-10 text-destructive hover:bg-destructive/10 hover:text-destructive-foreground" title="Remove item"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>))}
                <Button type="button" variant="outline" onClick={handleAddItem} className="mt-2" disabled={isSubmitting || isLoadingOptions}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                  <div className="space-y-1"><Label htmlFor="edit-specialClientDiscount">Special Client Discount</Label><div className="relative"><Input id="edit-specialClientDiscount" type="text" value={specialClientDiscount} onChange={(e) => handleDiscountChangeEdit(e.target.value)} placeholder="e.g., 100 or 10%" disabled={isSubmitting} className="pl-7"/><Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /></div></div>
                  <div className="space-y-1"><Label htmlFor="edit-shippingCharge">Shipping Charge</Label><div className="relative"><Input id="edit-shippingCharge" type="number" value={shippingCharge} onChange={(e) => setShippingCharge(e.target.value)} placeholder="e.g., 120" min="0" step="0.01" disabled={isSubmitting} className="pl-7"/><Truck className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /></div></div>
              </div>
              
              {existingAdvancePayments.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label className="text-md font-semibold flex items-center"><ReceiptText className="mr-2 h-5 w-5 text-primary/80" />Advance Payment History</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-md bg-muted/20 p-2 custom-scrollbar">
                    <Table size="sm"><TableHeader><TableRow><TableHead className="h-8 text-xs">Date</TableHead><TableHead className="h-8 text-xs">Amount</TableHead><TableHead className="h-8 text-xs">Method</TableHead><TableHead className="h-8 text-xs">Notes</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {existingAdvancePayments.map(record => (
                          <TableRow key={record.id}><TableCell className="text-xs py-1.5">{formatDateForDialogInput(record.date)}</TableCell><TableCell className="text-xs py-1.5">{formatCurrencyBdt(record.amount)}</TableCell><TableCell className="text-xs py-1.5">{record.paymentMethod || 'N/A'}</TableCell><TableCell className="text-xs py-1.5">{record.notes || 'N/A'}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="mt-4 border-t border-border pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                <div className="space-y-1"><Label htmlFor="newAdvanceAmount">Add New Advance Payment</Label><Input id="newAdvanceAmount" type="number" value={newAdvanceAmount} onChange={(e) => setNewAdvanceAmount(e.target.value)} placeholder="Amount (BDT)" min="0" step="0.01" disabled={isSubmitting} /></div>
                {isNewAdvanceEntered && (<div className="space-y-1"><Label htmlFor="newAdvancePaymentMethod">New Payment Method <span className="text-destructive">*</span></Label>
                  <Popover open={isPaymentMethodPopoverOpen} onOpenChange={setIsPaymentMethodPopoverOpen}>
                    <PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between bg-background" disabled={isLoadingOptions || paymentMethodOptions.length === 0 || isSubmitting}><span className="flex-1 text-left whitespace-nowrap">{newAdvancePaymentMethod ? paymentMethodOptions.find(opt => opt.name === newAdvancePaymentMethod)?.name || newAdvancePaymentMethod : (isLoadingOptions ? "Loading..." : (paymentMethodOptions.length===0?"No methods":"Select method..."))}</span><ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
                    <PopoverContent className="min-w-[var(--radix-popover-trigger-width)] w-max max-w-md p-0"><Command><CommandInput placeholder="Search method..." /><CommandList><CommandEmpty>No method found.</CommandEmpty><CommandGroup>{paymentMethodOptions.map(opt => (<CommandItem key={opt.id} value={opt.name} onSelect={(val) => {handleNewAdvancePaymentMethodChange(paymentMethodOptions.find(o=>o.name.toLowerCase()===val.toLowerCase())?.name||val);setIsPaymentMethodPopoverOpen(false);}}><Check className={cn("mr-2 h-4 w-4",newAdvancePaymentMethod===opt.name?"opacity-100":"opacity-0")}/><span className="whitespace-nowrap">{opt.name}</span></CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent>
                  </Popover>
                  {showNewCustomPaymentInput && (<div className="mt-2 space-y-1"><Label htmlFor="newCustomPaymentText">Specify Other Method <span className="text-destructive">*</span></Label><Input id="newCustomPaymentText" value={newCustomPaymentMethodText} onChange={e=>setNewCustomPaymentMethodText(e.target.value)} required={newAdvancePaymentMethod.toLowerCase()==='other'} disabled={isSubmitting}/></div>)}
                </div>)}
                {isNewAdvanceEntered && (<div className="space-y-1"><Label htmlFor="newAdvancePaymentNotes">New Payment Notes</Label><Textarea id="newAdvancePaymentNotes" value={newAdvancePaymentNotes} onChange={e=>setNewAdvancePaymentNotes(e.target.value)} rows={1} placeholder="Optional notes for this payment" disabled={isSubmitting}/></div>)}
              </div>

              <div className="mt-4 p-4 border rounded-md bg-muted/30 space-y-2">
                <h4 className="text-md font-semibold text-foreground mb-2">Order Summary</h4>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Order Items Total:</span><span className="font-medium text-foreground">{formatCurrencyBdt(orderItemsTotal)}</span></div>
                {(calculatedDiscountAmount || 0) > 0 && (<div className="flex justify-between text-sm"><span className="text-muted-foreground">Discount:</span><span className="font-medium text-red-600">- {formatCurrencyBdt(calculatedDiscountAmount)}</span></div>)}
                <div className="flex justify-between text-sm font-semibold"><span className="text-foreground">Net Payable:</span><span className="text-foreground">{formatCurrencyBdt(netPayable)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Shipping Charge:</span><span className="font-medium text-foreground">+ {formatCurrencyBdt(parseFloat(shippingCharge) || 0)}</span></div>
                {(totalExistingAdvancePaid + (parseFloat(newAdvanceAmount)||0)) > 0 && (<div className="flex justify-between text-sm mt-1 pt-1 border-t border-dashed border-border"><span className="text-muted-foreground">Total Advance Paid:</span><span className="font-medium text-green-600">- {formatCurrencyBdt(totalExistingAdvancePaid + (parseFloat(newAdvanceAmount)||0))}</span></div>)}
                <div className="flex justify-between text-lg font-bold mt-1 pt-1 border-t border-border"><span className="text-primary">Amount Due:</span><span className="text-primary">{formatCurrencyBdt(amountDue)}</span></div>
              </div>

            </div>
            <DialogFooter className="pt-4 border-t"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button><Button type="submit" disabled={!canSubmit}>{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}</Button></DialogFooter>
          </form>)}
      </DialogContent>
    </Dialog>
  );
}
