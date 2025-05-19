
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { User, UserRole } from "@/types";

interface EditUserRoleDialogProps {
  user: User;
  currentUser: User; 
  onUserRoleUpdated: (userId: string, newRole: UserRole) => Promise<void>; // Changed to Promise<void>
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const ALL_USER_ROLES: UserRole[] = ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE"];

export function EditUserRoleDialog({ user, currentUser, onUserRoleUpdated, isOpen, onOpenChange }: EditUserRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedRole(user.role);
    }
  }, [user, isOpen]);

  const canChangeRole = () => {
    if (!currentUser) return false;
    if (currentUser.role === 'SYSTEM_ADMIN') return true; 
    if (currentUser.role === 'ADMIN') {
      if (currentUser.id === user.id) return false; 
      if (user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN') return false; 
      return true; 
    }
    return false;
  };
  const isRoleChangeAllowed = canChangeRole();

  const getAvailableRolesForSelection = (): UserRole[] => {
    if (currentUser.role === 'SYSTEM_ADMIN') return ALL_USER_ROLES; 
    if (currentUser.role === 'ADMIN') {
      if (user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN' || user.id === currentUser.id) {
        return [user.role];
      }
      return ['ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'];
    }
    return [user.role]; 
  };
  const availableRoles = getAvailableRolesForSelection();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRoleChangeAllowed) {
      // Toast should be handled by parent if needed, or here if this dialog was self-contained
      return;
    }
    if (selectedRole === user.role) {
        onOpenChange(false);
        return;
    }
    setIsSubmitting(true);
    try {
      await onUserRoleUpdated(user.id, selectedRole);
      // Parent (UsersPage) will handle toast and re-fetch
    } catch (error) {
      // Parent (UsersPage) should handle error toasts
      console.error("Error in EditUserRoleDialog handleSubmit:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* DialogTrigger is handled by parent controlling isOpen */}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User Role</DialogTitle>
          <DialogDescription>Change the role for {user.name} ({user.email}).</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">User</Label>
              <p className="col-span-3 font-medium">{user.name} ({user.email})</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role-edit" className="text-right">Role</Label>
              <Select 
                value={selectedRole} 
                onValueChange={(value) => setSelectedRole(value as UserRole)}
                disabled={!isRoleChangeAllowed || (availableRoles.length === 1 && availableRoles[0] === user.role) || isSubmitting}
              >
                <SelectTrigger id="role-edit" className="col-span-3">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map(r => (
                    <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isRoleChangeAllowed && (
              <p className="col-span-4 text-sm text-destructive text-center">
                {currentUser.role === 'ADMIN' && (currentUser.id === user.id) ? "Admins cannot change their own role." :
                 currentUser.role === 'ADMIN' && (user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN') ? `Admins cannot change ${user.role.replace(/_/g, ' ')} roles.` :
                 "You do not have permission to change this role."}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={!isRoleChangeAllowed || selectedRole === user.role || isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
