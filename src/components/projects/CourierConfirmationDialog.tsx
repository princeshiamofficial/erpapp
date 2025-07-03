
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Project, User } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Truck } from 'lucide-react';
import { getOrderById } from '@/lib/order-service';
import { transferToCourierAction } from '@/app/(app)/projects/actions';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface CourierConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  project: Project | null;
  currentUser: User | null;
  onSuccess: () => void;
}

const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};

export function CourierConfirmationDialog({ isOpen, onOpenChange, project, currentUser, onSuccess }: CourierConfirmationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [orderDetails, setOrderDetails] = useState<{ dueAmount: number, recipient: string, phone: string, address: string } | null>(null);
  const [shippingArea, setShippingArea] = useState<string>('');
  const [shippingCharge, setShippingCharge] = useState<string>('0');
  const { toast } = useToast();
  
  useEffect(() => {
    if (isOpen && project) {
      setIsLoadingDetails(true);
      setShippingArea('');
      setShippingCharge('0');
      const fetchOrderDetails = async () => {
        const order = await getOrderById(project.id);
        if (order) {
            const orderSubtotal = (order.orderItems || []).reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0);
            const effectiveDiscount = order.specialClientDiscount || 0;
            const netPayable = orderSubtotal - effectiveDiscount;
            const totalAdvancePaid = (order.advancePayments || []).reduce((sum, record) => sum + record.amount, 0);
            const dueAmount = Math.max(0, netPayable - totalAdvancePaid);
            
            setOrderDetails({
                dueAmount: dueAmount,
                recipient: order.companyName.split('•').pop()?.trim() || order.companyName,
                phone: order.phoneNumber,
                address: order.address
            });
        } else {
            toast({ title: "Error", description: "Could not fetch order details for courier transfer.", variant: "destructive" });
            setOrderDetails(null);
        }
        setIsLoadingDetails(false);
      };
      fetchOrderDetails();
    }
  }, [isOpen, project, toast]);

  const handleConfirm = async () => {
    if (!project || !currentUser) return;
    
    if (!shippingArea) {
      toast({ title: "Validation Error", description: "Please select a shipping area.", variant: "destructive" });
      return;
    }
    const charge = parseFloat(shippingCharge);
    if (isNaN(charge) || charge < 0) {
        toast({ title: "Validation Error", description: "Please enter a valid, non-negative shipping charge.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    const result = await transferToCourierAction(project, currentUser, shippingArea, charge);
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Transfer Successful",
        description: `Order ${project.projectIdDisplay} sent to Packzy. Tracking: ${result.consignment.tracking_code}`,
      });
      onSuccess(); // This will trigger a re-fetch in the parent
      onOpenChange(false);
    } else {
      toast({
        title: "Transfer Failed",
        description: result.error || "Could not transfer order to courier.",
        variant: "destructive",
        duration: 8000,
      });
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" /> Transfer to Courier
          </AlertDialogTitle>
           {isLoadingDetails ? (
              <div className="space-y-2 py-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
           ) : orderDetails ? (
            <AlertDialogDescription>
                This will create a consignment in <span className="font-semibold text-foreground">Packzy</span> for order <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{project?.projectIdDisplay}</span>. Please confirm the details below.
            </AlertDialogDescription>
           ) : (
                <AlertDialogDescription className="text-destructive">
                    Could not load order details. Please close and try again.
                </AlertDialogDescription>
           )}
        </AlertDialogHeader>

        {orderDetails && !isLoadingDetails && (
            <div className="text-sm text-foreground bg-secondary/50 p-4 rounded-md border border-border/50 space-y-3">
                 <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="recipient" className="text-right">Recipient</Label>
                  <Input id="recipient" value={orderDetails.recipient} readOnly className="col-span-2 h-8 bg-muted/50" />
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="phone" className="text-right">Phone</Label>
                  <Input id="phone" value={orderDetails.phone} readOnly className="col-span-2 h-8 bg-muted/50" />
                </div>
                <div className="grid grid-cols-3 items-start gap-4">
                  <Label htmlFor="address" className="text-right pt-2">Address</Label>
                  <Textarea id="address" value={orderDetails.address} readOnly className="col-span-2 bg-muted/50 text-xs" rows={2} />
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="cod" className="text-right">Product Due</Label>
                  <Input id="cod" value={formatCurrency(orderDetails.dueAmount)} readOnly className="col-span-2 h-8 bg-muted/50" />
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="shipping-area" className="text-right">Shipping Area</Label>
                  <Select value={shippingArea} onValueChange={setShippingArea} required>
                    <SelectTrigger id="shipping-area" className="col-span-2 h-8">
                      <SelectValue placeholder="Select Area..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inside Dhaka">Inside Dhaka</SelectItem>
                      <SelectItem value="Dhaka Suburbs">Dhaka Suburbs</SelectItem>
                      <SelectItem value="Outside Dhaka">Outside Dhaka</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="shipping-charge" className="text-right">Shipping Charge</Label>
                  <Input
                    id="shipping-charge"
                    type="number"
                    value={shippingCharge}
                    onChange={(e) => setShippingCharge(e.target.value)}
                    className="col-span-2 h-8"
                    placeholder="e.g., 60"
                    min="0"
                  />
                </div>
                <div className="grid grid-cols-3 items-center gap-4 mt-2 pt-2 border-t border-dashed">
                  <Label className="text-right font-bold">Total COD</Label>
                  <div className="col-span-2 font-bold text-base">
                    {formatCurrency(orderDetails.dueAmount + (parseFloat(shippingCharge) || 0))}
                  </div>
                </div>
            </div>
        )}
        
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm} 
            disabled={isSubmitting || isLoadingDetails || !orderDetails || !shippingArea}
          >
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Transferring...</> : "Confirm Transfer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
