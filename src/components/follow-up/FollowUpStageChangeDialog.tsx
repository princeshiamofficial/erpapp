
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Loader2 } from 'lucide-react';

interface FollowUpStageChangeDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: (notes: string) => void;
  oldStatus: string;
  newStatus: string;
  businessName: string;
}

export function FollowUpStageChangeDialog({ 
  isOpen, 
  onOpenChange, 
  onConfirm,
  oldStatus,
  newStatus,
  businessName
}: FollowUpStageChangeDialogProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    await onConfirm(notes);
    setIsSubmitting(false);
    setNotes('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reason for Stage Change</DialogTitle>
          <DialogDescription>
            Please provide any updates or notes for <span className="font-semibold text-foreground">{businessName}</span> as it moves to <span className="font-semibold text-primary">{newStatus}</span>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="flex items-center justify-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50 text-sm">
            <span className="text-muted-foreground">{oldStatus}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
            <span className="font-bold text-primary">{newStatus}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="follow-up-notes" className="text-sm font-medium">
              Activity Notes <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="follow-up-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Please describe the outcome of this follow-up..."
              className="resize-none min-h-[120px] shadow-[inset_0_2px_6px_rgba(0,0,0,0.1)] bg-slate-100/50 border-slate-200 focus-visible:ring-primary/20 transition-all rounded-xl p-4 text-sm"
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting || !notes.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Confirm Stage Change"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
