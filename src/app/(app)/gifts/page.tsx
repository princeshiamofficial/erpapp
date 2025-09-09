
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Edit3, Trash2, MoreVertical, Gift as GiftIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { Gift, User, ServiceGiftItem } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getContrastTextColor } from '@/lib/status-service';
import { getGifts as fetchGifts, deleteGift as deleteGiftAction } from './actions';
import { getGifts as getGiftOptions } from '@/lib/service-options-service';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";

const AddEditGiftDialog = dynamic(() => import('@/components/gifts/AddEditGiftDialog').then(mod => mod.AddEditGiftDialog));

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  try {
    return format(parseISO(dateString), 'd MMM yyyy');
  } catch (e) {
    return "Invalid Date";
  }
};

const ITEMS_PER_PAGE = 25;

export default function GiftsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [gifts, setGifts] = useState<Gift[]>([]);
  const [giftOptions, setGiftOptions] = useState<ServiceGiftItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [giftToEdit, setGiftToEdit] = useState<Gift | null>(null);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  
  const [giftToDelete, setGiftToDelete] = useState<Gift | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedGifts, fetchedGiftOptions] = await Promise.all([
        fetchGifts(),
        getGiftOptions(),
      ]);
      setGifts(fetchedGifts);
      setGiftOptions(fetchedGiftOptions);
    } catch (error) {
      console.error("Failed to fetch gifts data:", error);
      toast({ title: "Error", description: "Could not load gifts data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    } else {
        router.push('/login');
    }
  }, [currentUser, fetchData, router]);

  const filteredGifts = useMemo(() => {
    let result = gifts;
    if (currentUser?.role === 'CRM') {
      result = result.filter(gift => gift.givenByUserId === currentUser.id);
    }
    if (!searchTerm) return result;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return result.filter(gift =>
      gift.giftIdDisplay.toLowerCase().includes(lowerSearchTerm) ||
      gift.recipientName.toLowerCase().includes(lowerSearchTerm) ||
      gift.recipientPhone.toLowerCase().includes(lowerSearchTerm) ||
      gift.giftItemName.toLowerCase().includes(lowerSearchTerm)
    );
  }, [gifts, searchTerm, currentUser]);
  
  const totalPages = Math.ceil(filteredGifts.length / ITEMS_PER_PAGE);

  const paginatedGifts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredGifts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredGifts, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleGiftSaved = (savedGift: Gift) => {
    fetchData();
    setIsAddEditDialogOpen(false);
    setGiftToEdit(null);
  };
  
  const handleOpenAddDialog = () => {
    setGiftToEdit(null);
    setIsAddEditDialogOpen(true);
  };

  const handleOpenEditDialog = (gift: Gift) => {
    setGiftToEdit(gift);
    setIsAddEditDialogOpen(true);
  };
  
  const handleDeleteRequest = (gift: Gift) => {
    setGiftToDelete(gift);
  };

  const handleConfirmDelete = async () => {
    if (!giftToDelete) return;
    setIsDeleting(true);
    const result = await deleteGiftAction(giftToDelete.id);
    setIsDeleting(false);
    setGiftToDelete(null);

    if (result.success) {
      toast({ title: "Gift Deleted", description: "The gift record has been successfully deleted." });
      fetchData();
    } else {
      toast({ title: "Error", description: result.error || "Could not delete the gift record.", variant: "destructive" });
    }
  };
  
  const renderPagination = () => {
    // Pagination logic remains the same
    return null; // Placeholder
  };
  
  if (!currentUser || !['SYSTEM_ADMIN', 'ADMIN', 'CRM'].includes(currentUser.role)) {
    return <div className="p-8 text-center">Access Denied.</div>
  }

  return (
    <>
      <div className="space-y-6 p-1 sm:p-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
          <div><h1 className="page-title">Client Gifts</h1><p className="page-description">Manage and track gifts given to clients.</p></div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button size="lg" onClick={handleOpenAddDialog} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground h-10 shadow-md">
              <PlusCircle className="mr-2 h-5 w-5" />Create Gift
            </Button>
          </div>
        </div>
        <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
          <CardHeader className="border-b p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-card-foreground text-xl">All Gift Records</CardTitle>
              <div className="relative flex-grow sm:flex-grow-0 sm:max-w-xs w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search gifts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-background h-10 rounded-md w-full"/>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Gift ID</TableHead>
                    <TableHead>Gift Item</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Date Given</TableHead>
                    <TableHead>Given By</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? ([...Array(10)].map((_, i) => (
                    <TableRow key={`skel-gift-${i}`}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  ))) : paginatedGifts.length > 0 ? (
                    paginatedGifts.map((gift) => (
                      <TableRow key={gift.id} className="hover:bg-muted/50">
                        <TableCell className="pl-6 font-mono text-primary">{gift.giftIdDisplay}</TableCell>
                        <TableCell className="font-medium">{gift.giftItemName}</TableCell>
                        <TableCell>
                          <div>{gift.recipientName}</div>
                          <div className="text-xs text-muted-foreground">{gift.recipientPhone}</div>
                        </TableCell>
                        <TableCell>{formatDate(gift.dateGiven)}</TableCell>
                        <TableCell>{gift.givenByUserName}</TableCell>
                        <TableCell className="pr-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => handleOpenEditDialog(gift)} className="cursor-pointer"><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleDeleteRequest(gift)} className="cursor-pointer text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6} className="h-48 text-center"><GiftIcon className="mx-auto h-12 w-12 opacity-30 mb-3" />No gift records found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
           <CardFooter className="py-4 border-t">
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    {/* Pagination logic here */}
                  </PaginationContent>
                </Pagination>
              )}
           </CardFooter>
        </Card>
      </div>
      
      <AddEditGiftDialog
        isOpen={isAddEditDialogOpen}
        onOpenChange={setIsAddEditDialogOpen}
        onGiftSaved={handleGiftSaved}
        gift={giftToEdit}
        currentUser={currentUser}
        giftOptions={giftOptions}
        allOrders={[]}
      />
      
      {giftToDelete && (
         <AlertDialog open={!!giftToDelete} onOpenChange={() => setGiftToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete the gift record for <span className="font-semibold">{giftToDelete.recipientName}</span>. This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setGiftToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeleting}>
                  {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      )}
    </>
  );
}
