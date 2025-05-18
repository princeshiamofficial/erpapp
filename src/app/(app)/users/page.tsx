
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Edit, Trash2, KeyRound, UserCog, Target, RefreshCw, UserX, UserCheck, AlertTriangle, Edit3 as EditInfoIcon } from "lucide-react"; // Renamed Edit3 to EditInfoIcon
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
import { EditUserInfoDialog } from '@/components/users/edit-user-info-dialog'; // New Dialog
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from '@/components/layout/Logo';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  getUsers, 
  addUser as addUserToDb, 
  updateUserRoleInFirestore, 
  deleteUserFromFirestore, 
  updateUserPasswordInFirestore, 
  updateUserAvatarInFirestore, 
  updateUserTargetsInFirestore,
  // updateUserInfo is now handled by a server action
} from '@/lib/user-service';
import { toggleUserBanStatusAction, updateUserInfoAction } from './actions'; // Imported updateUserInfoAction
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function UsersPage() {
  const { currentUser, refreshCurrentUser } = useAuth(); 
  const router = useRouter();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userToToggleBan, setUserToToggleBan] = useState<User | null>(null);
  const [isBanDialogValid, setIsBanDialogValid] = useState(false);
  const [userToEditInfo, setUserToEditInfo] = useState<User | null>(null); // For EditUserInfoDialog

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
    const createdUser = await addUserToDb(newUserData); 
    if (createdUser) {
      toast({ title: "User Added", description: `${newUserData.name} has been added. Default password is 'password'.`});
      await fetchUsers(); 
      if (newUserData.email === currentUser?.email) { 
        await refreshCurrentUser(); 
      }
    } else {
       toast({ title: "Error", description: "Could not add user. Email might be in use or database error.", variant: "destructive"});
    }
  };

  const handleUserRoleUpdated = async (userId: string, role: UserRole) => {
    const success = await updateUserRoleInFirestore(userId, role);
    if (success) {
      toast({ title: "Role Updated", description: `User role has been updated.`});
      await fetchUsers();
      if (userId === currentUser?.id) await refreshCurrentUser();
    } else {
      toast({ title: "Error", description: "Could not update user role.", variant: "destructive"});
    }
  };

  const handleUserDeleted = async (userId: string) => {
    const success = await deleteUserFromFirestore(userId);
    if (success) {
      toast({ title: "User Deleted", description: `User has been deleted.`});
      await fetchUsers();
    } else {
      toast({ title: "Error", description: "Could not delete user.", variant: "destructive"});
    }
  };

  const handlePasswordChanged = async (userId: string, newPassword: string): Promise<boolean> => {
    const success = await updateUserPasswordInFirestore(userId, newPassword);
    if (success && userId === currentUser?.id) await refreshCurrentUser(); 
    return success; 
  };

  const handleUserAvatarSetByAdmin = async (userId: string, avatarUrl: string | null): Promise<boolean> => {
    const success = await updateUserAvatarInFirestore(userId, avatarUrl);
    if (success) {
      await fetchUsers(); 
      if (userId === currentUser?.id) await refreshCurrentUser(); 
    }
    return success; 
  };
  
  const handleUserTargetsSetByAdmin = async (userId: string, monthlyTarget: number, weeklyTarget: number): Promise<boolean> => {
    const success = await updateUserTargetsInFirestore(userId, monthlyTarget, weeklyTarget);
    if (success) {
      await fetchUsers();
       if (userId === currentUser?.id) await refreshCurrentUser();
    }
    return success; 
  };

  const handleToggleBanStatus = async () => {
    if (!userToToggleBan) return;
    const currentBanStatus = userToToggleBan.isBanned || false;
    const result = await toggleUserBanStatusAction(userToToggleBan.id, currentBanStatus);

    if (result.success) {
      toast({
        title: `User ${result.newBanStatus ? 'Banned' : 'Unbanned'}`,
        description: `${userToToggleBan.name} has been ${result.newBanStatus ? 'banned' : 'unbanned'}.`,
      });
      await fetchUsers(); 
      if (userToToggleBan.id === currentUser?.id && result.newBanStatus) {
         // If current user bans themselves, context needs to handle this through polling
      }
    } else {
      toast({
        title: "Operation Failed",
        description: result.error || `Could not ${currentBanStatus ? 'unban' : 'ban'} user.`,
        variant: "destructive",
      });
    }
    setUserToToggleBan(null);
    setIsBanDialogValid(false);
  };

  const openBanDialog = (user: User) => {
    setUserToToggleBan(user);
    setIsBanDialogValid(true);
  }

  const handleUserInfoUpdated = async () => {
    await fetchUsers();
    // If the current user's info was updated, refresh context
    if (userToEditInfo && userToEditInfo.id === currentUser?.id) {
        await refreshCurrentUser();
    }
    setUserToEditInfo(null); // Close dialog via state
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

  const canAdminModifyTargetUser = (targetUser: User): boolean => { // Used for Avatar, Password, Targets
    if (!currentUser) return false;
    if (currentUser.role === 'SYSTEM_ADMIN') return true; 
    if (currentUser.role === 'ADMIN') {
      if (targetUser.id === currentUser.id) return true; 
      return targetUser.role === 'CRM' || targetUser.role === 'DESIGNER_REPRESENTATIVE';
    }
    return false;
  };

  const canSystemAdminEditInfoOf = (targetUser: User): boolean => { // New for Edit Info (Name, Email, Company)
    if (!currentUser || currentUser.role !== 'SYSTEM_ADMIN') return false;
    // System Admin cannot edit another System Admin's info or their own info via this specific table button.
    if (targetUser.role === 'SYSTEM_ADMIN' || targetUser.id === currentUser.id) return false;
    return true;
  };
  
  const canAdminDeleteTargetUser = (targetUser: User): boolean => {
    if (!currentUser) return false;
    if (targetUser.id === currentUser.id) return false; 
    if (currentUser.role === 'SYSTEM_ADMIN') return true; 
    if (currentUser.role === 'ADMIN') {
      return targetUser.role === 'CRM' || targetUser.role === 'DESIGNER_REPRESENTATIVE';
    }
    return false;
  };

  const canSystemAdminToggleBan = (targetUser: User): boolean => {
    if (!currentUser || currentUser.role !== 'SYSTEM_ADMIN') return false;
    if (targetUser.id === currentUser.id) return false; 
    if (targetUser.role === 'SYSTEM_ADMIN') return false;
    return true;
  };

  const showBanStatusColumn = currentUser?.role === 'SYSTEM_ADMIN';

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-description">
            Manage user accounts, roles, and permissions from Firestore.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {/* Refresh button is now hidden 
          <Button variant="outline" size="lg" onClick={fetchUsers} disabled={isLoadingUsers} className="w-full sm:w-auto rounded-md shadow-md hover:shadow-lg transition-shadow">
            <RefreshCw className={`mr-2 h-5 w-5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          */}
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
                  <TableHead className="min-w-[120px]">Role</TableHead>
                  {showBanStatusColumn && <TableHead className="min-w-[100px]">Status</TableHead>}
                  <TableHead className="min-w-[150px]">Company</TableHead>
                  <TableHead className="pr-6 text-right min-w-[280px] sm:min-w-[320px] xl:min-w-[400px]">Actions</TableHead>
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
                      {showBanStatusColumn && <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>}
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="pr-6 text-right space-x-1.5">
                        {[...Array(showBanStatusColumn ? 6 : 5)].map((_, j) => <Skeleton key={j} className="h-9 w-9 inline-block rounded-md" />)}
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
                    {showBanStatusColumn && (
                        <TableCell>
                        <Badge variant={user.isBanned ? "destructive" : "default"} className={user.isBanned ? "bg-red-500/20 text-red-700 border-red-500/30" : "bg-green-500/20 text-green-700 border-green-500/30"}>
                            {user.isBanned ? "Banned" : "Active"}
                        </Badge>
                        </TableCell>
                    )}
                    <TableCell className="text-muted-foreground">{user.companyName || 'N/A'}</TableCell>
                    <TableCell className="pr-6 text-right space-x-1 sm:space-x-1.5 whitespace-nowrap">
                      {currentUser?.role === 'SYSTEM_ADMIN' && (
                        <Button 
                          variant="outline" 
                          size="icon" 
                          title="Edit User Info" 
                          className="h-9 w-9 sm:h-9 sm:w-9" 
                          onClick={() => setUserToEditInfo(user)}
                          disabled={!canSystemAdminEditInfoOf(user)}
                        >
                          <EditInfoIcon className="h-4 w-4" />
                        </Button>
                      )}
                      {canSystemAdminToggleBan(user) && (
                        <Button 
                          variant={user.isBanned ? "outline" : "destructive"} 
                          size="icon" 
                          title={user.isBanned ? "Unban User" : "Ban User"} 
                          className="h-9 w-9 sm:h-9 sm:w-9" 
                          onClick={() => openBanDialog(user)}
                        >
                          {user.isBanned ? <UserCheck className="h-4 w-4 text-green-600" /> : <UserX className="h-4 w-4" />}
                        </Button>
                      )}
                      <SetUserAvatarDialog user={user} onAvatarChanged={handleUserAvatarSetByAdmin}>
                        <Button variant="outline" size="icon" title="Set Avatar" className="h-9 w-9 sm:h-9 sm:w-9" disabled={!canAdminModifyTargetUser(user)}><UserCog className="h-4 w-4" /></Button>
                      </SetUserAvatarDialog>
                      <ChangePasswordDialog user={user} onPasswordChanged={handlePasswordChanged}>
                        <Button variant="outline" size="icon" title="Change Password" className="h-9 w-9 sm:h-9 sm:w-9" disabled={!canAdminModifyTargetUser(user)}><KeyRound className="h-4 w-4" /></Button>
                      </ChangePasswordDialog>
                      <EditUserRoleDialog user={user} currentUser={currentUser} onUserRoleUpdated={(updatedUser) => handleUserRoleUpdated(updatedUser.id, updatedUser.role)}>
                        <Button variant="outline" size="icon" title="Edit Role" className="h-9 w-9 sm:h-9 sm:w-9" disabled={!canCurrentUserEditRoleOf(user)}><Edit className="h-4 w-4" /></Button>
                      </EditUserRoleDialog>
                      {user.role === 'CRM' && (
                        <SetUserSalesTargetDialog user={user} onTargetsSet={handleUserTargetsSetByAdmin}>
                            <Button variant="outline" size="icon" title="Set Sales Targets" className="h-9 w-9 sm:h-9 sm:w-9" disabled={!canAdminModifyTargetUser(user)}><Target className="h-4 w-4"/></Button>
                        </SetUserSalesTargetDialog>
                      )}
                      <DeleteUserDialog user={user} onUserDeleted={() => handleUserDeleted(user.id)}>
                         <Button variant="destructive" size="icon" title="Delete User" className="h-9 w-9 sm:h-9 sm:w-9" disabled={!canAdminDeleteTargetUser(user)}><Trash2 className="h-4 w-4" /></Button>
                      </DeleteUserDialog>
                    </TableCell>
                  </TableRow>
                ))
                 ) : (
                    <TableRow>
                        <TableCell colSpan={showBanStatusColumn ? 7 : 6} className="text-center py-12 h-[300px]">
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

      {userToToggleBan && (
        <AlertDialog open={isBanDialogValid} onOpenChange={(open) => { if(!open) { setUserToToggleBan(null); setIsBanDialogValid(false); }}}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className={`h-6 w-6 ${userToToggleBan.isBanned ? 'text-green-600' : 'text-destructive'}`} /> 
                Are you sure?
                </AlertDialogTitle>
              <AlertDialogDescription>
                You are about to {userToToggleBan.isBanned ? 'unban' : 'ban'} the user 
                "<span className="font-semibold">{userToToggleBan.name}</span>". 
                {userToToggleBan.isBanned ? ' They will be able to log in again.' : ' They will no longer be able to log in.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {setUserToToggleBan(null); setIsBanDialogValid(false);}}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleToggleBanStatus} className={userToToggleBan.isBanned ? "bg-green-600 hover:bg-green-700 text-white" : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"}>
                {userToToggleBan.isBanned ? "Yes, Unban User" : "Yes, Ban User"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {userToEditInfo && currentUser?.role === 'SYSTEM_ADMIN' && (
        <EditUserInfoDialog
          user={userToEditInfo}
          onUserInfoUpdated={handleUserInfoUpdated}
        >
          {/* This dialog is opened programmatically, so no trigger child needed here */}
        </EditUserInfoDialog>
      )}
    </div>
  );
}
