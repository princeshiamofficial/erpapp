
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';

interface SetSalesTargetDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentTarget: number;
  onSetTarget: (newTarget: number) => void;
}

export function SetSalesTargetDialog({ 
  isOpen, 
  onOpenChange, 
  currentTarget, 
  onSetTarget 
}: SetSalesTargetDialogProps) {
  const [targetAmount, setTargetAmount] = useState<string>(currentTarget.toString());
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setTargetAmount(currentTarget.toString());
    }
  }, [isOpen, currentTarget]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTarget = parseFloat(targetAmount);
    if (isNaN(newTarget) || newTarget < 0) {
      toast({
        title: "Invalid Target",
        description: "Please enter a valid positive number for the sales target.",
        variant: "destructive",
      });
      return;
    }
    onSetTarget(newTarget);
    toast({
      title: "Sales Target Updated",
      description: `Monthly sales target set to $${newTarget.toLocaleString()}.`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Monthly Sales Target</DialogTitle>
          <DialogDescription>
            Enter the new monthly sales target amount. This will be visible on the dashboard.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="targetAmount">Target Amount ($)</Label>
              <Input
                id="targetAmount"
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="e.g., 50000"
                min="0"
                step="100"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Set Target</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
