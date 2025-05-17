
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Edit, Trash2, KeyRound } from "lucide-react"; // Added KeyRound
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { User, UserRole } from "@/types";
import { MOCK_USERS, updateUserPassword } from "@/lib/auth-constants"; // Imported updateUserPassword
import Image from "next/image";
import { AddUserDialog } from '@/components/users/add-user-dialog';
import { EditUserRoleDialog } from '@/components/users/edit-user-role-dialog';
import { DeleteUserDialog } from '@/components/users/delete-user-dialog';
import { ChangePasswordDialog } from '@/components/users/change-password-dialog'; // Added
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


export default function UsersPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [searchTerm, setSearchTerm] = useState('');
  // State for ChangePasswordDialog is managed within the dialog trigger logic if needed, or can be added here.
  // For simplicity, we'll trigger it directly from the map.

  useEffect(() => {
    if (currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM_ADMIN') {
      router.replace('/dashboard'); 
    }
  }, [currentUser, router]);

  const handleUserAdded = (newUser: User) => {
    // In a real app, MOCK_USERS would be updated via API, and then we'd refetch or update local state.
    // For this mock, we'll add to MOCK_USERS directly (though this won't persist across refreshes without further logic)
    // and update the local state for immediate UI update.
    MOCK_USERS.push(newUser); // This mutates the imported array, which is okay for this demo.
    setUsers(prevUsers => [...prevUsers, newUser]);
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
    const success = updateUserPassword(userId, newPassword);
    if (success) {
      // Optionally, if you want to re-render the list or update local state specifically,
      // you could refetch or map users here. Since MOCK_USERS is mutated,
      // and login reads from it, this is sufficient for the mock.
      // For a visual update if needed, you could:
      // setUsers(prevUsers => prevUsers.map(u => u.id === userId ? {...u, password: newPassword /* or just spread u */} : u));
      // However, we don't display passwords, so a direct re-render of `users` state might not be needed
      // unless other user properties were changed alongside password.
    }
    return success;
  };
  
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
                    <TableCell className="font-medium text-foreground">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                       <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.role === 'SYSTEM_ADMIN' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : // More distinct color for SYSTEM_ADMIN
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                        user.role === 'CRM' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        user.role === 'DESIGNER_REPRESENTATIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {user.role.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.companyName || 'N/A'}</TableCell>
                    <TableCell className="space-x-2 whitespace-nowrap text-right">
                      <ChangePasswordDialog user={user} onPasswordChanged={handlePasswordChanged}>
                        <Button variant="outline" size="sm"><KeyRound className="mr-1 h-4 w-4" />Change Pwd</Button>
                      </ChangePasswordDialog>
                      <EditUserRoleDialog user={user} onUserRoleUpdated={handleUserRoleUpdated}>
                        <Button variant="outline" size="sm"><Edit className="mr-1 h-4 w-4" />Edit Role</Button>
                      </EditUserRoleDialog>
                      <DeleteUserDialog user={user} onUserDeleted={handleUserDeleted}>
                         <Button variant="destructive" size="sm" className="text-destructive-foreground hover:bg-destructive/90"><Trash2 className="mr-1 h-4 w-4" />Delete</Button>
                      </DeleteUserDialog>
                    </TableCell>
                  </TableRow>
                ))}
                 {filteredUsers.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center py-10">
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
