
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, MoreVertical, Store, Loader2, Edit3, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { Vendor, User } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getVendors } from '@/lib/vendor-service';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { deleteVendorAction } from './actions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, parseISO } from 'date-fns';

const AddEditVendorDialog = dynamic(() => import('@/components/vendors/AddEditVendorDialog').then(mod => mod.AddEditVendorDialog));
const DeleteVendorDialog = dynamic(() => import('@/components/vendors/DeleteVendorDialog').then(mod => mod.DeleteVendorDialog));

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  try {
    return format(parseISO(dateString), 'd MMM yyyy');
  } catch (e) {
    return "Invalid Date";
  }
};

export default function VendorsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedVendors = await getVendors();
      setVendors(fetchedVendors);
    } catch (error) {
      console.error("Failed to fetch vendors data:", error);
      toast({ title: "Error", description: "Could not load vendors data.", variant: "destructive" });
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
    if (!searchTerm) return vendors;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return vendors.filter(vendor =>
      vendor.name.toLowerCase().includes(lowerSearchTerm) ||
      vendor.contactPerson.toLowerCase().includes(lowerSearchTerm) ||
      vendor.phone.toLowerCase().includes(lowerSearchTerm) ||
      vendor.category.toLowerCase().includes(lowerSearchTerm)
    );
  }, [vendors, searchTerm]);

  const handleOpenAddDialog = () => {
    setEditingVendor(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEditDialog = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setIsAddEditOpen(true);
  };

  const handleVendorSaved = () => {
    setIsAddEditOpen(false);
    setEditingVendor(null);
    fetchData();
  };
  
  const handleDeleteRequest = (vendor: Vendor) => {
    setVendorToDelete(vendor);
  };

  const handleConfirmDelete = async () => {
    if (!vendorToDelete) return;
    setIsDeleting(true);
    const result = await deleteVendorAction(vendorToDelete.id);
    setIsDeleting(false);
    setVendorToDelete(null);

    if (result.success) {
      toast({ title: "Vendor Deleted", description: "The vendor record has been successfully deleted." });
      fetchData();
    } else {
      toast({ title: "Error", description: result.error || "Could not delete the vendor.", variant: "destructive" });
    }
  };

  if (!currentUser || !['SYSTEM_ADMIN', 'ADMIN'].includes(currentUser.role)) {
    return <div className="p-8 text-center">Access Denied.</div>;
  }

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
          <div><h1 className="page-title">Vendors</h1><p className="page-description">Manage and track all company vendors.</p></div>
        </div>

        <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
          <CardHeader className="border-b p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-card-foreground text-xl">All Vendors</CardTitle>
              <div className="relative flex-grow sm:flex-grow-0 sm:max-w-xs w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search vendors..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 bg-background h-10 rounded-md w-full" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Vendor ID</TableHead>
                    <TableHead>Vendor Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={`skel-vendor-${i}`}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    ))
                  ) : filteredVendors.length > 0 ? (
                    filteredVendors.map(vendor => (
                      <TableRow key={vendor.id} className="hover:bg-muted/50">
                        <TableCell className="pl-6 font-mono text-primary">{vendor.vendorId}</TableCell>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell>{vendor.contactPerson}</TableCell>
                        <TableCell>{vendor.phone}</TableCell>
                        <TableCell>{vendor.category}</TableCell>
                        <TableCell className="truncate max-w-xs">{vendor.address}</TableCell>
                        <TableCell className="pr-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => handleOpenEditDialog(vendor)} className="cursor-pointer"><Edit3 className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleDeleteRequest(vendor)} className="cursor-pointer text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={7} className="h-48 text-center"><Store className="mx-auto h-12 w-12 opacity-30 mb-3" />No vendors found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AddEditVendorDialog
        isOpen={isAddEditOpen}
        onOpenChange={setIsAddEditOpen}
        onVendorSaved={handleVendorSaved}
        vendor={editingVendor}
      />

      <DeleteVendorDialog
        isOpen={!!vendorToDelete}
        onOpenChange={() => setVendorToDelete(null)}
        onConfirmDelete={handleConfirmDelete}
        vendor={vendorToDelete}
        isDeleting={isDeleting}
      />
    </>
  );
}
