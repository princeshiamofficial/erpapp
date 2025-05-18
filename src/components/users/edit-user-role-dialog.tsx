
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
  currentUser: User; // The currently logged-in user performing the action
  onUserRoleUpdated: (updatedUser: {id: string, role: UserRole}) => Promise<void>;
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

  // Determines if the currentUser has permission to change the target 'user's role.
  const canChangeRole = () => {
    if (!currentUser) return false;
    
    // System Admin can change any user's role.
    if (currentUser.role === 'SYSTEM_ADMIN') return true; 
    
    if (currentUser.role === 'ADMIN') {
      // Admin cannot change their own role.
      if (currentUser.id === user.id) return false; 
      // Admin cannot change other Admins or System Admins.
      if (user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN') return false; 
      // Admin can change CRM or DR roles.
      return true; 
    }
    // Other roles (CRM, DR) cannot change roles.
    return false;
  };

  const isRoleChangeAllowed = canChangeRole();

  // Determines which roles are available in the dropdown for the currentUser to assign.
  const getAvailableRolesForSelection = (): UserRole[] => {
    // System Admin can assign any role.
    if (currentUser.role === 'SYSTEM_ADMIN') return ALL_USER_ROLES; 
    
    if (currentUser.role === 'ADMIN') {
      // If the user being edited is an Admin or System Admin, or if the Admin is editing themselves,
      // effectively, no change is allowed by an Admin, so only show the current role.
      if (user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN' || user.id === currentUser.id) {
        return [user.role];
      }
      // An Admin can change a CRM/DR to ADMIN, CRM, or DESIGNER_REPRESENTATIVE.
      return ['ADMIN', 'CRM', 'DESIGNER_REPRESENTATIVE'];
    }
    // For other current user roles (CRM, DR), or if no specific permissions, show only current role of target user.
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
