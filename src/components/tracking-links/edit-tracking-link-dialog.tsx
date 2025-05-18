
"use client";

import React, { useState, useEffect, useMemo } from 'react'; 
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea"; 
import type { TrackingLink, CustomStatus, User } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { updateTrackingLinkAction } from '@/app/(app)/tracking-links/actions'; 


interface EditTrackingLinkDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trackingLink: TrackingLink;
  currentUser: User;
  availableStatuses: CustomStatus[];
  onTrackingLinkUpdated: () => void; 
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
  const [statusNotes, setStatusNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setIsPublic(trackingLink.isPublic);
      setCurrentStatusId(trackingLink.currentStatus);
      setStatusNotes(''); 
    }
  }, [trackingLink, isOpen]);

  const displayableStatuses = useMemo(() => {
    if (!availableStatuses) return [];
    return availableStatuses.filter(status =>
      status.isVisible !== false || status.id === trackingLink.currentStatus
    );
  }, [availableStatuses, trackingLink.currentStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const updates: { isPublic?: boolean; currentStatus?: string; statusNotes?: string } = {};
    let statusChanged = false;

    if (isPublic !== trackingLink.isPublic) {
      updates.isPublic = isPublic;
    }
    if (currentStatusId !== trackingLink.currentStatus) {
      updates.currentStatus = currentStatusId;
      statusChanged = true;
    }

    if (statusChanged && statusNotes.trim()) {
      updates.statusNotes = statusNotes.trim();
    }


    if (Object.keys(updates).length === 0) {
      toast({ title: "No Changes", description: "No changes were made to the tracking link." });
      setIsSubmitting(false);
      onOpenChange(false); 
      return;
    }
    
    const result = await updateTrackingLinkAction(trackingLink.id, updates, currentUser);
    setIsSubmitting(false);

    if ('error' in result) {
      toast({ title: "Update Failed", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Tracking Link Updated", description: `Link ${trackingLink.id} has been updated.` });
      onTrackingLinkUpdated(); 
    }
  };
  
  const canEditFields = currentUser && ['ADMIN', 'SYSTEM_ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'].includes(currentUser.role);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-6">
        <DialogHeader>
          <DialogTitle>Edit Tracking Link: {trackingLink.id}</DialogTitle>
          <DialogDescription>Order for: {trackingLink.companyName} (Contact: {trackingLink.customerName || 'N/A'})</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
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

            <div className="space-y-3 p-3 bg-secondary/30 rounded-md border border-border/20">
              <div>
                <Label htmlFor="currentStatus">Order Status</Label>
                 <Select 
                  value={currentStatusId} 
                  onValueChange={(value) => setCurrentStatusId(value)}
                  disabled={!canEditFields || isSubmitting}
                >
                  <SelectTrigger id="currentStatus" className="mt-1">
                    <SelectValue placeholder="Select order status" />
                  </SelectTrigger>
                  <SelectContent>
                    {displayableStatuses.map(status => (
                      <SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>
                    ))}
                    {displayableStatuses.length === 0 && availableStatuses.length > 0 && (
                       <div className="p-2 text-sm text-muted-foreground text-center">No visible statuses available for selection.</div>
                    )}
                    {availableStatuses.length === 0 && (
                       <div className="p-2 text-sm text-muted-foreground text-center">Loading statuses...</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {currentStatusId !== trackingLink.currentStatus && ( 
                <div>
                  <Label htmlFor="statusNotes">Status Update Notes (Optional)</Label>
                  <Textarea
                    id="statusNotes"
                    placeholder="Add any relevant notes for this status change..."
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    className="mt-1 min-h-[80px]"
                    disabled={!canEditFields || isSubmitting}
                  />
                </div>
              )}
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
