
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { TrackingLink, CustomStatus, User } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { updateTrackingLinkAction } from '@/app/(app)/tracking-links/actions'; // Server action


interface EditTrackingLinkDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trackingLink: TrackingLink;
  currentUser: User;
  availableStatuses: CustomStatus[];
  onTrackingLinkUpdated: () => void; // Simplified callback
}

export function EditTrackingLinkDialog({ 
  isOpen, 
  onOpenChange, 
  trackingLink, 
  currentUser, 
  availableStatuses,
  onTrackingLinkUpdated 
}: EditTrackingLinkDialogProps) {
  const [isPublic, setIsPublic] = useState(trackingLink.isPublic);
  const [currentStatusId, setCurrentStatusId] = useState<string>(trackingLink.currentStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setIsPublic(trackingLink.isPublic);
      setCurrentStatusId(trackingLink.currentStatus);
    }
  }, [trackingLink, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const updates: { isPublic?: boolean; currentStatus?: string } = {};
    if (isPublic !== trackingLink.isPublic) {
      updates.isPublic = isPublic;
    }
    if (currentStatusId !== trackingLink.currentStatus) {
      updates.currentStatus = currentStatusId;
    }

    if (Object.keys(updates).length === 0) {
      toast({ title: "No Changes", description: "No changes were made to the tracking link." });
      setIsSubmitting(false);
      onOpenChange(false); // Close dialog
      return;
    }
    
    const result = await updateTrackingLinkAction(trackingLink.id, updates, currentUser);
    setIsSubmitting(false);

    if ('error' in result) {
      toast({ title: "Update Failed", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Tracking Link Updated", description: `Link ${trackingLink.id} has been updated.` });
      onTrackingLinkUpdated(); // Notify parent to refresh data
    }
  };
  
  const canEditFields = currentUser && ['ADMIN', 'DESIGNER_REPRESENTATIVE', 'CRM', 'SYSTEM_ADMIN'].includes(currentUser.role);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* DialogTrigger is now handled by the parent component */}
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle>Edit Tracking Link: {trackingLink.id}</DialogTitle>
          <DialogDescription>Order for: {trackingLink.customerName} ({trackingLink.companyName})</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="flex items-center justify-between space-x-2 p-3 bg-secondary/30 rounded-md border border-border/20">
              <Label htmlFor="isPublic" className="flex flex-col space-y-1 cursor-pointer">
                <span>Publicly Accessible</span>
                <span className="font-normal leading-snug text-muted-foreground text-xs">
                  Allow clients to view this tracking link.
                </span>
              </Label>
              <Switch
                id="isPublic"
                checked={isPublic}
                onCheckedChange={setIsPublic}
                disabled={!canEditFields || isSubmitting}
              />
            </div>

            <div className="space-y-1 p-3 bg-secondary/30 rounded-md border border-border/20">
              <Label htmlFor="currentStatus">Order Status</Label>
               <Select 
                value={currentStatusId} 
                onValueChange={(value) => setCurrentStatusId(value)}
                disabled={!canEditFields || isSubmitting}
              >
                <SelectTrigger id="currentStatus">
                  <SelectValue placeholder="Select order status" />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuses.map(status => (
                    <SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={!canEditFields || isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
