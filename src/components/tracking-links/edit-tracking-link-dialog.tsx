
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { TrackingLink, OrderStatus, OrderLogEntry, User } from "@/types";
import { useToast } from '@/hooks/use-toast';

interface EditTrackingLinkDialogProps {
  trackingLink: TrackingLink;
  currentUser: User;
  onTrackingLinkUpdated: (updatedLink: TrackingLink) => void;
  children: React.ReactNode;
}

const ALL_ORDER_STATUSES: OrderStatus[] = [
  "IDEA_SUBMITTED", "DESIGN_IN_PROGRESS", "PENDING_CLIENT_APPROVAL", 
  "CHANGES_REQUESTED", "APPROVED_FOR_PRODUCTION", "IN_PRODUCTION", 
  "QUALITY_CHECK", "SHIPPED", "DELIVERED", "CANCELLED", "ON_HOLD"
];

export function EditTrackingLinkDialog({ trackingLink, currentUser, onTrackingLinkUpdated, children }: EditTrackingLinkDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(trackingLink.isPublic);
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>(trackingLink.currentStatus);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setIsPublic(trackingLink.isPublic);
      setCurrentStatus(trackingLink.currentStatus);
    }
  }, [trackingLink, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedLink = { ...trackingLink, isPublic, currentStatus };
    let statusChanged = trackingLink.currentStatus !== currentStatus;
    let publicStatusChanged = trackingLink.isPublic !== isPublic;

    if (statusChanged) {
      const newLogEntry: OrderLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: currentStatus,
        changedByUserId: currentUser.id,
        changedByUserName: currentUser.name,
        notes: `Status changed to ${currentStatus.replace(/_/g, ' ')}.`,
      };
      updatedLink.statusHistory = [...trackingLink.statusHistory, newLogEntry];
    }
    
    if (publicStatusChanged) {
       const note = isPublic ? "Link set to Public." : "Link set to Private.";
        const publicStatusLogEntry: OrderLogEntry = {
            id: `log-public-${Date.now()}`,
            timestamp: new Date().toISOString(),
            status: updatedLink.currentStatus, // Keep current status
            changedByUserId: currentUser.id,
            changedByUserName: currentUser.name,
            notes: note,
        };
        // Add this log entry only if statusHistory was not already updated by a status change
        // Or, always add it if it's a distinct action. For simplicity, add it if public status changed.
        updatedLink.statusHistory = [...updatedLink.statusHistory, publicStatusLogEntry];
    }


    onTrackingLinkUpdated(updatedLink);
    toast({
      title: "Tracking Link Updated",
      description: `Link ${trackingLink.id} has been updated.`,
    });
    setIsOpen(false);
  };
  
  // Determine if the current user can edit fields. Admin, DR, and CRM can.
  const canEditFields = currentUser && ['ADMIN', 'DESIGNER_REPRESENTATIVE', 'CRM'].includes(currentUser.role);


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Tracking Link: {trackingLink.id}</DialogTitle>
          <DialogDescription>Order for: {trackingLink.customerName} ({trackingLink.companyName})</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="isPublic" className="flex flex-col space-y-1">
                <span>Publicly Accessible</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Allow clients and external stakeholders to view this tracking link.
                </span>
              </Label>
              <Switch
                id="isPublic"
                checked={isPublic}
                onCheckedChange={setIsPublic}
                disabled={!canEditFields}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="currentStatus">Order Status</Label>
               <Select 
                value={currentStatus} 
                onValueChange={(value) => setCurrentStatus(value as OrderStatus)}
                disabled={!canEditFields}
              >
                <SelectTrigger id="currentStatus">
                  <SelectValue placeholder="Select order status" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ORDER_STATUSES.map(status => (
                    <SelectItem key={status} value={status}>{status.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!canEditFields}>Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

