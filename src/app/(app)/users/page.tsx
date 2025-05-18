
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Edit, Trash2, KeyRound, UserCog, Target, UserX, UserCheck, AlertTriangle, Edit3 as EditInfoIcon, Settings as SettingsIcon, MoreVertical } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { User, UserRole } from "@/types";
import { AddUserDialog } from '@/components/users/add-user-dialog';
import { EditUserRoleDialog } from '@/components/users/edit-user-role-dialog';
import { DeleteUserDialog } from '@/components/users/delete-user-dialog';
import { ChangePasswordDialog } from '@/components/users/change-password-dialog';
import { SetUserAvatarDialog } from '@/components/users/set-user-avatar-dialog';
import { SetUserSalesTargetDialog } from '@/components/users/set-user-sales-target-dialog';
import { EditUserInfoDialog } from '@/components/users/edit-user-info-dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from '@/components/layout/Logo';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { 
  getUsers, 
  addUser as addUserToDb, 
  updateUserRoleInFirestore, 
  deleteUserFromFirestore, 
  updateUserPasswordInFirestore, 
  updateUserAvatarInFirestore, 
  updateUserTargetsInFirestore,
} from '@/lib/user-service';
import { toggleUserBanStatusAction, updateUserInfoAction } from './actions'; 
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
  const [isBanDialogVisible, setIsBanDialogVisible] = useState(false);
  
  const [userToEditInfo, setUserToEditInfo] = useState<User | null>(null);
  const [isEditInfoDialogOpen, setIsEditInfoDialogOpen] = useState(false);

  const [userToEditRole, setUserToEditRole] = useState<User | null>(null);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);

  const [userToChangePassword, setUserToChangePassword] = useState<User | null>(null);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  
  const [userToSetAvatar, setUserToSetAvatar] = useState<User | null>(null);
  const [isSetAvatarDialogOpen, setIsSetAvatarDialogOpen] = useState(false);

  const [userToSetTargets, setUserToSetTargets] = useState<User | null>(null);
  const [isSetTargetsDialogOpen, setIsSetTargetsDialogOpen] = useState(false);

  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);


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

  const handleUserAdded = async (newUserData: Omit<User, 'id' | 'isBanned'> & {password: string}) => {
    const createdUser = await addUserToDb(newUserData); 
    if (createdUser) {
      toast({ title: "User Added", description: `${newUserData.name} has been added. Default password is 'password'.`});
      await fetchUsers(); 
      if (currentUser && newUserData.email === currentUser.email && typeof refreshCurrentUser === 'function') { 
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
      if (currentUser && userId === currentUser.id && typeof refreshCurrentUser === 'function') await refreshCurrentUser();
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
    if (currentUser && success && userId === currentUser.id && typeof refreshCurrentUser === 'function') await refreshCurrentUser(); 
    return success; 
  };

  const handleUserAvatarSetByAdmin = async (userId: string, avatarUrl: string | null): Promise<boolean> => {
    const success = await updateUserAvatarInFirestore(userId, avatarUrl);
    if (success) {
      await fetchUsers(); 
      if (currentUser && userId === currentUser.id && typeof refreshCurrentUser === 'function') await refreshCurrentUser(); 
    }
    return success; 
  };
  
  const handleUserTargetsSetByAdmin = async (userId: string, monthlyTarget: number, weeklyTarget: number): Promise<boolean> => {
    const success = await updateUserTargetsInFirestore(userId, monthlyTarget, weeklyTarget);
    if (success) {
      await fetchUsers();
       if (currentUser && userId === currentUser.id && typeof refreshCurrentUser === 'function') await refreshCurrentUser();
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
      if (currentUser && userToToggleBan.id === currentUser.id && result.newBanStatus && typeof refreshCurrentUser === 'function') {
         await refreshCurrentUser(); 
      }
    } else {
      toast({
        title: "Operation Failed",
        description: result.error || `Could not ${currentBanStatus ? 'unban' : 'ban'} user.`,
        variant: "destructive",
      });
    }
    setUserToToggleBan(null);
    setIsBanDialogVisible(false);
  };

  const handleUserInfoUpdated = async () => {
    await fetchUsers();
    if (currentUser && userToEditInfo && userToEditInfo.id === currentUser.id && typeof refreshCurrentUser === 'function') {
        await refreshCurrentUser();
    }
    setIsEditInfoDialogOpen(false); 
    setUserToEditInfo(null); 
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
  
  // Permission helper functions
  const canCurrentUserEditRoleOf = useCallback((targetUser: User): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'SYSTEM_ADMIN') return true; 
    if (currentUser.role === 'ADMIN') {
      return !(currentUser.id === targetUser.id || targetUser.role === 'ADMIN' || targetUser.role === 'SYSTEM_ADMIN');
    }
    return false;
  }, [currentUser]);

  const canAdminModifyTargetUser = useCallback((targetUser: User): boolean => {
    if (!currentUser) return false;
    // SYSTEM_ADMIN can modify ADMIN, CRM, DESIGNER_REPRESENTATIVE (but not self or other SYSTEM_ADMIN via this dialog)
    if (currentUser.role === 'SYSTEM_ADMIN') {
      return targetUser.role !== 'SYSTEM_ADMIN' && targetUser.id !== currentUser.id;
    }
    // ADMIN can modify self, CRM, DESIGNER_REPRESENTATIVE (but not other ADMIN or SYSTEM_ADMIN)
    if (currentUser.role === 'ADMIN') {
      if (targetUser.id === currentUser.id) return true; 
      return targetUser.role === 'CRM' || targetUser.role === 'DESIGNER_REPRESENTATIVE';
    }
    return false; 
  }, [currentUser]);
  
  const canAdminDeleteTargetUser = useCallback((targetUser: User): boolean => {
    if (!currentUser) return false;
    if (targetUser.id === currentUser.id) return false; 
    // SYSTEM_ADMIN can delete ADMIN, CRM, DESIGNER_REPRESENTATIVE (but not other SYSTEM_ADMIN)
    if (currentUser.role === 'SYSTEM_ADMIN') return targetUser.role !== 'SYSTEM_ADMIN'; 
    // ADMIN can delete CRM, DESIGNER_REPRESENTATIVE (but not other ADMIN or SYSTEM_ADMIN)
    if (currentUser.role === 'ADMIN') {
      return targetUser.role === 'CRM' || targetUser.role === 'DESIGNER_REPRESENTATIVE';
    }
    return false;
  }, [currentUser]);

  const canSystemAdminToggleBan = useCallback((targetUser: User): boolean => {
    if (!currentUser || currentUser.role !== 'SYSTEM_ADMIN') return false;
    if (targetUser.id === currentUser.id) return false; 
    if (targetUser.role === 'SYSTEM_ADMIN') return false;
    return true;
  }, [currentUser]);

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
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Refresh button is hidden
          <Button variant="outline" size="icon" onClick={fetchUsers} disabled={isLoadingUsers} className="h-10 w-10" title="Refresh Users">
            <RefreshCw className={`h-5 w-5 ${isLoadingUsers ? 'animate-spin' : ''}`} />
          </Button> */}
          <AddUserDialog onUserAdded={handleUserAdded} currentUser={currentUser}>
            <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-md hover:shadow-lg transition-shadow h-10">
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
                  <TableHead className="pr-6 text-right min-w-[80px]">Actions</TableHead>
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
                        <Skeleton className="h-9 w-9 inline-block rounded-md" />
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
                        user.role === 'SYSTEM_ADMIN' ? 'bg-red-600/20 text-red-700 dark:text-red-300 border-red-600/30 dark:border-red-500/30' :
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
                    <TableCell className="pr-6 text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9" title="User Actions">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions for {user.name}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem 
                              onSelect={() => { setUserToEditInfo(user); setIsEditInfoDialogOpen(true); }}
                              disabled={!canAdminModifyTargetUser(user)}
                            >
                              <EditInfoIcon className="mr-2 h-4 w-4" /> Edit Info
                            </DropdownMenuItem>
                            {currentUser?.role === 'SYSTEM_ADMIN' && (
                              <DropdownMenuItem 
                                onSelect={() => { setUserToToggleBan(user); setIsBanDialogVisible(true); }}
                                className={user.isBanned ? "text-green-600 focus:text-green-700" : "text-destructive focus:text-destructive"}
                                disabled={!canSystemAdminToggleBan(user)}
                              >
                                {user.isBanned ? <UserCheck className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
                                {user.isBanned ? "Unban User" : "Ban User"}
                              </DropdownMenuItem>
                            )}
                             <DropdownMenuItem 
                                onSelect={() => { setUserToSetAvatar(user); setIsSetAvatarDialogOpen(true); }}
                                disabled={!canAdminModifyTargetUser(user)}
                              >
                                <UserCog className="mr-2 h-4 w-4" /> Set Avatar
                              </DropdownMenuItem>
                             <DropdownMenuItem 
                                onSelect={() => { setUserToChangePassword(user); setIsChangePasswordDialogOpen(true);}}
                                disabled={!canAdminModifyTargetUser(user)}
                              >
                                <KeyRound className="mr-2 h-4 w-4" /> Change Password
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onSelect={() => { setUserToEditRole(user); setIsEditRoleDialogOpen(true);}}
                                disabled={!canCurrentUserEditRoleOf(user)}
                              >
                                <Edit className="mr-2 h-4 w-4" /> Edit Role
                              </DropdownMenuItem>
                            {user.role === 'CRM' && (
                               <DropdownMenuItem 
                                onSelect={() => { setUserToSetTargets(user); setIsSetTargetsDialogOpen(true);}}
                                disabled={!canAdminModifyTargetUser(user)}
                              >
                                <Target className="mr-2 h-4 w-4" /> Set Sales Targets
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                           <DropdownMenuItem 
                            onSelect={() => { setUserToDelete(user); setIsDeleteUserDialogOpen(true);}}
                            disabled={!canAdminDeleteTargetUser(user)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
                 ) : (
                    <TableRow>
                        <TableCell colSpan={showBanStatusColumn ? 7 : 6} className="text-center py-12 h-[300px]">
                             <Logo className="mx-auto h-16 w-16 mb-6 text-primary opacity-50" />
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

      {isEditInfoDialogOpen && userToEditInfo && (
        <EditUserInfoDialog
          user={userToEditInfo}
          onUserInfoUpdated={handleUserInfoUpdated}
          isOpen={isEditInfoDialogOpen}
          onOpenChange={(open) => {
            setIsEditInfoDialogOpen(open);
            if (!open) setUserToEditInfo(null); 
          }}
        />
      )}

      {userToToggleBan && (
        <AlertDialog open={isBanDialogVisible} onOpenChange={(open) => { if(!open) { setUserToToggleBan(null); setIsBanDialogVisible(false); }}}>
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
              <AlertDialogCancel onClick={() => {setUserToToggleBan(null); setIsBanDialogVisible(false);}} disabled={isLoadingUsers}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleToggleBanStatus} className={userToToggleBan.isBanned ? "bg-green-600 hover:bg-green-700 text-white" : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"} disabled={isLoadingUsers}>
                {userToToggleBan.isBanned ? "Yes, Unban User" : "Yes, Ban User"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isSetAvatarDialogOpen && userToSetAvatar && (
        <SetUserAvatarDialog 
          user={userToSetAvatar} 
          onAvatarChanged={handleUserAvatarSetByAdmin}
          isOpen={isSetAvatarDialogOpen}
          onOpenChange={(open) => {
            setIsSetAvatarDialogOpen(open);
            if (!open) setUserToSetAvatar(null);
          }}
        />
      )}

      {isChangePasswordDialogOpen && userToChangePassword && (
        <ChangePasswordDialog 
          user={userToChangePassword} 
          onPasswordChanged={handlePasswordChanged}
          isOpen={isChangePasswordDialogOpen}
          onOpenChange={(open) => {
            setIsChangePasswordDialogOpen(open);
            if (!open) setUserToChangePassword(null);
          }}
        />
      )}
      
      {isEditRoleDialogOpen && userToEditRole && currentUser && (
        <EditUserRoleDialog 
          user={userToEditRole} 
          currentUser={currentUser} 
          onUserRoleUpdated={(updatedUser) => handleUserRoleUpdated(updatedUser.id, updatedUser.role)}
          isOpen={isEditRoleDialogOpen}
          onOpenChange={(open) => {
            setIsEditRoleDialogOpen(open);
            if (!open) setUserToEditRole(null);
          }}
        />
      )}

      {isSetTargetsDialogOpen && userToSetTargets && userToSetTargets.role === 'CRM' && (
         <SetUserSalesTargetDialog 
            user={userToSetTargets} 
            onTargetsSet={handleUserTargetsSetByAdmin}
            isOpen={isSetTargetsDialogOpen}
            onOpenChange={(open) => {
              setIsSetTargetsDialogOpen(open);
              if (!open) setUserToSetTargets(null);
            }}
          />
      )}

      {isDeleteUserDialogOpen && userToDelete && (
        <DeleteUserDialog 
          user={userToDelete} 
          onUserDeleted={() => handleUserDeleted(userToDelete.id)}
          isOpen={isDeleteUserDialogOpen}
          onOpenChange={(open) => {
            setIsDeleteUserDialogOpen(open);
            if (!open) setUserToDelete(null);
          }}
        />
      )}
    </div>
  );
}
