"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Gift, User, ServiceGiftItem, TrackingLink } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { addGiftAction, updateGiftAction } from '@/app/(app)/membership-card/actions';
import { getClientDetailsAction } from '@/app/(app)/orders/actions';
import { Loader2, ChevronsUpDown, Check, Calendar as CalendarIcon, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from '@/components/ui/badge';

interface AddEditCardDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onGiftSaved: (gift: Gift) => void;
  gift?: Gift | null;
  currentUser: User;
  giftOptions: ServiceGiftItem[];
  allOrders: TrackingLink[];
}

export function AddEditCardDialog({ isOpen, onOpenChange, onGiftSaved, gift, currentUser, giftOptions, allOrders }: AddEditCardDialogProps) {
  const [selectedGiftItems, setSelectedGiftItems] = useState<string[]>([]);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [dateGiven, setDateGiven] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGiftPopoverOpen, setIsGiftPopoverOpen] = useState(false);
  const [jobIdInput, setJobIdInput] = useState('');
  const { toast } = useToast();
  const initialJobId = useRef('');

  const isEditMode = !!gift;

  const resetForm = useCallback(() => {
    if (gift && isEditMode) {
      setSelectedGiftItems(Array.isArray(gift.giftItemNames) ? gift.giftItemNames : (gift.giftItemName ? [gift.giftItemName] : []));
      setRecipientName(gift.recipientName);
      setRecipientPhone(gift.recipientPhone);
      setRecipientAddress(gift.recipientAddress);
      setOrderId(gift.orderId || null);
      const matchedOrder = gift.orderId ? allOrders.find(o => o.id === gift.orderId) : null;
      const initialVal = matchedOrder ? (matchedOrder.companyName || '').split(' • ')[0].trim() : '';
      setJobIdInput(initialVal);
      initialJobId.current = initialVal.trim();
      setDateGiven(gift.dateGiven ? new Date(gift.dateGiven) : new Date());
      setNotes(gift.notes || '');
    } else {
      setSelectedGiftItems([]);
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
  }, [gift, isEditMode, allOrders]);

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

          toast({
            title: "Existing Client Found",
            description: `Details for "${trimmedJobId}" have been auto-filled from clients database.`,
          });
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

          toast({
            title: "Active Job Found",
            description: `Details for "${trimmedJobId}" have been auto-filled from active jobs.`,
          });
        } else {
          setOrderId(null);
        }
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [jobIdInput, allOrders, toast]);

  const canSubmit = useMemo(() => {
    if (isSubmitting) return false;
    if (selectedGiftItems.length === 0) return false;
    if (!recipientName.trim()) return false;
    if (!recipientPhone.trim()) return false;
    if (!recipientAddress.trim()) return false;
    if (!dateGiven) return false;
    return true;
  }, [isSubmitting, selectedGiftItems, recipientName, recipientPhone, recipientAddress, dateGiven]);

  const handleGiftSelect = (itemName: string) => {
    setSelectedGiftItems(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(itemName)) {
        newSelection.delete(itemName);
      } else {
        newSelection.add(itemName);
      }
      return Array.from(newSelection);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const giftData: Omit<Gift, 'id' | 'giftIdDisplay' | 'givenByUserId' | 'givenByUserName' | 'createdAt' | 'updatedAt' | 'giftItemName'> & { giftItemNames: string[] } = {
      giftItemNames: selectedGiftItems,
      recipientName, recipientPhone, recipientAddress, orderId,
      dateGiven: dateGiven!.toISOString(),
      notes: notes.trim() || null,
    };

    let result: { success: boolean; gift?: Gift; error?: string };
    if (isEditMode && gift) {
      result = await updateGiftAction(gift.id, giftData, currentUser);
    } else {
      result = await addGiftAction(giftData, currentUser);
    }

    setIsSubmitting(false);
    if (result.success) {
      toast({ title: `Card ${isEditMode ? 'Updated' : 'Issued'}`, description: "The membership card record has been saved." });
      if (result.gift) onGiftSaved(result.gift);
      onOpenChange(false);
    } else {
      toast({ title: "Error", description: result.error || "Could not save card record.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Issue'} Card</DialogTitle>
          <DialogDescription>
            {isEditMode ? `Update details for Issue ID: ${gift.giftIdDisplay}` : 'Record a new card issued to a client.'}
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
              <Label htmlFor="recipientName">Cardholder Name</Label>
              <Input id="recipientName" value={recipientName} onChange={e => setRecipientName(e.target.value)} required className="border-gray-400 dark:border-gray-600" />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="recipientPhone">Cardholder Phone</Label>
            <Input id="recipientPhone" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} required className="border-gray-400 dark:border-gray-600" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="recipientAddress">Cardholder Address</Label>
            <Textarea id="recipientAddress" value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} required className="border-gray-400 dark:border-gray-600 min-h-[80px]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div className="space-y-1">
              <Label>Card No.</Label>
              {selectedGiftItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-muted/50 min-h-[40px]">
                  {selectedGiftItems.map((item, idx) => (
                    <Badge key={`${item}-${idx}`} variant="secondary" className="gap-1.5 py-1">
                      {item}
                      <button type="button" onClick={() => handleGiftSelect(item)} className="rounded-full hover:bg-destructive/20 p-0.5 transition-colors">
                        <X className="h-3 w-3 text-destructive" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Popover open={isGiftPopoverOpen} onOpenChange={setIsGiftPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={isGiftPopoverOpen} className="w-full justify-between">
                    <span className="truncate">{selectedGiftItems.length > 0 ? "Add/Remove Card No..." : "Select Card No..."}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search Card No..." />
                    <CommandList>
                      <CommandEmpty>No cards found.</CommandEmpty>
                      <CommandGroup>
                        {giftOptions.map((option, idx) => (
                          <CommandItem key={`${option.id}-${idx}`} value={option.name} onSelect={() => handleGiftSelect(option.name)} className="cursor-pointer">
                            <Check className={cn("mr-2 h-4 w-4", selectedGiftItems.includes(option.name) ? "opacity-100" : "opacity-0")} />
                            {option.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (isEditMode ? 'Save Changes' : 'Issue Card')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
