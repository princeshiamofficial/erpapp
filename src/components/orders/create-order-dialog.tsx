
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { User, CustomStatus } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { createOrderAction } from '@/app/(app)/orders/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CreateOrderDialogProps {
  currentUser: User;
  availableStatuses: CustomStatus[];
  onOrderCreated: () => void;
  children: React.ReactNode;
}

const modelOptions = ["Standard Gloss", "Premium Matte", "Eco-Friendly Recycled", "Luxury Silk"];
const laminationOptions = ["None", "Glossy", "Matte", "Soft Touch", "Anti-Scuff Matte"];

export function CreateOrderDialog({ currentUser, availableStatuses, onOrderCreated, children }: CreateOrderDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [model, setModel] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [lamination, setLamination] = useState<string>('');
  const [initialStatusId, setInitialStatusId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setCompanyName('');
    setAddress('');
    setPhoneNumber('');
    setModel('');
    setQuantity('');
    setLamination('');
    setInitialStatusId(''); 
  };

  useEffect(() => {
    if (isOpen) {
      if (availableStatuses.length > 0) {
        const isCurrentStatusInAvailableList = availableStatuses.some(s => s.id === initialStatusId);
        if (!initialStatusId || !isCurrentStatusInAvailableList) {
          const orderSubmittedStatus = availableStatuses.find(s => s.id === "order-submitted");
          if (orderSubmittedStatus) {
            setInitialStatusId(orderSubmittedStatus.id);
          } else if (availableStatuses[0]) { 
            setInitialStatusId(availableStatuses[0].id);
          }
        }
      } else {
        setInitialStatusId('');
      }
    }
  }, [isOpen, availableStatuses, initialStatusId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !address || !initialStatusId || !model || !quantity || !lamination) {
      toast({
        title: "Validation Error",
        description: "Company name, address, model, quantity, lamination, and initial status are required.",
        variant: "destructive",
      });
      return;
    }
    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity < 1) {
        toast({
            title: "Validation Error",
            description: "Quantity must be a positive number.",
            variant: "destructive",
        });
        return;
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
      phoneNumber: phoneNumber || undefined,
      model,
      quantity: parsedQuantity,
      lamination,
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
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl"> {/* Increased max-width for more space */}
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>Enter company and order details.</DialogDescription>
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
              <Input id="phoneNumber" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Optional" />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-1 flex-1">
                <Label htmlFor="model">Model</Label>
                <Select value={model} onValueChange={setModel} >
                  <SelectTrigger id="model">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelOptions.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 flex-1">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g., 100" min="1" required />
              </div>

              <div className="space-y-1 flex-1">
                <Label htmlFor="lamination">Lamination</Label>
                <Select value={lamination} onValueChange={setLamination}>
                  <SelectTrigger id="lamination">
                    <SelectValue placeholder="Select lamination" />
                  </SelectTrigger>
                  <SelectContent>
                    {laminationOptions.map(option => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
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
               {availableStatuses.length === 0 && <p className="text-xs text-muted-foreground mt-1">Statuses are loading or unavailable. Please wait or check admin settings.</p>}
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => { setIsOpen(false); }} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !initialStatusId || (availableStatuses.length === 0 && !initialStatusId) }>
              {isSubmitting ? "Creating..." : "Create Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

