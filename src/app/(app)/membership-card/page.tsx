"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Edit3, Trash2, MoreVertical, CreditCard, Loader2, Truck } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import type { Gift, User, ServiceGiftItem, TrackingLink } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { getGifts as fetchGifts, deleteGift as deleteGiftAction } from './actions';
import { getGifts as getGiftOptions } from '@/lib/service-options-service';
import { getOrders } from '@/lib/order-service';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";

const AddEditCardDialog = dynamic(() => import('@/components/membership-card/AddEditCardDialog').then(mod => mod.AddEditCardDialog));
const CardCourierDialog = dynamic(() => import('@/components/membership-card/CardCourierDialog').then(mod => mod.CardCourierDialog));

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  try {
    return format(parseISO(dateString), 'd MMM yyyy');
  } catch (e) {
    return "Invalid Date";
  }
};

const ITEMS_PER_PAGE = 25;

export default function MembershipCardPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [gifts, setGifts] = useState<Gift[]>([]);
  const [giftOptions, setGiftOptions] = useState<ServiceGiftItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [allOrders, setAllOrders] = useState<TrackingLink[]>([]);

  const [giftToEdit, setGiftToEdit] = useState<Gift | null>(null);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);

  const [giftToDelete, setGiftToDelete] = useState<Gift | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  const [giftForCourier, setGiftForCourier] = useState<Gift | null>(null);
  const [isCourierDialogOpen, setIsCourierDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedGifts, fetchedGiftOptions, fetchedOrders] = await Promise.all([
        fetchGifts(),
        getGiftOptions(),
        getOrders(),
      ]);
      setGifts(fetchedGifts);
      setGiftOptions(fetchedGiftOptions);
      setAllOrders(fetchedOrders);
    } catch (error) {
      console.error("Failed to fetch card data:", error);
      toast({ title: "Error", description: "Could not load membership card data.", variant: "destructive" });
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
    return result.filter(gift => {
      const linkedOrder = gift.orderId ? allOrders.find(o => o.id === gift.orderId) : null;
      const jobDisplayId = linkedOrder ? (linkedOrder.companyName || '').split(' • ')[0].trim().toLowerCase() : '';
      
      return (
        gift.giftIdDisplay.toLowerCase().includes(lowerSearchTerm) ||
        (gift.orderId && gift.orderId.toLowerCase().includes(lowerSearchTerm)) ||
        jobDisplayId.includes(lowerSearchTerm) ||
        gift.recipientName.toLowerCase().includes(lowerSearchTerm) ||
        gift.recipientPhone.toLowerCase().includes(lowerSearchTerm) ||
        (Array.isArray(gift.giftItemNames) && gift.giftItemNames.some(name => name.toLowerCase().includes(lowerSearchTerm)))
      );
    });
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

  const handleOpenCourierDialog = (gift: Gift) => {
    setGiftForCourier(gift);
    setIsCourierDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!giftToDelete) return;
    setIsDeleting(true);
    const result = await deleteGiftAction(giftToDelete.id);
    setIsDeleting(false);
    setGiftToDelete(null);

    if (result.success) {
      toast({ title: "Card Deleted", description: "The membership card record has been successfully deleted." });
      fetchData();
    } else {
      toast({ title: "Error", description: result.error || "Could not delete the membership card record.", variant: "destructive" });
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis1');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push('ellipsis2');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              href="#" 
              onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage(currentPage - 1); }}
              className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
            />
          </PaginationItem>
          
          {pages.map((page, idx) => (
            <PaginationItem key={idx}>
              {page === 'ellipsis1' || page === 'ellipsis2' ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  href="#"
                  onClick={(e) => { e.preventDefault(); setCurrentPage(page as number); }}
                  isActive={currentPage === page}
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext 
              href="#" 
              onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) setCurrentPage(currentPage + 1); }}
              className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  if (!currentUser || !['SYSTEM_ADMIN', 'ADMIN', 'CRM'].includes(currentUser.role)) {
    return <div className="p-8 text-center">Access Denied.</div>
  }

  return (
    <>
      <div className="space-y-6 p-1 sm:p-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
          <div><h1 className="page-title">Membership Cards</h1><p className="page-description">Manage and issue premium tier loyalty membership cards to your high-value customers.</p></div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button size="lg" onClick={handleOpenAddDialog} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground h-10 shadow-md">
              <PlusCircle className="mr-2 h-5 w-5" />Issue Card
            </Button>
          </div>
        </div>
        <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
          <CardHeader className="border-b p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-card-foreground text-xl">All Membership Cards</CardTitle>
              <div className="relative flex-grow sm:flex-grow-0 sm:max-w-xs w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search member, phone, card..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-background h-10 rounded-md w-full" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Issue ID</TableHead>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Card No.</TableHead>
                    <TableHead>Cardholder</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Date Issued</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading && [...Array(10)].map((_, i) => (
                      <TableRow key={`skel-gift-${i}`}>
                        <TableCell className="pl-6"><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell className="pr-6 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                      </TableRow>
                    ))}

                   {!isLoading && paginatedGifts.length > 0 && paginatedGifts.map((gift, index) => (
                     <TableRow key={gift.id || `gift-${index}`} className="hover:bg-muted/50">
                       <TableCell className="pl-6 font-mono text-primary font-bold">{gift.giftIdDisplay}</TableCell>
                       <TableCell className="font-mono text-muted-foreground">
                         {gift.orderId ? (() => {
                           const linkedOrder = allOrders.find(o => o.id === gift.orderId);
                           const displayId = linkedOrder ? (linkedOrder.companyName || '').split(' • ')[0].trim() : gift.orderId;
                           return (
                             <span className="text-muted-foreground">
                               {displayId}
                             </span>
                           );
                         })() : '—'}
                       </TableCell>
                       <TableCell className="font-medium">
                         {(Array.isArray(gift.giftItemNames) ? gift.giftItemNames : [gift.giftItemName]).join(', ')}
                       </TableCell>
                       <TableCell>
                         <div>{gift.recipientName}</div>
                       </TableCell>
                       <TableCell>{gift.recipientPhone}</TableCell>
                        <TableCell className="max-w-[250px] truncate text-muted-foreground text-sm" title={gift.recipientAddress}>
                          {gift.recipientAddress}
                        </TableCell>
                       <TableCell>{formatDate(gift.dateGiven)}</TableCell>
                       <TableCell className="pr-6 text-right">
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-8 w-8">
                               <MoreVertical className="h-4 w-4" />
                             </Button>
                           </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => handleOpenEditDialog(gift)} className="cursor-pointer">
                                <Edit3 className="mr-2 h-4 w-4" />Reissue
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleOpenCourierDialog(gift)} className="cursor-pointer">
                                <Truck className="mr-2 h-4 w-4" />Transfer to Courier
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleDeleteRequest(gift)} className="cursor-pointer text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                         </DropdownMenu>
                       </TableCell>
                     </TableRow>
                   ))}

                   {!isLoading && paginatedGifts.length === 0 && (
                     <TableRow key="empty-gifts">
                       <TableCell colSpan={8} className="h-48 text-center">
                         <CreditCard className="mx-auto h-12 w-12 opacity-30 mb-3" />
                         No card records found.
                       </TableCell>
                     </TableRow>
                   )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="py-4 border-t flex justify-center">
            {renderPagination()}
          </CardFooter>
        </Card>
      </div>

      <AddEditCardDialog
        isOpen={isAddEditDialogOpen}
        onOpenChange={setIsAddEditDialogOpen}
        onGiftSaved={handleGiftSaved}
        gift={giftToEdit}
        currentUser={currentUser}
        giftOptions={giftOptions}
        allOrders={allOrders}
      />

      <CardCourierDialog
        isOpen={isCourierDialogOpen}
        onOpenChange={setIsCourierDialogOpen}
        gift={giftForCourier}
        currentUser={currentUser}
        onSuccess={fetchData}
      />

      {giftToDelete && (
        <AlertDialog open={!!giftToDelete} onOpenChange={() => setGiftToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete the membership card record for <span className="font-semibold">{giftToDelete.recipientName}</span>. This cannot be undone.</AlertDialogDescription>
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
