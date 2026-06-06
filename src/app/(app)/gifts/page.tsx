"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { 
  PlusCircle, 
  Search, 
  Edit3, 
  Trash2, 
  MoreVertical, 
  Gift as GiftIcon, 
  Loader2, 
  Truck, 
  Award, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles, 
  ShieldCheck, 
  Crown, 
  Calendar,
  MapPin,
  ClipboardList
} from "lucide-react";
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
import { motion, AnimatePresence } from "framer-motion";

const AddEditGiftDialog = dynamic(() => import('@/components/gifts/AddEditGiftDialog').then(mod => mod.AddEditGiftDialog));
const GiftCourierDialog = dynamic(() => import('@/components/gifts/GiftCourierDialog').then(mod => mod.GiftCourierDialog));

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
  const [allOrders, setAllOrders] = useState<TrackingLink[]>([]);

  const [giftToEdit, setGiftToEdit] = useState<Gift | null>(null);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);

  const [giftToDelete, setGiftToDelete] = useState<Gift | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [previewIndex, setPreviewIndex] = useState(0);

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

  const activePreviewGift = useMemo(() => {
    if (paginatedGifts.length > 0) {
      const index = Math.min(previewIndex, paginatedGifts.length - 1);
      return paginatedGifts[index >= 0 ? index : 0];
    }
    return null;
  }, [paginatedGifts, previewIndex]);

  useEffect(() => {
    setCurrentPage(1);
    setPreviewIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    setPreviewIndex(0);
  }, [currentPage]);

  const stats = useMemo(() => {
    const total = gifts.length;
    const shipped = gifts.filter(g => g.courierStatus === 'Shipped').length;
    const delivered = gifts.filter(g => g.courierStatus === 'Delivered').length;
    const pendingCourier = gifts.filter(g => !g.courierStatus || g.courierStatus === 'Pending').length;
    return { total, shipped, delivered, pendingCourier };
  }, [gifts]);

  const getVoucherStyle = (index: number, itemName?: string) => {
    const name = (itemName || "").toLowerCase();
    if (name.includes("combo") || name.includes("package") || index % 3 === 2) {
      return {
        background: 'linear-gradient(135deg, rgba(88,28,135,0.75) 0%, rgba(124,58,237,0.85) 50%, rgba(76,29,149,0.95) 100%)',
        border: '1px solid rgba(139,92,246,0.3)',
        glow: 'rgba(139,92,246,0.25)',
        badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        textColor: 'text-purple-100',
        subText: 'text-purple-200/60',
        accentColor: '#8B5CF6',
        cardIcon: <Crown className="w-8 h-8 text-purple-300" />
      };
    } else if (name.includes("executive") || name.includes("vip") || index % 3 === 1) {
      return {
        background: 'linear-gradient(135deg, rgba(234,179,8,0.25) 0%, rgba(202,138,4,0.35) 50%, rgba(133,77,14,0.45) 100%)',
        border: '1px solid rgba(234,179,8,0.4)',
        glow: 'rgba(234,179,8,0.25)',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        textColor: 'text-amber-100',
        subText: 'text-amber-200/60',
        accentColor: '#F59E0B',
        cardIcon: <Sparkles className="w-8 h-8 text-amber-400" />
      };
    } else {
      return {
        background: 'linear-gradient(135deg, rgba(225,29,72,0.25) 0%, rgba(190,24,74,0.35) 100%)',
        border: '1px solid rgba(225,29,72,0.3)',
        glow: 'rgba(225,29,72,0.2)',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        textColor: 'text-rose-100',
        subText: 'text-rose-300/60',
        accentColor: '#E11D48',
        cardIcon: <GiftIcon className="w-8 h-8 text-rose-300" />
      };
    }
  };

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
      toast({ title: "Gift Deleted", description: "The gift record has been successfully deleted." });
      fetchData();
    } else {
      toast({ title: "Error", description: result.error || "Could not delete the gift record.", variant: "destructive" });
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
      <div className="space-y-8 p-1 sm:p-0">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 page-header">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <GiftIcon className="w-8 h-8 text-primary" />
              Client Gifts
            </h1>
            <p className="page-description">Manage, issue, and track premium gifts distributed to clients and high-value orders.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button size="lg" onClick={handleOpenAddDialog} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground h-10 shadow-lg transition-transform hover:scale-[1.02]">
              <PlusCircle className="mr-2 h-5 w-5" />Create Gift
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { title: "Total Gifts Issued", val: stats.total, desc: "Total gift records issued", icon: <GiftIcon className="w-5 h-5 text-indigo-400" />, bg: "bg-indigo-500/10 border-indigo-500/20" },
            { title: "Shipped via Courier", val: stats.shipped, desc: "Sent to SteadFast Courier", icon: <Truck className="w-5 h-5 text-amber-400" />, bg: "bg-amber-500/10 border-amber-500/20" },
            { title: "Delivered to Client", val: stats.delivered, desc: "Consignments delivered", icon: <CheckCircle className="w-5 h-5 text-emerald-400" />, bg: "bg-emerald-500/10 border-emerald-500/20" },
            { title: "Pending Courier Dispatch", val: stats.pendingCourier, desc: "Awaiting courier transfer", icon: <AlertTriangle className="w-5 h-5 text-rose-400" />, bg: "bg-rose-500/10 border-rose-500/20" }
          ].map((item, idx) => (
            <Card key={idx} className={`shadow-md border ${item.bg}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <span className="text-sm font-semibold text-muted-foreground">{item.title}</span>
                {item.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{item.val}</div>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Interactive Gift Preview */}
          <div className="lg:col-span-1 flex flex-col space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-primary" /> Active Gift Card View
            </h2>

            <AnimatePresence mode="wait">
              {activePreviewGift ? (() => {
                const voucherDesign = getVoucherStyle(previewIndex, (activePreviewGift.giftItemNames || [activePreviewGift.giftItemName]).join(', '));
                return (
                  <motion.div
                    key={activePreviewGift.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3 }}
                    className="relative w-full aspect-[1.58/1] rounded-2xl p-6 overflow-hidden flex flex-col justify-between shadow-2xl transition-all"
                    style={{
                      background: voucherDesign.background,
                      border: voucherDesign.border,
                      boxShadow: `0 20px 45px -10px ${voucherDesign.glow}`
                    }}
                  >
                    {/* Background Glass Highlights */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-xl pointer-events-none" />

                    {/* Voucher Top Row */}
                    <div className="flex justify-between items-start z-10">
                      <div>
                        <h3 className="font-bold text-xs uppercase tracking-[0.2em] opacity-60">Color Hut Gift</h3>
                        <p className={`text-lg font-bold ${voucherDesign.textColor} tracking-tight mt-1 truncate max-w-[200px]`} title={(activePreviewGift.giftItemNames || [activePreviewGift.giftItemName]).join(', ')}>
                          {(activePreviewGift.giftItemNames || [activePreviewGift.giftItemName]).join(', ')}
                        </p>
                      </div>
                      {voucherDesign.cardIcon}
                    </div>

                    {/* Voucher Middle Row (Display ID & Courier Status) */}
                    <div className="z-10 py-1 flex justify-between items-center">
                      <p className="font-mono text-lg tracking-[0.15em] font-semibold text-slate-100/90 shadow-sm drop-shadow-md">
                        {activePreviewGift.giftIdDisplay}
                      </p>
                      {activePreviewGift.courierStatus && (
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {activePreviewGift.courierStatus}
                        </span>
                      )}
                    </div>

                    {/* Voucher Bottom Row */}
                    <div className="flex justify-between items-end z-10 border-t border-white/5 pt-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider opacity-40">Recipient</p>
                        <p className="font-semibold text-sm text-white/90 truncate max-w-[120px]" title={activePreviewGift.recipientName}>
                          {activePreviewGift.recipientName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider opacity-40">Phone</p>
                        <p className="font-mono text-xs text-white/95">{activePreviewGift.recipientPhone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider opacity-40">Date Given</p>
                        <p className="font-semibold text-xs text-white/90">{formatDate(activePreviewGift.dateGiven)}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })() : (
                <div className="relative w-full aspect-[1.58/1] rounded-2xl p-6 overflow-hidden flex flex-col justify-center items-center border border-dashed border-muted-foreground/30 bg-muted/10">
                  <GiftIcon className="w-10 h-10 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Select a gift to view preview</p>
                </div>
              )}
            </AnimatePresence>

            <Card className="border shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Gift Distribution Channels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs text-muted-foreground">
                <div className="flex justify-between border-b pb-2">
                  <span className="font-semibold text-emerald-400">SteadFast Courier</span>
                  <span className="text-slate-300">Auto-created consignment, real-time Telegram alerts</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="font-semibold text-indigo-400">Hand Delivery</span>
                  <span className="text-slate-300">Distributed directly by CRM team at client location</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="font-semibold text-amber-400">Order Linked</span>
                  <span className="text-slate-300">Directly associated with active/completed production jobs</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Database Grid */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
              <CardHeader className="border-b p-5">
                <div className="flex flex-col space-y-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-card-foreground text-lg flex items-center gap-1.5">
                      <GiftIcon className="w-5 h-5 text-primary" /> Gift Records Directory
                    </CardTitle>
                  </div>
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search gifts, Job ID, recipient..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="pl-10 bg-background h-10 rounded-md w-full" 
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">Gift ID</TableHead>
                        <TableHead>Job ID</TableHead>
                        <TableHead>Gift Item(s)</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Date Given</TableHead>
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

                      {!isLoading && paginatedGifts.length > 0 && paginatedGifts.map((gift, index) => {
                        const isSelected = activePreviewGift?.id === gift.id;
                        return (
                          <TableRow 
                            key={gift.id || `gift-${index}`} 
                            onClick={() => setPreviewIndex(index)}
                            className={cn(
                              "cursor-pointer hover:bg-muted/30 transition-colors",
                              isSelected && "bg-muted/40 font-medium border-l-4 border-l-primary"
                            )}
                          >
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
                            <TableCell className="pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onSelect={() => handleOpenEditDialog(gift)} className="cursor-pointer">
                                    <Edit3 className="mr-2 h-4 w-4" />Edit
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
                        );
                      })}

                      {!isLoading && paginatedGifts.length === 0 && (
                        <TableRow key="empty-gifts">
                          <TableCell colSpan={8} className="h-48 text-center">
                            <GiftIcon className="mx-auto h-12 w-12 opacity-30 mb-3" />
                            No gift records found.
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

        </div>

      </div>

      <AddEditGiftDialog
        isOpen={isAddEditDialogOpen}
        onOpenChange={setIsAddEditDialogOpen}
        onGiftSaved={handleGiftSaved}
        gift={giftToEdit}
        currentUser={currentUser}
        giftOptions={giftOptions}
        allOrders={allOrders}
      />

      <GiftCourierDialog
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
