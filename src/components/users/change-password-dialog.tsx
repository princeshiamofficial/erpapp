
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { User } from "@/types";
import { useToast } from '@/hooks/use-toast';
import { KeyRound } from 'lucide-react';

interface ChangePasswordDialogProps {
  user: User;
  onPasswordChanged: (userId: string, newPassword: string) => Promise<boolean>;
  children: React.ReactNode; 
}

export function ChangePasswordDialog({ user, onPasswordChanged, children }: ChangePasswordDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Both password fields are required.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 6) { 
        toast({
            title: "Validation Error",
            description: "Password must be at least 6 characters long.",
            variant: "destructive",
        });
        return;
    }

    setIsLoading(true);
    const success = await onPasswordChanged(user.id, newPassword);
    setIsLoading(false);

    if (success) {
      toast({
        title: "Password Updated",
        description: `Password for ${user.name} has been updated successfully.`,
      });
      setIsOpen(false);
    } else {
      toast({
        title: "Update Failed",
        description: "Could not update the password. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <KeyRound className="mr-2 h-5 w-5 text-primary" /> Change Password for {user.name}
          </DialogTitle>
          <DialogDescription>
            Enter a new password for {user.email}. The user will need to use this new password to log in.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="newPassword-change">New Password</Label>
              <Input
                id="newPassword-change"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword-change">Confirm New Password</Label>
              <Input
                id="confirmPassword-change"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Set New Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
