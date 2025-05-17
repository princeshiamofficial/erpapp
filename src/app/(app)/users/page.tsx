
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Edit, Trash2, KeyRound, UserCog, Target, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { User, UserRole } from "@/types";
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
import { Logo } from '@/components/layout/Logo';
import { 
  getUsers, 
  addUser, 
  updateUserRoleInFirestore, 
  deleteUserFromFirestore, 
  updateUserPasswordInFirestore, 
  updateUserAvatarInFirestore, 
  updateUserTargetsInFirestore 
} from '@/lib/user-service';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersPage() {
  const { currentUser, refreshCurrentUser } = useAuth(); // Added refreshCurrentUser
  const router = useRouter();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const fetchedUsers = await getUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({ title: "Error", description: "Could not load users from database.", variant: "destructive" });
    } finally {
      setIsLoadingUsers(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SYSTEM_ADMIN')) {
      fetchUsers();
    } else if (currentUser) {
      router.replace('/dashboard'); 
    }
  }, [currentUser, router, fetchUsers]);

  const handleUserAdded = async (newUserData: Omit<User, 'id'>) => {
    // The addUser service function now returns the full User object with ID
    await addUser(newUserData); 
    toast({ title: "User Added", description: `${newUserData.name} has been added. Default password is 'password'.`});
    fetchUsers(); // Refresh list
    if (newUserData.email === currentUser?.email) { // If admin added themselves (e.g. during setup)
      await refreshCurrentUser(); // Refresh context if current user was potentially added/updated
    }
  };

  const handleUserRoleUpdated = async (userId: string, role: UserRole) => {
    const success = await updateUserRoleInFirestore(userId, role);
    if (success) {
      toast({ title: "Role Updated", description: `User role has been updated.`});
      fetchUsers();
      if (userId === currentUser?.id) await refreshCurrentUser();
    } else {
      toast({ title: "Error", description: "Could not update user role.", variant: "destructive"});
    }
  };

  const handleUserDeleted = async (userId: string) => {
    const success = await deleteUserFromFirestore(userId);
    if (success) {
      toast({ title: "User Deleted", description: `User has been deleted.`});
      fetchUsers();
    } else {
      toast({ title: "Error", description: "Could not delete user.", variant: "destructive"});
    }
  };

  const handlePasswordChanged = async (userId: string, newPassword: string): Promise<boolean> => {
    const success = await updateUserPasswordInFirestore(userId, newPassword);
    // Toast is handled in dialog or here if preferred
    if (success && userId === currentUser?.id) await refreshCurrentUser(); // If admin changes own password
    return success; // Let dialog handle toast
  };

  const handleUserAvatarSetByAdmin = async (userId: string, avatarUrl: string | null): Promise<boolean> => {
    const success = await updateUserAvatarInFirestore(userId, avatarUrl);
    if (success) {
      fetchUsers(); // Refresh list to show new avatar
      if (userId === currentUser?.id) await refreshCurrentUser(); // If admin updates own avatar
    }
    return success; // Let dialog handle toast
  };
  
  const handleUserTargetsSetByAdmin = async (userId: string, monthlyTarget: number, weeklyTarget: number): Promise<boolean> => {
    const success = await updateUserTargetsInFirestore(userId, monthlyTarget, weeklyTarget);
    if (success) {
      fetchUsers();
       if (userId === currentUser?.id) await refreshCurrentUser();
    }
    return success; // Let dialog handle toast
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
  }
  
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().replace(/_/g, ' ').includes(searchTerm.toLowerCase()) ||
      (user.companyName && user.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [users, searchTerm]);

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SYSTEM_ADMIN')) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-6 text-center">
        <Logo className="h-16 w-16 mb-6 text-primary" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You must be an administrator to view this page.</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-6">Go to Dashboard</Button>
      </div>
    );
  }
  
  const canCurrentUserEditRoleOf = (targetUser: User): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'SYSTEM_ADMIN') return true; 
    if (currentUser.role === 'ADMIN') {
      return !(currentUser.id === targetUser.id || targetUser.role === 'ADMIN' || targetUser.role === 'SYSTEM_ADMIN');
    }
    return false;
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-description">
            Manage user accounts, roles, and permissions from Firestore.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" onClick={fetchUsers} disabled={isLoadingUsers} className="w-full sm:w-auto rounded-md shadow-md hover:shadow-lg transition-shadow">
            <RefreshCw className={`mr-2 h-5 w-5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <AddUserDialog onUserAdded={handleUserAdded} currentUser={currentUser}>
            <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-md hover:shadow-lg transition-shadow">
              <PlusCircle className="mr-2 h-5 w-5" />
              Add New User
            </Button>
          </AddUserDialog>
        </div>
      </div>
      
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
        <CardHeader className="border-b p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-card-foreground text-xl">All Users</CardTitle>
             <div className="relative w-full sm:max-w-sm">
                <Input 
                    placeholder="Search users (name, email, role, company)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-background h-10 rounded-md shadow-sm w-full"
                />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6 w-[80px]">Avatar</TableHead>
                  <TableHead className="min-w-[150px]">Name</TableHead>
                  <TableHead className="min-w-[200px]">Email</TableHead>
                  <TableHead className="min-w-[180px]">Role</TableHead>
                  <TableHead className="min-w-[150px]">Company</TableHead>
                  <TableHead className="pr-6 text-right min-w-[240px] sm:min-w-[280px] xl:min-w-[320px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingUsers ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={`skel-user-${i}`}>
                      <TableCell className="pl-6"><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="pr-6 text-right space-x-1.5">
                        {[...Array(4)].map((_, j) => <Skeleton key={j} className="h-9 w-9 inline-block rounded-md" />)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
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
                        user.role === 'SYSTEM_ADMIN' ? 'bg-destructive/20 text-destructive-foreground dark:text-red-300 border-destructive/30 dark:border-red-500/30' :
                        user.role === 'ADMIN' ? 'bg-purple-600/20 text-purple-700 dark:text-purple-300 border-purple-600/30 dark:border-purple-500/30' :
                        user.role === 'CRM' ? 'bg-primary/20 text-primary dark:text-orange-300 border-primary/30 dark:border-orange-500/30' :
                        user.role === 'DESIGNER_REPRESENTATIVE' ? 'bg-green-600/20 text-green-700 dark:text-green-300 border-green-600/30 dark:border-green-500/30' : 
                        'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30'
                      }`}>
                        {user.role.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.companyName || 'N/A'}</TableCell>
                    <TableCell className="pr-6 text-right space-x-1 sm:space-x-1.5 whitespace-nowrap">
                      <SetUserAvatarDialog user={user} onAvatarChanged={handleUserAvatarSetByAdmin}>
                        <Button variant="outline" size="icon" title="Set Avatar" className="table-action-button h-9 w-9 sm:h-9 sm:w-9"><UserCog className="h-4 w-4" /></Button>
                      </SetUserAvatarDialog>
                      <ChangePasswordDialog user={user} onPasswordChanged={handlePasswordChanged}>
                        <Button variant="outline" size="icon" title="Change Password" className="table-action-button h-9 w-9 sm:h-9 sm:w-9"><KeyRound className="h-4 w-4" /></Button>
                      </ChangePasswordDialog>
                      <EditUserRoleDialog user={user} currentUser={currentUser} onUserRoleUpdated={(updatedUser) => handleUserRoleUpdated(updatedUser.id, updatedUser.role)}>
                        <Button variant="outline" size="icon" title="Edit Role" className="table-action-button h-9 w-9 sm:h-9 sm:w-9" disabled={!canCurrentUserEditRoleOf(user)}><Edit className="h-4 w-4" /></Button>
                      </EditUserRoleDialog>
                      {user.role === 'CRM' && (
                        <SetUserSalesTargetDialog user={user} onTargetsSet={handleUserTargetsSetByAdmin}>
                            <Button variant="outline" size="icon" title="Set Sales Targets" className="table-action-button h-9 w-9 sm:h-9 sm:w-9"><Target className="h-4 w-4"/></Button>
                        </SetUserSalesTargetDialog>
                      )}
                      {currentUser.id !== user.id && !(user.role === 'SYSTEM_ADMIN' && currentUser.role !== 'SYSTEM_ADMIN') && ( // Prevent deleting self or SysAdmin by non-SysAdmin
                        <DeleteUserDialog user={user} onUserDeleted={() => handleUserDeleted(user.id)}>
                           <Button variant="destructive" size="icon" title="Delete User" className="table-action-button h-9 w-9 sm:h-9 sm:w-9"><Trash2 className="h-4 w-4" /></Button>
                        </DeleteUserDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))
                 ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 h-[300px]">
                             <Image src="https://placehold.co/240x180.png" alt="No users" data-ai-hint="empty state users" width={180} height={135} className="mx-auto rounded-md opacity-60 mb-4" />
                            <p className="text-lg text-muted-foreground font-medium">
                              {searchTerm ? "No users match your search." : "No users found in database."}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {searchTerm ? "Try a different search term." : (currentUser.role === 'SYSTEM_ADMIN' || currentUser.role === 'ADMIN') ? "Add users to manage them here." : "User data could not be loaded."}
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
