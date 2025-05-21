
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
import type { TrackingLink, User, ServicePaymentMethodItem } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { updateOrderAction } from '@/app/(app)/orders/actions';
import { getPaymentMethods } from '@/lib/service-options-service';
import { Loader2 } from 'lucide-react';

interface EditOrderDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  order: TrackingLink;
  currentUser: User;
  onOrderUpdated: () => void;
}

export function EditOrderDialog({ isOpen, onOpenChange, order, currentUser, onOrderUpdated }: EditOrderDialogProps) {
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [advancePayment, setAdvancePayment] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [showCustomPaymentInput, setShowCustomPaymentInput] = useState(false);
  const [customPaymentMethodText, setCustomPaymentMethodText] = useState('');

  const [paymentMethodOptions, setPaymentMethodOptions] = useState<ServicePaymentMethodItem[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchOptions = async () => {
      setIsLoadingOptions(true);
      try {
        const fetchedPaymentMethods = await getPaymentMethods();
        setPaymentMethodOptions(fetchedPaymentMethods);
      } catch (error) {
        console.error("Failed to fetch payment methods:", error);
        toast({ title: "Error", description: "Could not load payment methods.", variant: "destructive" });
      } finally {
        setIsLoadingOptions(false);
      }
    };
    if (isOpen) {
      fetchOptions();
    }
  }, [isOpen, toast]);

  useEffect(() => {
    if (isOpen && order) {
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
        // If currentPM is literally "Other", and it's a standard option, custom text might be empty or the word "Other"
        // If it's custom, set it. If it's the standard "Other", clear custom text to prompt input.
        setCustomPaymentMethodText(currentPM.toLowerCase() === 'other' && hasOtherOption ? '' : (isStandardOption ? '' : currentPM) );
      }
    }
  }, [isOpen, order, paymentMethodOptions]);


  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value);
    if (value.toLowerCase() === 'other') {
      setShowCustomPaymentInput(true);
      setCustomPaymentMethodText(''); // Clear custom text when "Other" is selected from dropdown
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

    const updates: Partial<Pick<TrackingLink, 'companyName' | 'address' | 'phoneNumber' | 'advancePayment' | 'paymentMethod'>> = {
      companyName: companyName.trim(),
      address: address.trim(),
      phoneNumber: phoneNumber.trim(),
      advancePayment: parsedAdvancePayment,
      paymentMethod: finalPaymentMethod,
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Order: {order?.id}</DialogTitle>
          <DialogDescription>Modify the details for this order.</DialogDescription>
        </DialogHeader>
        {isLoadingOptions ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
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
                    {paymentMethodOptions.length === 0 && <div className="p-2 text-sm text-muted-foreground text-center">No payment methods found. Configure in Admin &gt; Service Options.</div>}
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
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || isLoadingOptions}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
