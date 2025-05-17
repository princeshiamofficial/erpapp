
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
  currentUser: User; // Add currentUser to determine permissions
  onUserRoleUpdated: (updatedUser: User) => void;
  children: React.ReactNode;
}

const ALL_USER_ROLES: UserRole[] = ["SYSTEM_ADMIN", "ADMIN", "CRM", "DESIGNER_REPRESENTATIVE"];

export function EditUserRoleDialog({ user, currentUser, onUserRoleUpdated, children }: EditUserRoleDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setSelectedRole(user.role);
    }
  }, [user, isOpen]);

  const canChangeRole = () => {
    if (!currentUser) return false;

    // System Admin can change anyone's role
    if (currentUser.role === 'SYSTEM_ADMIN') {
      return true;
    }

    // Admin specific restrictions
    if (currentUser.role === 'ADMIN') {
      // Admin cannot change their own role
      if (currentUser.id === user.id) {
        return false;
      }
      // Admin cannot change another Admin's role
      if (user.role === 'ADMIN') {
        return false;
      }
      // Admin cannot change a System Admin's role
      if (user.role === 'SYSTEM_ADMIN') {
        return false;
      }
      // Admins can change CRM or DR roles
      return true;
    }
    
    // Other roles (CRM, DR) cannot change any roles by default (this dialog likely won't be opened for them)
    return false;
  };

  const isRoleChangeAllowed = canChangeRole();

  const getAvailableRolesForSelection = (): UserRole[] => {
    if (currentUser.role === 'SYSTEM_ADMIN') {
      return ALL_USER_ROLES;
    }
    if (currentUser.role === 'ADMIN') {
      // Admins can only assign CRM or DR roles
      // And they cannot edit roles of other Admins or System Admins
      if (user.role === 'ADMIN' || user.role === 'SYSTEM_ADMIN' || user.id === currentUser.id) {
        return [user.role]; // Only allow selecting the current role (effectively disabling change)
      }
      return ['CRM', 'DESIGNER_REPRESENTATIVE'];
    }
    return [user.role]; // Default to only current role if no permissions
  };

  const availableRoles = getAvailableRolesForSelection();

  const handleSubmit = (e: React.FormEvent) => {
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
          <DialogDescription>Change the role for {user.name} ({user.email}).</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">User</Label>
              <p className="col-span-3 font-medium">{user.name} ({user.email})</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">Role</Label>
              <Select 
                value={selectedRole} 
                onValueChange={(value) => setSelectedRole(value as UserRole)}
                disabled={!isRoleChangeAllowed || (availableRoles.length === 1 && availableRoles[0] === user.role)}
              >
                <SelectTrigger className="col-span-3">
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
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!isRoleChangeAllowed || selectedRole === user.role}>Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
