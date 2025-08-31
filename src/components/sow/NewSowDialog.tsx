
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { User, CustomStatus, TrackingLink, OrderItem } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { createOrderAction } from '@/app/(app)/orders/actions';
import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface NewSowDialogProps {
  currentUser: User;
  availableStatuses: CustomStatus[];
  onSowCreated: () => void;
  children: React.ReactNode;
  allOrders: TrackingLink[];
  reportProductFilters: string[];
}

export function NewSowDialog({ currentUser, availableStatuses, onSowCreated, children, allOrders, reportProductFilters }: NewSowDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [jobId, setJobId] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoFilled, setIsAutoFilled] = useState(false);

  const { toast } = useToast();

  const resetForm = useCallback(() => {
    setJobId('');
    setBusinessName('');
    setAddress('');
    setPhoneNumber('');
    setCategory('');
    setIsSubmitting(false);
    setIsAutoFilled(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);
  
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
          setBusinessName('');
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
            const actualBusinessName = nameParts.length > 1 ? nameParts.slice(1).join(' • ').trim() : '';

            setBusinessName(actualBusinessName);
            setAddress(existingOrder.address);
            setPhoneNumber(existingOrder.phoneNumber);
            setIsAutoFilled(true);

            toast({
              title: "Existing Job ID Found",
              description: `Details for "${trimmedJobId}" have been auto-filled.`,
            });
        }
      } else if (isAutoFilled) {
        setBusinessName('');
        setAddress('');
        setPhoneNumber('');
        setIsAutoFilled(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [jobId, allOrders, toast, isAutoFilled]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!jobId || !businessName || !address || !phoneNumber || !category) {
      toast({ title: "Validation Error", description: "All fields are required.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    const phoneRegex = /^0\d{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      toast({
        title: "Validation Error",
        description: "Invalid phone number. It must be an 11-digit number starting with 0.",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }
    
    const orderSubmittedStatus = availableStatuses.find(s => s.id === 'order-submitted');
    if (!orderSubmittedStatus) {
        toast({ title: "Configuration Error", description: "Initial order status 'order-submitted' not found.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    // Create a minimal order item to represent the category
    const sowOrderItem: OrderItem = {
      id: uuidv4(),
      model: category,
      quantity: 1, // Quantity doesn't matter for SOW logic, but needs to be > 0
      lamination: 'N/A', // Default value
      unitPrice: 0,
      lineItemTotalPrice: 0,
    };

    const orderDataForAction = {
      jobId,
      companyName: businessName,
      address,
      phoneNumber,
      createdAt: new Date().toISOString(),
      orderItems: [sowOrderItem],
      initialStatusId: orderSubmittedStatus.id,
    };

    const result = await createOrderAction(orderDataForAction, currentUser);
    setIsSubmitting(false);

    if ('error' in result) {
      toast({ title: "SOW Creation Failed", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "SOW Entry Created", description: `A new entry for ${businessName} has been added.` });
      onSowCreated();
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New SOW Entry</DialogTitle>
          <DialogDescription>Manually create a new entry for the Statement of Work report.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="space-y-1">
            <Label htmlFor="sow-jobId">Job ID *</Label>
            <Input id="sow-jobId" value={jobId} onChange={handleJobIdChange} required placeholder="e.g., CUST101" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sow-businessName">Business Name *</Label>
            <Input id="sow-businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required placeholder="e.g., Acme Restaurant" disabled={isAutoFilled}/>
          </div>
          <div className="space-y-1">
            <Label htmlFor="sow-address">Address *</Label>
            <Input id="sow-address" value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="e.g., 123 Main St, Anytown" disabled={isAutoFilled}/>
          </div>
          <div className="space-y-1">
            <Label htmlFor="sow-phoneNumber">Phone Number *</Label>
            <Input
              id="sow-phoneNumber"
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
              disabled={isAutoFilled}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sow-category">Category *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger id="sow-category">
                <SelectValue placeholder="Select a product category" />
              </SelectTrigger>
              <SelectContent>
                {reportProductFilters.map((filter) => (
                  <SelectItem key={filter} value={filter}>
                    {filter}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Creating...' : 'Create Entry'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
