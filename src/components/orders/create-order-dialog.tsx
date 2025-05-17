
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { User, CustomStatus } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { createOrderAction } from '@/app/(app)/orders/actions'; // Import server action
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CreateOrderDialogProps {
  currentUser: User;
  availableStatuses: CustomStatus[]; // For selecting initial status
  onOrderCreated: () => void; // Callback after successful creation
  children: React.ReactNode;
}

export function CreateOrderDialog({ currentUser, availableStatuses, onOrderCreated, children }: CreateOrderDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [service, setService] = useState('');
  const [initialStatusId, setInitialStatusId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Set default initial status if available
  useEffect(() => {
    const ideaSubmittedStatus = availableStatuses.find(s => s.name === "Idea Submitted");
    if (ideaSubmittedStatus) {
      setInitialStatusId(ideaSubmittedStatus.id);
    } else if (availableStatuses.length > 0) {
      setInitialStatusId(availableStatuses[0].id); // Fallback to first available
    }
  }, [availableStatuses, isOpen]);


  const resetForm = () => {
    setCustomerName('');
    setCompanyName('');
    setAddress('');
    setPhoneNumber('');
    setService('');
    const ideaSubmittedStatus = availableStatuses.find(s => s.name === "Idea Submitted");
    setInitialStatusId(ideaSubmittedStatus ? ideaSubmittedStatus.id : (availableStatuses.length > 0 ? availableStatuses[0].id : ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !companyName || !address || !initialStatusId) {
      toast({
        title: "Validation Error",
        description: "Customer name, company name, address, and initial status are required.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);

    const orderData = {
      customerName,
      companyName,
      address,
      phoneNumber: phoneNumber || undefined,
      service: service || undefined,
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
        description: `Order ${result.id} for ${customerName} has been created.`,
      });
      onOrderCreated(); // Trigger refresh or other actions on parent
      setIsOpen(false);
      resetForm();
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>Enter customer and order details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-1">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </div>
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
              <Input id="phoneNumber" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="service">Service</Label>
              <Input id="service" value={service} onChange={(e) => setService(e.target.value)} placeholder="e.g., Custom Design, Printing (Optional)" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="initialStatus">Initial Status</Label>
              <Select value={initialStatusId} onValueChange={setInitialStatusId} required>
                <SelectTrigger id="initialStatus">
                  <SelectValue placeholder="Select initial status" />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuses.map(status => (
                    <SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
