
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
  currentUser: User;
  onUserRoleUpdated: (updatedUser: {id: string, role: UserRole}) => Promise<void>; // Changed signature
  children: React.ReactNode;
}

const ALL_USER_ROLES: UserRole[] = ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE"];

export function EditUserRoleDialog({ user, currentUser, onUserRoleUpdated, children }: EditUserRoleDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setSelectedRole(user.role);
    }
  }, [user, isOpen]);

  const canChangeRole = () => {
    if (!currentUser) return false;
    if (currentUser.role === 'SYSTEM_ADMIN') return true;
    if (currentUser.role === 'ADMIN') {
      if (currentUser.id === user.id) return false; // Admin cannot change their own role
      if (user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN') return false; // Admin cannot change other Admins or System Admins
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
      // Admins can assign/change to ADMIN, CRM, DESIGNER_REPRESENTATIVE for non-admin/sysadmin users
      return ['ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'];
    }
    return [user.role]; 
  };

  const availableRoles = getAvailableRolesForSelection();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRoleChangeAllowed) {
      toast({
        title: "Permission Denied",
        description: "You do not have permission to change this user's role.",
        variant: "destructive",
      });
      return;
    }
    if (selectedRole === user.role) {
        setIsOpen(false);
        return;
    }
    setIsSubmitting(true);
    try {
      await onUserRoleUpdated({ id: user.id, role: selectedRole });
      // Toast is handled in UsersPage after successful fetch
      setIsOpen(false);
    } catch (error) {
      console.error("Error updating user role:", error);
      toast({ title: "Error", description: "Could not update user role.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
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
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={!isRoleChangeAllowed || selectedRole === user.role || isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
