

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Gift, User, ServiceGiftItem, TrackingLink } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { addGiftAction, updateGiftAction } from '@/app/(app)/gifts/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronsUpDown, Check, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AddEditGiftDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onGiftSaved: (gift: Gift) => void;
  gift?: Gift | null;
  currentUser: User;
  giftOptions: ServiceGiftItem[];
  allOrders: TrackingLink[];
}

export function AddEditGiftDialog({ isOpen, onOpenChange, onGiftSaved, gift, currentUser, giftOptions, allOrders }: AddEditGiftDialogProps) {
  const [giftItemName, setGiftItemName] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [dateGiven, setDateGiven] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const isEditMode = !!gift;

  const resetForm = useCallback(() => {
    if (gift && isEditMode) {
      setGiftItemName(gift.giftItemName);
      setRecipientName(gift.recipientName);
      setRecipientPhone(gift.recipientPhone);
      setRecipientAddress(gift.recipientAddress);
      setOrderId(gift.orderId || null);
      setDateGiven(gift.dateGiven ? new Date(gift.dateGiven) : new Date());
      setNotes(gift.notes || '');
    } else {
      setGiftItemName('');
      setRecipientName('');
      setRecipientPhone('');
      setRecipientAddress('');
      setOrderId(null);
      setDateGiven(new Date());
      setNotes('');
    }
    setIsSubmitting(false);
  }, [gift, isEditMode]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  useEffect(() => {
    if (orderId) {
      const selectedOrder = allOrders.find(o => o.id === orderId);
      if (selectedOrder) {
        setRecipientName(selectedOrder.companyName.split('•').pop()?.trim() || selectedOrder.companyName);
        setRecipientPhone(selectedOrder.phoneNumber);
        setRecipientAddress(selectedOrder.address);
      }
    }
  }, [orderId, allOrders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftItemName || !recipientName || !recipientPhone || !recipientAddress || !dateGiven) {
      toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);

    const giftData: Omit<Gift, 'id' | 'giftIdDisplay' | 'givenByUserId' | 'givenByUserName' | 'createdAt' | 'updatedAt'> = {
      giftItemName, recipientName, recipientPhone, recipientAddress, orderId,
      dateGiven: dateGiven.toISOString(),
      notes: notes.trim() || null,
    };

    let result;
    if (isEditMode && gift) {
      result = await updateGiftAction(gift.id, giftData, currentUser);
    } else {
      result = await addGiftAction(giftData, currentUser);
    }

    setIsSubmitting(false);
    if (result.success) {
      toast({ title: `Gift Entry ${isEditMode ? 'Updated' : 'Created'}`, description: "The gift record has been saved." });
      if(result.gift) onGiftSaved(result.gift);
      onOpenChange(false);
    } else {
      toast({ title: "Error", description: result.error || "Could not save gift record.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Create'} Gift Entry</DialogTitle>
          <DialogDescription>
            {isEditMode ? `Update details for gift ID: ${gift.giftIdDisplay}` : 'Record a new gift given to a client.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          
          <div className="space-y-1">
            <Label htmlFor="orderId">Link to Order (Optional)</Label>
            <Select value={orderId || ''} onValueChange={(value) => setOrderId(value === 'none' ? null : value)}>
              <SelectTrigger id="orderId"><SelectValue placeholder="Select an order..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No associated order</SelectItem>
                {allOrders.map(o => <SelectItem key={o.id} value={o.id}>{o.id} - {o.companyName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="recipientName">Recipient Name *</Label>
              <Input id="recipientName" value={recipientName} onChange={e => setRecipientName(e.target.value)} required disabled={!!orderId} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="recipientPhone">Recipient Phone *</Label>
              <Input id="recipientPhone" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} required disabled={!!orderId} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="recipientAddress">Recipient Address *</Label>
            <Textarea id="recipientAddress" value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} required disabled={!!orderId} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="giftItemName">Gift Item *</Label>
              <Select value={giftItemName} onValueChange={setGiftItemName} required>
                <SelectTrigger id="giftItemName"><SelectValue placeholder="Select a gift..." /></SelectTrigger>
                <SelectContent>
                  {giftOptions.map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateGiven">Date Given *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateGiven && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateGiven ? format(dateGiven, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateGiven} onSelect={setDateGiven} initialFocus /></PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add any relevant notes..."/>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (isEditMode ? 'Save Changes' : 'Create Entry')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
