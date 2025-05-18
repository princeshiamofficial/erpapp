
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
import { useToast } from '@/hooks/use-toast';
import { updateUserInfoAction } from '@/app/(app)/users/actions';
import { Edit3 } from 'lucide-react';

interface EditUserInfoDialogProps {
  user: User;
  onUserInfoUpdated: () => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function EditUserInfoDialog({ user, onUserInfoUpdated, isOpen, onOpenChange }: EditUserInfoDialogProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [companyName, setCompanyName] = useState(user.companyName || '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name);
      setEmail(user.email);
      setCompanyName(user.companyName || '');
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and Email are required.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const updates = {
      name: name.trim(),
      email: email.trim(),
      companyName: companyName.trim() || null,
    };

    const result = await updateUserInfoAction(user.id, updates);
    setIsLoading(false);

    if (result.success) {
      toast({
        title: "User Info Updated",
        description: `${user.name}'s information has been updated.`,
      });
      onUserInfoUpdated();
      onOpenChange(false); // Close dialog on success
    } else {
      toast({
        title: "Update Failed",
        description: result.error || "Could not update user information. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit3 className="mr-2 h-5 w-5 text-primary" /> Edit User Information
          </DialogTitle>
          <DialogDescription>
            Update details for {user?.name} ({user?.email}).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="userName-edit">Name</Label>
              <Input
                id="userName-edit"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="userEmail-edit">Email</Label>
              <Input
                id="userEmail-edit"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="userCompany-edit">Company Name (Optional)</Label>
              <Input
                id="userCompany-edit"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
