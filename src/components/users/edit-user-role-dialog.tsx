
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { User, UserRole } from "@/types";
import { useToast } from '@/hooks/use-toast';

interface EditUserRoleDialogProps {
  user: User;
  onUserRoleUpdated: (updatedUser: User) => void;
  children: React.ReactNode;
}

const USER_ROLES: UserRole[] = ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE"];

export function EditUserRoleDialog({ user, onUserRoleUpdated, children }: EditUserRoleDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
  const { toast } = useToast();

  useEffect(() => {
    setSelectedRole(user.role);
  }, [user, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser = { ...user, role: selectedRole };
    onUserRoleUpdated(updatedUser);
    toast({
      title: "User Role Updated",
      description: `${user.name}'s role has been updated to ${selectedRole.replace(/_/g, ' ')}.`,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User Role</DialogTitle>
          <DialogDescription>Change the role for {user.name}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">User</Label>
              <p className="col-span-3 font-medium">{user.name} ({user.email})</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">Role</Label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map(r => (
                    <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
