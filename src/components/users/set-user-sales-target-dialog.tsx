
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
import type { User } from "@/types";
import { Target } from 'lucide-react';

interface SetUserSalesTargetDialogProps {
  user: User;
  onTargetsSet: (userId: string, monthlyTarget: number, weeklyTarget: number) => Promise<boolean>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SetUserSalesTargetDialog({ user, onTargetsSet, isOpen, onOpenChange }: SetUserSalesTargetDialogProps) {
  const [monthlyTarget, setMonthlyTarget] = useState<string>('');
  const [weeklyTarget, setWeeklyTarget] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  // Toast is handled by UsersPage

  useEffect(() => {
    if (isOpen && user) {
      setMonthlyTarget((user.monthlyOrderTarget || 0).toString());
      setWeeklyTarget((user.weeklyOrderTarget || 0).toString());
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const monthly = parseInt(monthlyTarget, 10);
    const weekly = parseInt(weeklyTarget, 10);

    if (isNaN(monthly) || monthly < 0 || isNaN(weekly) || weekly < 0) {
      alert("Please enter valid positive numbers for both monthly and weekly targets.");
      return;
    }

    setIsLoading(true);
    await onTargetsSet(user.id, monthly, weekly); // Parent (UsersPage) handles outcome
    setIsLoading(false);
    // Parent (UsersPage) will close the dialog on success
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* DialogTrigger is handled by parent controlling isOpen */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Target className="mr-2 h-5 w-5 text-primary" /> Set Sales Targets for {user.name}
          </DialogTitle>
          <DialogDescription>
            Define the monthly and weekly order quantity targets for {user.email}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="monthlyTarget-set">Monthly Order Target</Label>
              <Input
                id="monthlyTarget-set"
                type="number"
                value={monthlyTarget}
                onChange={(e) => setMonthlyTarget(e.target.value)}
                placeholder="e.g., 100"
                min="0"
                step="1"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="weeklyTarget-set">Weekly Order Target</Label>
              <Input
                id="weeklyTarget-set"
                type="number"
                value={weeklyTarget}
                onChange={(e) => setWeeklyTarget(e.target.value)}
                placeholder="e.g., 25"
                min="0"
                step="1"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Set Targets"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
