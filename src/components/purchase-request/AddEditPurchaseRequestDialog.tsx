
"use client";

import React, { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PurchaseRequest, PurchaseRequestStatus, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { addPurchaseRequestAction, updatePurchaseRequestAction } from '@/app/(app)/purchase-request/actions';
import { Loader2 } from 'lucide-react';

interface AddEditPurchaseRequestDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: () => void;
  request?: PurchaseRequest | null;
  currentUser: User;
}

const STATUS_OPTIONS: PurchaseRequestStatus[] = ['Pending', 'Approved', 'Rejected', 'Purchased'];

export function AddEditPurchaseRequestDialog({ isOpen, onOpenChange, onSave, request, currentUser }: AddEditPurchaseRequestDialogProps) {
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [status, setStatus] = useState<PurchaseRequestStatus>('Pending');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const isEditMode = !!request;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && request) {
        setItem(request.item);
        setQuantity(request.quantity.toString());
        setStatus(request.status);
        setNotes(request.notes || '');
      } else {
        setItem('');
        setQuantity('');
        setStatus('Pending');
        setNotes('');
      }
    }
  }, [isOpen, request, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericQuantity = parseInt(quantity, 10);
    if (!item.trim() || !quantity.trim() || isNaN(numericQuantity) || numericQuantity <= 0) {
      toast({ title: "Validation Error", description: "Please provide a valid item name and a positive quantity.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const requestData = {
      date: new Date().toISOString(),
      item: item.trim(),
      quantity: numericQuantity,
      status,
      notes: notes.trim() || null,
    };

    let result;
    if (isEditMode) {
      result = await updatePurchaseRequestAction(request.id, requestData);
    } else {
      result = await addPurchaseRequestAction(requestData, currentUser);
    }

    setIsSubmitting(false);
    if (result.success) {
      toast({ title: `Request ${isEditMode ? 'Updated' : 'Created'}`, description: `The request for "${item}" has been saved.` });
      onSave();
    } else {
      toast({ title: "Error", description: result.error || "Could not save the request.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Create'} Purchase Request</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this purchase request.' : 'Fill in the details for a new purchase request.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="item-name">Item Name *</Label>
            <Input id="item-name" value={item} onChange={e => setItem(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="quantity">Quantity *</Label>
            <Input id="quantity" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} required min="1" />
          </div>
          {isEditMode && (currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN') && (
            <div className="space-y-1">
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as PurchaseRequestStatus)} required>
                <SelectTrigger id="status"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add any relevant details or justification..."/>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (isEditMode ? "Save Changes" : "Create Request")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
