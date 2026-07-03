"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Edit3, Trash2, MoreVertical, CreditCard, Loader2, Truck } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useSocket } from "@/contexts/socket-context";
import { useRouter } from "next/navigation";
import type { Card as CardModel, User, ServiceGiftItem, TrackingLink } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { getGifts as fetchCards, deleteGift as deleteCardAction } from './actions';
import { getGifts as getCardOptions } from '@/lib/service-options-service';
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
const ShowCardDialog = dynamic(() => import('@/components/membership-card/ShowCardDialog').then(mod => mod.ShowCardDialog));

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
  const { socket } = useSocket();

  const [cards, setCards] = useState<CardModel[]>([]);
  const [cardOptions, setCardOptions] = useState<ServiceGiftItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [allOrders, setAllOrders] = useState<TrackingLink[]>([]);

  const [cardToEdit, setCardToEdit] = useState<CardModel | null>(null);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);

  const [cardToDelete, setCardToDelete] = useState<CardModel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  const [cardForCourier, setCardForCourier] = useState<CardModel | null>(null);
  const [isCourierDialogOpen, setIsCourierDialogOpen] = useState(false);
  const [cardToShow, setCardToShow] = useState<CardModel | null>(null);
  const [shouldShowConfetti, setShouldShowConfetti] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedCards, fetchedCardOptions, fetchedOrders] = await Promise.all([
        fetchCards(),
        getCardOptions(),
        getOrders(),
      ]);
      setCards(fetchedCards);
      setCardOptions(fetchedCardOptions);
      setAllOrders(fetchedOrders);
    } catch (error) {
      console.error("Failed to fetch card data:", error);
      toast({ title: "Error", description: "Could not load membership card data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchDataSilent = useCallback(async () => {
    try {
      const [fetchedCards, fetchedCardOptions, fetchedOrders] = await Promise.all([
        fetchCards(),
        getCardOptions(),
        getOrders(),
      ]);
      setCards(fetchedCards);
      setCardOptions(fetchedCardOptions);
      setAllOrders(fetchedOrders);
    } catch (error) {
      console.error("Failed to silently sync card data:", error);
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on("membership-card-updated", (data: any) => {
      console.log("Membership card updated remotely:", data);
      fetchDataSilent();
    });

    return () => {
      socket.off("membership-card-updated");
    };
  }, [socket, fetchDataSilent]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    } else {
      router.push('/login');
    }
  }, [currentUser, fetchData, router]);

  const filteredCards = useMemo(() => {
    let result = cards;
    if (currentUser?.role === 'CRM') {
      result = result.filter(card => card.givenByUserId === currentUser.id);
    }
    if (!searchTerm) return result;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return result.filter(card => {
      const linkedOrder = card.orderId ? allOrders.find(o => o.id === card.orderId) : null;
      const jobDisplayId = linkedOrder ? (linkedOrder.companyName || '').split(' • ')[0].trim().toLowerCase() : '';
      
      return (
        card.giftIdDisplay.toLowerCase().includes(lowerSearchTerm) ||
        (card.orderId && card.orderId.toLowerCase().includes(lowerSearchTerm)) ||
        jobDisplayId.includes(lowerSearchTerm) ||
        card.recipientName.toLowerCase().includes(lowerSearchTerm) ||
        card.recipientPhone.toLowerCase().includes(lowerSearchTerm) ||
        (Array.isArray(card.giftItemNames) && card.giftItemNames.some(name => name.toLowerCase().includes(lowerSearchTerm)))
      );
    });
  }, [cards, searchTerm, currentUser]);

  const totalPages = Math.ceil(filteredCards.length / ITEMS_PER_PAGE);

  const paginatedCards = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCards.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCards, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleCardSaved = (savedCard: CardModel) => {
    setCards(prev => {
      const exists = prev.some(c => c.id === savedCard.id);
      if (exists) {
        return prev.map(c => c.id === savedCard.id ? savedCard : c);
      } else {
        return [savedCard, ...prev];
      }
    });
    setIsAddEditDialogOpen(false);
    setCardToEdit(null);
    
    // Automatically show the card with confetti
    setCardToShow(savedCard);
    setShouldShowConfetti(true);
    
    fetchDataSilent();
  };

  const handleOpenAddDialog = () => {
    setCardToEdit(null);
    setIsAddEditDialogOpen(true);
  };

  const handleOpenEditDialog = (card: CardModel) => {
    setCardToEdit(card);
    setIsAddEditDialogOpen(true);
  };

  const handleDeleteRequest = (card: CardModel) => {
    setCardToDelete(card);
  };

  const handleOpenCourierDialog = (card: CardModel) => {
    setCardForCourier(card);
    setIsCourierDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!cardToDelete) return;
    setIsDeleting(true);
    const result = await deleteCardAction(cardToDelete.id);
    setIsDeleting(false);

    if (result.success) {
      setCards(prev => prev.filter(c => c.id !== cardToDelete.id));
      setCardToDelete(null);
      toast({ title: "Card Deleted", description: "The membership card record has been successfully deleted." });
      fetchDataSilent();
    } else {
      setCardToDelete(null);
      toast({ title: "Error", description: result.error || "Could not delete the membership card record.", variant: "destructive" });
    }
  };

  const handleCourierSuccess = (trackingCode: string, consignmentId: string) => {
    if (cardForCourier) {
      setCards(prev => prev.map(c => {
        if (c.id === cardForCourier.id) {
          return {
            ...c,
            courierStatus: 'Shipped',
            packzyConsignmentId: consignmentId,
            packzyTrackingCode: trackingCode,
          };
        }
        return c;
      }));
    }
    fetchDataSilent();
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

  if (!currentUser || !['SYSTEM_ADMIN', 'ADMIN', 'CRM', 'LR'].includes(currentUser.role)) {
    return <div className="p-8 text-center">Access Denied.</div>
  }

  return (
    <>
      <div className="space-y-6 p-1 sm:p-0">
        <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
          <CardHeader className="border-b p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-card-foreground text-xl">All Membership Cards</CardTitle>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0 sm:max-w-xs w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search member, phone, card..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-background h-10 rounded-md w-full" />
                </div>
                <Button onClick={handleOpenAddDialog} className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 shadow-md whitespace-nowrap">
                  <PlusCircle className="mr-2 h-4 w-4" />Issue Card
                </Button>
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
                      <TableRow key={`skel-card-${i}`}>
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

                   {!isLoading && paginatedCards.length > 0 && paginatedCards.map((cardItem, index) => (
                     <TableRow key={cardItem.id || `card-${index}`} className="hover:bg-muted/50">
                       <TableCell className="pl-6 font-mono text-primary font-bold">{cardItem.giftIdDisplay}</TableCell>
                       <TableCell className="font-mono text-muted-foreground">
                         {cardItem.orderId ? (() => {
                           const linkedOrder = allOrders.find(o => o.id === cardItem.orderId);
                           const displayId = linkedOrder ? (linkedOrder.companyName || '').split(' • ')[0].trim() : cardItem.orderId;
                           return (
                             <span className="text-muted-foreground">
                               {displayId}
                             </span>
                           );
                         })() : '—'}
                       </TableCell>
                        <TableCell className="font-card-no font-medium text-foreground">
                          {(Array.isArray(cardItem.giftItemNames) ? cardItem.giftItemNames : [cardItem.giftItemName]).join(', ')}
                        </TableCell>
                       <TableCell>
                         <div>{cardItem.recipientName}</div>
                       </TableCell>
                       <TableCell>{cardItem.recipientPhone}</TableCell>
                        <TableCell className="max-w-[250px] truncate text-muted-foreground text-sm" title={cardItem.recipientAddress}>
                          {cardItem.recipientAddress}
                        </TableCell>
                       <TableCell>{formatDate(cardItem.dateGiven)}</TableCell>
                       <TableCell className="pr-6 text-right">
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-8 w-8">
                               <MoreVertical className="h-4 w-4" />
                             </Button>
                           </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setCardToShow(cardItem)} className="cursor-pointer">
                                <CreditCard className="mr-2 h-4 w-4" />Show Card
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleOpenEditDialog(cardItem)} className="cursor-pointer">
                                <Edit3 className="mr-2 h-4 w-4" />Reissue
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleDeleteRequest(cardItem)} className="cursor-pointer text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                         </DropdownMenu>
                       </TableCell>
                     </TableRow>
                   ))}

                   {!isLoading && paginatedCards.length === 0 && (
                     <TableRow key="empty-cards">
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
        onCardSaved={handleCardSaved}
        card={cardToEdit}
        currentUser={currentUser}
        cardOptions={cardOptions}
        allOrders={allOrders}
        existingCards={cards}
      />

      <CardCourierDialog
        isOpen={isCourierDialogOpen}
        onOpenChange={setIsCourierDialogOpen}
        card={cardForCourier}
        currentUser={currentUser}
        onSuccess={handleCourierSuccess}
      />

      <ShowCardDialog
        isOpen={!!cardToShow}
        onOpenChange={(open) => {
          if (!open) {
            setCardToShow(null);
            setShouldShowConfetti(false);
          }
        }}
        card={cardToShow}
        allOrders={allOrders}
        showConfetti={shouldShowConfetti}
      />

      {cardToDelete && (
        <AlertDialog open={!!cardToDelete} onOpenChange={() => setCardToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete the membership card record for <span className="font-semibold">{cardToDelete.recipientName}</span>. This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCardToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
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
