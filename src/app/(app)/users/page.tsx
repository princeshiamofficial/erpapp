
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Edit, Trash2, KeyRound, UserCog, Target } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { User, UserRole } from "@/types";
import { MOCK_USERS, updateUserPassword, updateUserAvatarInMock, updateUserTargetsInMock } from "@/lib/auth-constants";
import Image from "next/image";
import { AddUserDialog } from '@/components/users/add-user-dialog';
import { EditUserRoleDialog } from '@/components/users/edit-user-role-dialog';
import { DeleteUserDialog } from '@/components/users/delete-user-dialog';
import { ChangePasswordDialog } from '@/components/users/change-password-dialog';
import { SetUserAvatarDialog } from '@/components/users/set-user-avatar-dialog';
import { SetUserSalesTargetDialog } from '@/components/users/set-user-sales-target-dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


export default function UsersPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setUsers([...MOCK_USERS]);
  }, []);


  useEffect(() => {
    if (currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM_ADMIN') {
      router.replace('/dashboard'); 
    }
  }, [currentUser, router]);

  const handleUserAdded = (newUser: User) => {
    if (!MOCK_USERS.find(u => u.id === newUser.id)) {
        MOCK_USERS.push(newUser);
    } else {
        const userIndex = MOCK_USERS.findIndex(u => u.id === newUser.id);
        if (userIndex !== -1) MOCK_USERS[userIndex] = newUser;
    }
    setUsers([...MOCK_USERS]);
  };

  const handleUserRoleUpdated = (updatedUser: User) => {
    const userIndex = MOCK_USERS.findIndex(u => u.id === updatedUser.id);
    if (userIndex !== -1) MOCK_USERS[userIndex].role = updatedUser.role;
    setUsers(prevUsers => prevUsers.map(u => u.id === updatedUser.id ? { ...u, role: updatedUser.role } : u));
  };

  const handleUserDeleted = (userId: string) => {
    const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
    if (userIndex !== -1) MOCK_USERS.splice(userIndex, 1);
    setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
  };

  const handlePasswordChanged = async (userId: string, newPassword: string): Promise<boolean> => {
    return updateUserPassword(userId, newPassword);
  };

  const handleUserAvatarSetByAdmin = async (userId: string, avatarUrl: string | null): Promise<boolean> => {
    const success = updateUserAvatarInMock(userId, avatarUrl);
    if (success) {
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === userId ? { ...u, avatarUrl: avatarUrl ?? undefined } : u
        )
      );
    }
    return success;
  };
  
  const handleUserTargetsSetByAdmin = async (userId: string, monthlyTarget: number, weeklyTarget: number): Promise<boolean> => {
    const success = updateUserTargetsInMock(userId, monthlyTarget, weeklyTarget);
    if (success) {
        setUsers(prevUsers => 
            prevUsers.map(u => 
                u.id === userId ? { ...u, monthlyOrderTarget: monthlyTarget, weeklyOrderTarget: weeklyTarget } : u
            )
        );
    }
    return success;
  };

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
  }
  
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.companyName && user.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [users, searchTerm]);

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM_ADMIN')) {
    return <div className="p-6">Access Denied. You must be an administrator to view this page.</div>;
  }
  
  const canCurrentUserEditRoleOf = (targetUser: User): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'SYSTEM_ADMIN') return true;
    if (currentUser.role === 'ADMIN') {
      // Admin cannot edit own role, other Admin roles, or System Admin roles
      return !(currentUser.id === targetUser.id || targetUser.role === 'ADMIN' || targetUser.role === 'SYSTEM_ADMIN');
    }
    return false;
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions.
          </p>
        </div>
        <AddUserDialog onUserAdded={handleUserAdded} currentUser={currentUser}>
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-md hover:shadow-lg transition-shadow">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New User
          </Button>
        </AddUserDialog>
      </div>
      
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <CardTitle className="text-card-foreground text-xl">All Users</CardTitle>
             <div className="relative w-full sm:max-w-sm">
                <Input 
                    placeholder="Search users (name, email, role, company)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-background h-10 rounded-md shadow-sm"
                />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Avatar</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="pr-6 text-right min-w-[280px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="pl-6">
                      <Avatar className="h-10 w-10 border border-border/70 shadow-sm">
                        <AvatarImage src={user.avatarUrl || `https://placehold.co/40x40.png?text=${getInitials(user.name)}`} alt={user.name} data-ai-hint="user face" />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                       <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                        user.role === 'SYSTEM_ADMIN' ? 'bg-red-500/20 text-red-700 border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20' :
                        user.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-700 border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/20' :
                        user.role === 'CRM' ? 'bg-blue-500/20 text-blue-700 border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20' :
                        user.role === 'DESIGNER_REPRESENTATIVE' ? 'bg-green-500/20 text-green-700 border-green-500/30 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/20' : 
                        'bg-gray-500/20 text-gray-700 border-gray-500/30 dark:bg-gray-500/10 dark:text-gray-300 dark:border-gray-500/20'
                      }`}>
                        {user.role.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.companyName || 'N/A'}</TableCell>
                    <TableCell className="pr-6 text-right space-x-1.5 whitespace-nowrap">
                      <SetUserAvatarDialog user={user} onAvatarChanged={handleUserAvatarSetByAdmin}>
                        <Button variant="outline" size="sm" title="Set Avatar" className="table-action-button h-9 px-3"><UserCog className="h-4 w-4" /></Button>
                      </SetUserAvatarDialog>
                      <ChangePasswordDialog user={user} onPasswordChanged={handlePasswordChanged}>
                        <Button variant="outline" size="sm" title="Change Password" className="table-action-button h-9 px-3"><KeyRound className="h-4 w-4" /></Button>
                      </ChangePasswordDialog>
                      <EditUserRoleDialog user={user} currentUser={currentUser} onUserRoleUpdated={handleUserRoleUpdated}>
                        <Button variant="outline" size="sm" title="Edit Role" className="table-action-button h-9 px-3" disabled={!canCurrentUserEditRoleOf(user)}><Edit className="h-4 w-4" /></Button>
                      </EditUserRoleDialog>
                      {user.role === 'CRM' && (
                        <SetUserSalesTargetDialog user={user} onTargetsSet={handleUserTargetsSetByAdmin}>
                            <Button variant="outline" size="sm" title="Set Sales Targets" className="table-action-button h-9 px-3"><Target className="h-4 w-4"/></Button>
                        </SetUserSalesTargetDialog>
                      )}
                      {currentUser.id !== user.id && !(user.role === 'SYSTEM_ADMIN' && currentUser.role !== 'SYSTEM_ADMIN') && (
                        <DeleteUserDialog user={user} onUserDeleted={handleUserDeleted}>
                           <Button variant="destructive" size="sm" title="Delete User" className="table-action-button h-9 px-3"><Trash2 className="h-4 w-4" /></Button>
                        </DeleteUserDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                 {filteredUsers.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                             <Image src="https://placehold.co/240x180.png" alt="No users" data-ai-hint="empty state users" width={180} height={135} className="mx-auto rounded-md opacity-50 mb-4" />
                            <p className="text-lg text-muted-foreground font-medium">
                              {searchTerm ? "No users match your search." : "No users found."}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {searchTerm ? "Try a different search term." : "Add users to manage them here."}
                            </p>
                        </TableCell>
                    </TableRow>
                 )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

