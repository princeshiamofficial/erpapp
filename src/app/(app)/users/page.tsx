
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { User, UserRole } from "@/types";
import { MOCK_USERS } from "@/lib/auth-constants";
import Image from "next/image";
import { AddUserDialog } from '@/components/users/add-user-dialog';
import { EditUserRoleDialog } from '@/components/users/edit-user-role-dialog';
import { DeleteUserDialog } from '@/components/users/delete-user-dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


export default function UsersPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentUser && currentUser.role !== 'ADMIN') {
      router.replace('/dashboard'); 
    }
  }, [currentUser, router]);

  const handleUserAdded = (newUser: User) => {
    setUsers(prevUsers => [...prevUsers, newUser]);
  };

  const handleUserRoleUpdated = (updatedUser: User) => {
    setUsers(prevUsers => prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleUserDeleted = (userId: string) => {
    setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
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

  if (!currentUser || currentUser.role !== 'ADMIN') {
    // This check is important, but the layout already provides a loader/redirect.
    // However, this explicit check handles the case where a non-admin might somehow land here.
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
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-foreground">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                       <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                        user.role === 'CRM' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        user.role === 'DESIGNER_REPRESENTATIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {user.role.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.companyName || 'N/A'}</TableCell>
                    <TableCell className="space-x-2 whitespace-nowrap">
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
