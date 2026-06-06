"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Card, User, ServiceGiftItem, TrackingLink } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { addGiftAction, updateGiftAction } from '@/app/(app)/membership-card/actions';
import { getClientDetailsAction } from '@/app/(app)/orders/actions';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AddEditCardDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCardSaved: (card: Card) => void;
  card?: Card | null;
  currentUser: User;
  cardOptions: ServiceGiftItem[];
  allOrders: TrackingLink[];
  existingCards?: Card[];
}

export function AddEditCardDialog({ isOpen, onOpenChange, onCardSaved, card, currentUser, cardOptions, allOrders, existingCards = [] }: AddEditCardDialogProps) {
  const [cardNo, setCardNo] = useState('');

  const formatCardNo = (value: string) => {
    // Strip all non-digits
    const digits = value.replace(/\D/g, '');
    // Insert space after every 4 digits
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').slice(0, 19);
  };

  const handleCardNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNo(formatCardNo(e.target.value));
  };
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [dateGiven, setDateGiven] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCardPopoverOpen, setIsCardPopoverOpen] = useState(false);
  const [jobIdInput, setJobIdInput] = useState('');
  const { toast } = useToast();
  const initialJobId = useRef('');

  const isEditMode = !!card;

  const resetForm = useCallback(() => {
    if (card && isEditMode) {
      const names = Array.isArray(card.giftItemNames) ? card.giftItemNames : (card.giftItemName ? [card.giftItemName] : []);
      setCardNo(names[0] || '');
      setRecipientName(card.recipientName);
      setRecipientPhone(card.recipientPhone);
      setRecipientAddress(card.recipientAddress);
      setOrderId(card.orderId || null);
      const matchedOrder = card.orderId ? allOrders.find(o => o.id === card.orderId) : null;
      const initialVal = matchedOrder ? (matchedOrder.companyName || '').split(' • ')[0].trim() : '';
      setJobIdInput(initialVal);
      initialJobId.current = initialVal.trim();
      setDateGiven(card.dateGiven ? new Date(card.dateGiven) : new Date());
      setNotes(card.notes || '');
    } else {
      setCardNo('');
      setRecipientName('');
      setRecipientPhone('');
      setRecipientAddress('');
      setOrderId(null);
      setJobIdInput('');
      initialJobId.current = '';
      setDateGiven(new Date());
      setNotes('');
    }
    setIsSubmitting(false);
  }, [card, isEditMode, allOrders]);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      const trimmedJobId = jobIdInput.trim();
      if (!trimmedJobId) {
        setOrderId(null);
        return;
      }

      if (trimmedJobId.toLowerCase() === initialJobId.current.toLowerCase()) {
        return;
      }

      try {
        const res = await getClientDetailsAction(trimmedJobId);
        if (res && res.success && res.client) {
          const client = res.client;
          setRecipientName(client.company_name);
          setRecipientPhone(client.phone_number);
          setRecipientAddress(client.address);

          const matchingOrder = allOrders.find(order => {
            const orderJobId = (order.companyName || '').split(' • ')[0].trim().toLowerCase();
            return orderJobId === client.id.toLowerCase() || (order.id || '').toLowerCase() === client.id.toLowerCase();
          });
          
          setOrderId(matchingOrder ? matchingOrder.id : null);
          return;
        }
      } catch (err) {
        console.error("Error fetching client details in Card Dialog:", err);
      }

      if (allOrders.length > 0) {
        const found = allOrders.find(order => {
          const displayId = (order.id || '').trim().toLowerCase();
          const companyPrefix = (order.companyName || '').split(' • ')[0].trim().toLowerCase();
          const inputLower = trimmedJobId.toLowerCase();
          return displayId === inputLower || companyPrefix === inputLower || displayId.includes(inputLower);
        });

        if (found) {
          setOrderId(found.id);
          const nameParts = (found.companyName || '').split(' • ');
          const actualName = nameParts.length > 1 ? nameParts.slice(1).join(' • ').trim() : found.companyName;
          
          setRecipientName(actualName);
          setRecipientPhone(found.phoneNumber);
          setRecipientAddress(found.address);
        } else {
          setOrderId(null);
        }
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [jobIdInput, allOrders, toast]);

  const isCardNoDuplicate = useMemo(() => {
    const proposed = cardNo.trim();
    if (!proposed) return false;
    return existingCards.some(c => 
      (!isEditMode || c.id !== card?.id) && 
      c.giftItemName && c.giftItemName.trim() === proposed
    );
  }, [cardNo, existingCards, isEditMode, card]);

  const canSubmit = useMemo(() => {
    if (isSubmitting) return false;
    if (isCardNoDuplicate) return false;
    if (!cardNo.trim()) return false;
    if (!recipientName.trim()) return false;
    if (!recipientPhone.trim()) return false;
    if (!recipientAddress.trim()) return false;
    if (!dateGiven) return false;
    return true;
  }, [isSubmitting, isCardNoDuplicate, cardNo, recipientName, recipientPhone, recipientAddress, dateGiven]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCardNoDuplicate) {
      toast({ title: "Validation Error", description: `Card number "${cardNo.trim()}" already exists. Duplicates are not allowed.`, variant: "destructive" });
      return;
    }
    if (!canSubmit) {
      toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const cardData: Omit<Card, 'id' | 'giftIdDisplay' | 'givenByUserId' | 'givenByUserName' | 'createdAt' | 'updatedAt' | 'giftItemName'> & { giftItemNames: string[] } = {
      giftItemNames: [cardNo.trim()],
      recipientName, recipientPhone, recipientAddress, orderId,
      dateGiven: dateGiven!.toISOString(),
      notes: notes.trim() || null,
    };

    let result: { success: boolean; gift?: Card; error?: string };
    if (isEditMode && card) {
      result = await updateGiftAction(card.id, cardData, currentUser);
    } else {
      result = await addGiftAction(cardData, currentUser);
    }

    setIsSubmitting(false);
    if (result.success) {
      toast({ title: `Card ${isEditMode ? 'Reissued' : 'Issued'}`, description: "The membership card record has been saved." });
      if (result.gift) onCardSaved(result.gift);
      onOpenChange(false);
    } else {
      toast({ title: "Error", description: result.error || "Could not save card record.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Reissue' : 'Issue'} Card</DialogTitle>
          <DialogDescription>
            {isEditMode ? `Update details for Issue ID: ${card.giftIdDisplay}` : 'Record a new card issued to a client.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="orderId">Job ID (Optional)</Label>
              <Input 
                id="orderId" 
                value={jobIdInput} 
                className="border-gray-400 dark:border-gray-600"
                onChange={e => setJobIdInput(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="recipientName">Cardholder</Label>
              <Input id="recipientName" value={recipientName} onChange={e => setRecipientName(e.target.value)} required className="border-gray-400 dark:border-gray-600" />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="recipientPhone">Phone</Label>
            <Input id="recipientPhone" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} required className="border-gray-400 dark:border-gray-600" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="recipientAddress">Address</Label>
            <Textarea id="recipientAddress" value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} required className="border-gray-400 dark:border-gray-600 min-h-[80px]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div className="space-y-1">
              <Label htmlFor="cardNo" className={cn(isCardNoDuplicate && "text-destructive")}>Card No.</Label>
              <Input
                id="cardNo"
                value={cardNo}
                onChange={handleCardNoChange}
                required
                maxLength={19}
                placeholder="XXXX XXXX XXXX XXXX"
                className={cn("font-card-no border-gray-400 dark:border-gray-600", isCardNoDuplicate && "border-destructive focus-visible:ring-destructive")}
              />
              {isCardNoDuplicate && (
                <p className="text-[11px] font-medium text-destructive mt-1">This card number is already registered.</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateGiven">Date Issued</Label>
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
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add any relevant notes..." className="border-gray-400 dark:border-gray-600 min-h-[100px]" />
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (isEditMode ? 'Reissue Card' : 'Issue Card')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
