
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Search, MoreVertical, Store, Loader2, Edit, Trash2, PlusCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { User } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getUsers } from '@/lib/user-service';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { deleteUserAction } from '@/app/(app)/users/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AddUserDialog = dynamic(() => import('@/components/users/add-user-dialog').then(mod => mod.AddUserDialog));
const EditUserInfoDialog = dynamic(() => import('@/components/users/edit-user-info-dialog').then(mod => mod.EditUserInfoDialog));
const DeleteUserDialog = dynamic(() => import('@/components/users/delete-user-dialog').then(mod => mod.DeleteUserDialog));

const getInitials = (name: string) => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names[names.length - 1] ? names[names.length - 1].charAt(0).toUpperCase() : '');
};


export default function VendorsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("vendor_list");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedUsers = await getUsers();
      setAllUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to fetch users data:", error);
      toast({ title: "Error", description: "Could not load users data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser && (currentUser.role === 'SYSTEM_ADMIN' || currentUser.role === 'ADMIN')) {
      fetchData();
    } else if (currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, fetchData, router]);

  const filteredVendors = useMemo(() => {
    const vendors = allUsers.filter(u => u.role === 'VENDOR');
    if (!searchTerm) return vendors;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return vendors.filter(vendor =>
      vendor.name.toLowerCase().includes(lowerSearchTerm) ||
      (vendor.email && vendor.email.toLowerCase().includes(lowerSearchTerm)) ||
      (vendor.companyName && vendor.companyName.toLowerCase().includes(lowerSearchTerm))
    );
  }, [allUsers, searchTerm]);
  
  const handleUserSaved = () => {
    setUserToEdit(null);
    setIsAddUserDialogOpen(false);
    fetchData();
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    const result = await deleteUserAction(userToDelete.id);
    setIsDeleting(false);
    setUserToDelete(null);

    if (result.success) {
      toast({ title: "Vendor Deleted", description: "The vendor user account has been successfully deleted." });
      fetchData();
    } else {
      toast({ title: "Error", description: result.error || "Could not delete the vendor.", variant: "destructive" });
    }
  };

  const vendorListContent = (
    <Card className="shadow-lg border-none rounded-2xl bg-white overflow-hidden">
        <CardHeader className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-xl font-bold text-gray-800">Vendors List</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search vendors..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 bg-gray-50 border-gray-200 rounded-full h-10 w-full"/>
                </div>
                <Button 
                    onClick={() => setIsAddUserDialogOpen(true)}
                    className="h-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Vendor
                </Button>
            </div>
        </div>
        </CardHeader>
        <CardContent className="p-0">
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Business Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                [...Array(5)].map((_, i) => (
                    <TableRow key={`skel-vendor-${i}`}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                ))
                ) : filteredVendors.length > 0 ? (
                filteredVendors.map(vendor => (
                    <TableRow key={vendor.id} className="hover:bg-muted/50">
                    <TableCell className="pl-6 font-medium">
                        <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border">
                            <AvatarImage src={vendor.avatarUrl || undefined} alt={vendor.name}/>
                            <AvatarFallback>{getInitials(vendor.name)}</AvatarFallback>
                        </Avatar>
                        <span>{vendor.name}</span>
                        </div>
                    </TableCell>
                    <TableCell>{vendor.email}</TableCell>
                    <TableCell>{vendor.phone || 'N/A'}</TableCell>
                    <TableCell>{vendor.companyName || 'N/A'}</TableCell>
                    <TableCell>{vendor.category || 'N/A'}</TableCell>
                    <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setUserToEdit(vendor)} className="cursor-pointer"><Edit className="mr-2 h-4 w-4" />Edit Info</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setUserToDelete(vendor)} className="cursor-pointer text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete Vendor</DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))
                ) : (
                <TableRow><TableCell colSpan={6} className="h-48 text-center"><Store className="mx-auto h-12 w-12 opacity-30 mb-3" />No vendors found.</TableCell></TableRow>
                )}
            </TableBody>
            </Table>
        </div>
        </CardContent>
    </Card>
  );

  if (!currentUser || !['SYSTEM_ADMIN', 'ADMIN'].includes(currentUser.role)) {
    return <div className="p-8 text-center">Access Denied.</div>;
  }

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white p-1 rounded-full shadow-sm border border-gray-200">
            <TabsTrigger value="vendor_list" className="rounded-full data-[state=active]:bg-gray-800 data-[state=active]:text-white">Vendor List</TabsTrigger>
          </TabsList>
          <div className="mt-6">
            <TabsContent value="vendor_list">
              {vendorListContent}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <AddUserDialog 
        onUserAdded={handleUserSaved}
        currentUser={currentUser}
        isOpen={isAddUserDialogOpen}
        onOpenChange={setIsAddUserDialogOpen}
        defaultRole="VENDOR"
      />

      {userToEdit && (
        <EditUserInfoDialog
            user={userToEdit}
            onUserInfoUpdated={handleUserSaved}
            isOpen={!!userToEdit}
            onOpenChange={() => setUserToEdit(null)}
        />
      )}

      {userToDelete && (
        <DeleteUserDialog
          isOpen={!!userToDelete}
          onOpenChange={() => setUserToDelete(null)}
          onConfirmDelete={handleConfirmDelete}
          user={userToDelete}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}
