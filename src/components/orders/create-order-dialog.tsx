
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TrackingLink, OrderLogEntry, User } from "@/types";
import { useToast } from '@/hooks/use-toast';

interface CreateOrderDialogProps {
  currentUser: User;
  onOrderCreated: (newOrder: TrackingLink) => void;
  children: React.ReactNode;
}

export function CreateOrderDialog({ currentUser, onOrderCreated, children }: CreateOrderDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !companyName || !address) {
      toast({
        title: "Validation Error",
        description: "Customer name, company name, and address are required.",
        variant: "destructive",
      });
      return;
    }

    const now = new Date().toISOString();
    const initialStatus = "IDEA_SUBMITTED";

    const initialLogEntry: OrderLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: now,
      status: initialStatus,
      changedByUserId: currentUser.id,
      changedByUserName: currentUser.name,
      notes: "Order created.",
    };

    const newOrder: TrackingLink = {
      id: `ORD-${Date.now()}`, // Simple unique ID
      customerName,
      companyName,
      address,
      crmUserId: currentUser.id,
      crmUserName: currentUser.name,
      createdAt: now,
      isPublic: false, // Default to non-public
      currentStatus: initialStatus,
      statusHistory: [initialLogEntry],
      comments: [], // Initialize with empty comments
    };

    onOrderCreated(newOrder);
    toast({
      title: "Order Created",
      description: `Order ${newOrder.id} for ${customerName} has been created.`,
    });
    setIsOpen(false);
    // Reset form
    setCustomerName('');
    setCompanyName('');
    setAddress('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>Enter customer and order details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Create Order</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
