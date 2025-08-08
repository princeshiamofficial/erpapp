
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Lead, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { transferLeadAction } from '@/app/(app)/pipeline/actions';
import { Loader2, Users } from 'lucide-react';

interface TransferLeadDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onLeadTransferred: () => void;
  lead: Lead | null;
  allCrmUsers: User[];
  currentUser: User | null;
}

export function TransferLeadDialog({ isOpen, onOpenChange, onLeadTransferred, lead, allCrmUsers, currentUser }: TransferLeadDialogProps) {
  const [newCrmId, setNewCrmId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !newCrmId || !currentUser) {
      toast({ title: "Error", description: "Missing required information for transfer.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    const result = await transferLeadAction(lead.id, newCrmId, currentUser);
    setIsSubmitting(false);

    if (result.success) {
      const newCrmName = allCrmUsers.find(u => u.id === newCrmId)?.name || 'the new user';
      toast({ title: "Lead Transferred", description: `Lead for "${lead.contactName}" has been transferred to ${newCrmName}.` });
      onLeadTransferred();
    } else {
      toast({ title: "Transfer Failed", description: result.error || "Could not transfer lead.", variant: "destructive" });
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Transfer Lead</DialogTitle>
          <DialogDescription>
            Re-assign lead for <span className="font-semibold">{lead.contactName}</span> from <span className="font-semibold">{lead.crmName}</span> to a new CRM.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="new-crm-owner">New CRM Owner *</Label>
            <Select value={newCrmId} onValueChange={setNewCrmId} required>
              <SelectTrigger id="new-crm-owner">
                <SelectValue placeholder="Select a new CRM user..." />
              </SelectTrigger>
              <SelectContent>
                {allCrmUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name} ({user.email})</SelectItem>
                ))}
                {allCrmUsers.length === 0 && <div className="p-2 text-center text-sm text-muted-foreground">No other CRMs to transfer to.</div>}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !newCrmId}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Transferring...</> : "Confirm Transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
