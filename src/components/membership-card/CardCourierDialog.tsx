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
import type { Card, User, ServiceCourierNoteItem } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Truck } from 'lucide-react';
import { transferGiftToCourierAction } from '@/app/(app)/membership-card/actions';
import { getCourierNotes } from '@/lib/service-options-service';
import { getGlobalSettings } from '@/lib/settings-service';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface CardCourierDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  card: Card | null;
  currentUser: User | null;
  onSuccess: (trackingCode: string, consignmentId: string) => void;
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};

export function CardCourierDialog({ isOpen, onOpenChange, card, currentUser, onSuccess }: CardCourierDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shippingArea, setShippingArea] = useState<string>('');
  const [shippingCharge, setShippingCharge] = useState<string>('0');
  const [editableRecipient, setEditableRecipient] = useState<string>('');
  const [editableAddress, setEditableAddress] = useState<string>('');
  const [courierNotesOptions, setCourierNotesOptions] = useState<ServiceCourierNoteItem[]>([]);
  const [courierNote, setCourierNote] = useState<string>('');
  const [isNoteVisible, setIsNoteVisible] = useState<boolean>(true);
  const isSystemAdmin = currentUser?.role === 'SYSTEM_ADMIN';
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      getGlobalSettings().then(settings => {
        setIsNoteVisible(settings.isCourierNoteVisible ?? true);
      }).catch(err => {
        console.error("Error loading settings:", err);
      });
      getCourierNotes().then(notes => {
        setCourierNotesOptions(notes);
      }).catch(err => {
        console.error("Error loading courier notes:", err);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && card) {
      setShippingArea('');
      setShippingCharge('0');
      setEditableRecipient(card.recipientName);
      setEditableAddress(card.recipientAddress);
      setCourierNote('');
    }
  }, [isOpen, card]);

  const handleConfirm = async () => {
    if (!card || !currentUser) return;

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
    const result = await transferGiftToCourierAction(
      card,
      currentUser,
      shippingArea,
      charge,
      editableRecipient !== card.recipientName ? editableRecipient : undefined,
      editableAddress !== card.recipientAddress ? editableAddress : undefined,
      courierNote || undefined
    );
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Transfer Successful",
        description: `Card ${card.giftIdDisplay} sent to Steadfast. Tracking: ${result.consignment.tracking_code}`,
      });
      onSuccess(result.consignment.tracking_code, result.consignment.consignment_id.toString());
      onOpenChange(false);
    } else {
      toast({
        title: "Transfer Failed",
        description: result.error || "Could not transfer card to courier.",
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
            <Truck className="h-6 w-6 text-primary" /> Transfer Membership Card to Courier
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will create a consignment in <span className="font-semibold text-foreground">SteadFast</span> for card <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{card?.giftIdDisplay}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {card && (
          <div className="text-sm text-foreground bg-secondary/50 p-4 rounded-md border border-border/50 space-y-3">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="recipient" className="text-right">Cardholder</Label>
              <Input
                id="recipient"
                value={editableRecipient}
                onChange={(e) => setEditableRecipient(e.target.value)}
                readOnly={!isSystemAdmin}
                className={cn("col-span-2 h-8", !isSystemAdmin && "bg-muted/50 cursor-not-allowed")}
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="phone" className="text-right">Phone</Label>
              <Input id="phone" value={card.recipientPhone} readOnly className="col-span-2 h-8 bg-muted/50 cursor-not-allowed" />
            </div>
            <div className="grid grid-cols-3 items-start gap-4">
              <Label htmlFor="address" className="text-right pt-2">Address</Label>
              <Textarea
                id="address"
                value={editableAddress}
                onChange={(e) => setEditableAddress(e.target.value)}
                readOnly={!isSystemAdmin}
                className={cn("col-span-2 text-xs", !isSystemAdmin && "bg-muted/50 cursor-not-allowed")}
                rows={2}
              />
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
            {isNoteVisible && (
              <div className="grid grid-cols-3 items-start gap-4">
                <Label htmlFor="predefined-note" className="text-right pt-2">Courier Note</Label>
                <div className="col-span-2 space-y-2">
                  <Select onValueChange={(val) => setCourierNote(val === 'none_selected' ? '' : val)}>
                    <SelectTrigger id="predefined-note" className="h-8">
                      <SelectValue placeholder="Choose a preset note (Optional)" />
                    </SelectTrigger>
                    <SelectContent className="max-w-[var(--radix-select-trigger-width)]">
                      <SelectItem value="none_selected">None / Clear Note</SelectItem>
                      {courierNotesOptions.map((note) => (
                        <SelectItem key={note.id} value={note.name} className="whitespace-normal break-words">
                          {note.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={courierNote}
                    onChange={(e) => setCourierNote(e.target.value)}
                    placeholder="Type or edit courier note..."
                    className="text-xs resize-none min-h-[70px]"
                    maxLength={480}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                    <span>Max 480 characters</span>
                    <span className={cn(courierNote.length >= 450 && "text-destructive font-semibold")}>
                      {courierNote.length}/480
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 items-center gap-4 mt-2 pt-2 border-t border-dashed">
              <Label className="text-right font-bold">Total COD</Label>
              <div className="col-span-2 font-bold text-base">
                {formatCurrency(parseFloat(shippingCharge) || 0)}
              </div>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isSubmitting || !card || !shippingArea}
          >
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Transferring...</> : "Confirm Transfer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
