
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Edit, Trash2, KeyRound, UserCog } from "lucide-react"; // Added UserCog
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { User, UserRole } from "@/types";
import { MOCK_USERS, updateUserPassword, updateUserAvatarInMock } from "@/lib/auth-constants"; // Imported updateUserAvatarInMock
import Image from "next/image";
import { AddUserDialog } from '@/components/users/add-user-dialog';
import { EditUserRoleDialog } from '@/components/users/edit-user-role-dialog';
import { DeleteUserDialog } from '@/components/users/delete-user-dialog';
import { ChangePasswordDialog } from '@/components/users/change-password-dialog';
import { SetUserAvatarDialog } from '@/components/users/set-user-avatar-dialog'; // Added
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


export default function UsersPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Refresh users from MOCK_USERS in case of external changes (like avatar updates)
    // This ensures the user list reflects the latest state from the mock "database"
    setUsers([...MOCK_USERS]);
  }, [MOCK_USERS]);


  useEffect(() => {
    if (currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM_ADMIN') {
      router.replace('/dashboard'); 
    }
  }, [currentUser, router]);

  const handleUserAdded = (newUser: User) => {
    // MOCK_USERS is mutated by AddUserDialog's call to onUserAdded which uses this.
    // So we just need to update local state for re-render.
    // In a real app, MOCK_USERS would be updated via API, and then we'd refetch or update local state.
    // For this mock, directly adding to MOCK_USERS (if not already done by underlying logic)
    // and then updating local state.
    
    // Check if user already exists in MOCK_USERS by ID to prevent duplicates if logic changes
    if (!MOCK_USERS.find(u => u.id === newUser.id)) {
        MOCK_USERS.push(newUser);
    } else {
        // If user exists, update it. This might happen if add logic is more complex
        const userIndex = MOCK_USERS.findIndex(u => u.id === newUser.id);
        if (userIndex !== -1) MOCK_USERS[userIndex] = newUser;
    }
    setUsers([...MOCK_USERS]); // Ensure re-render with fresh MOCK_USERS
  };

  const handleUserRoleUpdated = (updatedUser: User) => {
    const userIndex = MOCK_USERS.findIndex(u => u.id === updatedUser.id);
    if (userIndex !== -1) MOCK_USERS[userIndex].role = updatedUser.role;
    setUsers(prevUsers => prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleUserDeleted = (userId: string) => {
    const userIndex = MOCK_USERS.findIndex(u => u.id === userId);
    if (userIndex !== -1) MOCK_USERS.splice(userIndex, 1);
    setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
  };

  const handlePasswordChanged = async (userId: string, newPassword: string): Promise<boolean> => {
    return updateUserPassword(userId, newPassword);
    // No need to setUsers here as password is not displayed and MOCK_USERS is mutated directly
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


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions.
          </p>
        </div>
        <AddUserDialog onUserAdded={handleUserAdded}>
          <Button size="lg">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New User
          </Button>
        </AddUserDialog>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>List of all registered users in TrackFlow.</CardDescription>
           <div className="mt-4">
            <Input 
              placeholder="Search users (name, email, role, company)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Avatar</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatarUrl || `https://placehold.co/40x40.png?text=${getInitials(user.name)}`} alt={user.name} data-ai-hint="user face" />
                        <AvatarFallback className="bg-primary/20 text-primary">{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                       <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.role === 'SYSTEM_ADMIN' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                        user.role === 'CRM' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        user.role === 'DESIGNER_REPRESENTATIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {user.role.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.companyName || 'N/A'}</TableCell>
                    <TableCell className="space-x-1 whitespace-nowrap text-right">
                      <SetUserAvatarDialog user={user} onAvatarChanged={handleUserAvatarSetByAdmin}>
                        <Button variant="outline" size="sm" title="Set Avatar"><UserCog className="h-4 w-4" /></Button>
                      </SetUserAvatarDialog>
                      <ChangePasswordDialog user={user} onPasswordChanged={handlePasswordChanged}>
                        <Button variant="outline" size="sm" title="Change Password"><KeyRound className="h-4 w-4" /></Button>
                      </ChangePasswordDialog>
                      <EditUserRoleDialog user={user} onUserRoleUpdated={handleUserRoleUpdated}>
                        <Button variant="outline" size="sm" title="Edit Role"><Edit className="h-4 w-4" /></Button>
                      </EditUserRoleDialog>
                      {/* Prevent deleting self or system admin if current user is not system admin */}
                      {currentUser.id !== user.id && !(user.role === 'SYSTEM_ADMIN' && currentUser.role !== 'SYSTEM_ADMIN') && (
                        <DeleteUserDialog user={user} onUserDeleted={handleUserDeleted}>
                           <Button variant="destructive" size="sm" title="Delete User" className="text-destructive-foreground hover:bg-destructive/90"><Trash2 className="h-4 w-4" /></Button>
                        </DeleteUserDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                 {filteredUsers.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center py-10">
                             <Image src="https://placehold.co/300x200.png" alt="No users" data-ai-hint="empty state users" width={300} height={200} className="mx-auto rounded-md" />
                            <p className="mt-4 text-muted-foreground">
                              {searchTerm ? "No users match your search." : "No users found. Add users to manage them here."}
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
