
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TrackingLink, User, CustomStatus } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { assignDrToOrderAction } from '@/app/(app)/orders/actions'; 
import { getUsers } from '@/lib/user-service'; // Import getUsers
import { Loader2 } from 'lucide-react';

interface AssignDrDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  order: TrackingLink;
  currentUser: User;
  allStatuses: CustomStatus[];
  onDrAssigned: (updatedOrder: TrackingLink) => void;
}

export function AssignDrDialog({ isOpen, onOpenChange, order, currentUser, allStatuses, onDrAssigned }: AssignDrDialogProps) {
  const [selectedDrId, setSelectedDrId] = useState<string>(order.designerRepresentativeId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [designerReps, setDesignerReps] = useState<User[]>([]);
  const [isLoadingDrs, setIsLoadingDrs] = useState(true);
  const { toast } = useToast();
  
  const readyForDesignStatus = allStatuses.find(s => s.name.toLowerCase() === 'ready for design');

  useEffect(() => {
    if (isOpen) {
      setSelectedDrId(order.designerRepresentativeId || '');
      const fetchDrs = async () => {
        setIsLoadingDrs(true);
        try {
          const allUsers = await getUsers();
          const drs = allUsers.filter(user => user.role === 'DESIGNER_REPRESENTATIVE');
          setDesignerReps(drs);
        } catch (error) {
          console.error("Failed to fetch designer representatives:", error);
          toast({ title: "Error", description: "Could not load designer representatives.", variant: "destructive" });
          setDesignerReps([]);
        } finally {
          setIsLoadingDrs(false);
        }
      };
      fetchDrs();
    }
  }, [isOpen, order.designerRepresentativeId, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrId) {
      toast({ title: "Validation Error", description: "Please select a Designer Representative.", variant: "destructive" });
      return;
    }
    if (!readyForDesignStatus) {
      toast({ title: "Configuration Error", description: "'Ready for Design' status not found.", variant: "destructive" });
      return;
    }

    const selectedDr = designerReps.find(dr => dr.id === selectedDrId);
    if (!selectedDr) {
      toast({ title: "Error", description: "Selected Designer Representative not found.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const result = await assignDrToOrderAction(
      order.id,
      selectedDr.id,
      selectedDr.name,
      currentUser,
      readyForDesignStatus.id
    );
    setIsSubmitting(false);

    if ('error' in result) {
      toast({ title: "Assignment Failed", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "DR Assigned", description: `${selectedDr.name} has been assigned to order ${order.id}.` });
      onDrAssigned(result);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Designer Representative</DialogTitle>
          <DialogDescription>
            Assign order <span className="font-semibold">{order.id}</span> for <span className="font-semibold">{order.customerName}</span> to a Designer Representative.
            The status will be set to "Ready for Design".
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="drSelect">Designer Representative</Label>
              {isLoadingDrs ? (
                <div className="flex items-center justify-center h-10 border rounded-md">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select value={selectedDrId} onValueChange={setSelectedDrId} required>
                  <SelectTrigger id="drSelect">
                    <SelectValue placeholder="Select a DR" />
                  </SelectTrigger>
                  <SelectContent>
                    {designerReps.map(dr => (
                      <SelectItem key={dr.id} value={dr.id}>{dr.name} ({dr.email})</SelectItem>
                    ))}
                    {designerReps.length === 0 && <p className="p-2 text-sm text-muted-foreground">No Designer Reps found.</p>}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || isLoadingDrs || designerReps.length === 0 || !readyForDesignStatus}>
              {isSubmitting ? "Assigning..." : "Assign DR"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
