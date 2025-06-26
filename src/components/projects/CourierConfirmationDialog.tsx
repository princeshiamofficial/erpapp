
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
import type { Project, TrackingLink, User } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Truck } from 'lucide-react';
import { getOrderById } from '@/lib/order-service';
import { transferToCourierAction } from '@/app/(app)/projects/actions';

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
  const { toast } = useToast();
  
  useEffect(() => {
    if (isOpen && project) {
      setIsLoadingDetails(true);
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
    
    setIsSubmitting(true);
    const result = await transferToCourierAction(project, currentUser);
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Transfer Successful",
        description: `Order ${project.projectIdDisplay} sent to Steadfast. Tracking: ${result.consignment.tracking_code}`,
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
            <Truck className="h-6 w-6 text-primary" /> Transfer to Courier?
          </AlertDialogTitle>
           {isLoadingDetails ? (
              <div className="space-y-2 py-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
           ) : orderDetails ? (
            <AlertDialogDescription>
                This will create a consignment in <span className="font-semibold text-foreground">Steadfast</span> for order <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{project?.projectIdDisplay}</span> with the following details. This action cannot be undone.
            </AlertDialogDescription>
           ) : (
                <AlertDialogDescription className="text-destructive">
                    Could not load order details. Please close and try again.
                </AlertDialogDescription>
           )}
        </AlertDialogHeader>

        {orderDetails && !isLoadingDetails && (
            <div className="text-sm text-foreground bg-secondary/50 p-3 rounded-md border border-border/50 space-y-1">
                <div><strong className="w-24 inline-block">Recipient:</strong> {orderDetails.recipient}</div>
                <div><strong className="w-24 inline-block">Phone:</strong> {orderDetails.phone}</div>
                <div><strong className="w-24 inline-block">COD Amount:</strong> <span className="font-bold">{formatCurrency(orderDetails.dueAmount)}</span></div>
            </div>
        )}
        
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm} 
            disabled={isSubmitting || isLoadingDetails || !orderDetails}
          >
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Transferring...</> : "Confirm Transfer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
