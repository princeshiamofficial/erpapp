
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Search, Loader2, Vote as VoteIcon, Info } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getStatuses } from '@/lib/status-service';
import { getContrastTextColor } from '@/lib/color-utils';
import { getOrders } from '@/lib/order-service';
import { cn } from "@/lib/utils";
import type { TrackingLink, CustomStatus } from '@/types';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationEllipsis
} from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 25;

export default function VotePage() {
    const { currentUser } = useAuth();
    const [orders, setOrders] = useState<TrackingLink[]>([]);
    const [allStatuses, setAllStatuses] = useState<CustomStatus[]>([]);
    const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchData = useCallback(async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            // First import the service dynamically or use a server action
            const { getOrders } = await import('@/lib/order-service');
            const { getStatuses } = await import('@/lib/status-service');
            const { getAllVotes } = await import('@/lib/vote-service');

            const [fetchedOrders, fetchedStatuses, fetchedVotes] = await Promise.all([
                getOrders(),
                getStatuses(),
                getAllVotes()
            ]);

            setOrders(fetchedOrders);
            setAllStatuses(fetchedStatuses);

            // Calculate vote counts per phone
            const counts: Record<string, number> = {};
            fetchedVotes.forEach(v => {
                const phone = v.phone_number;
                counts[phone] = (counts[phone] || 0) + 1;
            });
            setVoteCounts(counts);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredOrders = useMemo(() => {
        // 1. Deduplicate by Phone Number and Job ID (prioritize latest)
        const seenPhones = new Set<string>();
        const seenIds = new Set<string>();
        const deduplicated: TrackingLink[] = [];

        // Sort by date descending first so we process newest first
        const sortedAll = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        sortedAll.forEach(order => {
            const phone = order.phoneNumber?.trim();
            const id = order.id?.trim();

            if (!id) return; // Should not happen with valid orders

            // Skip if we've already seen this Job ID
            if (seenIds.has(id)) return;

            // Skip if we've already seen this Phone Number
            if (phone && seenPhones.has(phone)) return;

            // If we passed checks, it's a unique entry for this view
            seenIds.add(id);
            if (phone) seenPhones.add(phone);
            deduplicated.push(order);
        });

        // 2. Apply Search Filter
        if (!searchTerm) {
            return deduplicated; // Already sorted by createdAt descending
        }

        const lowerSearchTerm = searchTerm.toLowerCase();
        return deduplicated.filter(order =>
            order.id.toLowerCase().includes(lowerSearchTerm) ||
            (order.companyName && order.companyName.toLowerCase().includes(lowerSearchTerm)) ||
            (order.phoneNumber && order.phoneNumber.toLowerCase().includes(lowerSearchTerm)) ||
            (order.address && order.address.toLowerCase().includes(lowerSearchTerm))
        );
    }, [orders, searchTerm]);

    const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

    const paginatedOrders = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredOrders, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const getStatusDisplayInfo = (statusId: string) => {
        const status = allStatuses.find(s => s.id === statusId);
        if (status) {
            return { name: status.name, color: status.color, textColor: getContrastTextColor(status.color) };
        }
        return { name: statusId, color: '#A1A1AA', textColor: '#FFFFFF' };
    };

    if (!currentUser) return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );

    const renderPagination = () => {
        const pageNumbers = [];
        const maxPagesToShow = 5;

        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
        } else {
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, currentPage + 2);

            if (currentPage < 3) endPage = maxPagesToShow;
            else if (currentPage > totalPages - 2) startPage = totalPages - maxPagesToShow + 1;

            if (startPage > 1) {
                pageNumbers.push(1);
                if (startPage > 2) pageNumbers.push('...');
            }
            for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) pageNumbers.push('...');
                pageNumbers.push(totalPages);
            }
        }
        return pageNumbers.map((page, index) => (
            <PaginationItem key={index}>
                {page === '...' ? <PaginationEllipsis />
                    : <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(page as number); }} className={cn(currentPage === page && 'bg-primary text-primary-foreground hover:bg-primary/90')}>
                        {page}
                    </PaginationLink>
                }
            </PaginationItem>
        ));
    };

    return (
        <div className="space-y-6">
            <Card className="overflow-hidden border-none bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 dark:ring-white/5">
                <CardHeader className="border-b border-slate-100/50 dark:border-white/5 px-6 py-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-900 rounded-xl shadow-lg ring-4 ring-slate-900/10">
                                <VoteIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    Voter List
                                </CardTitle>
                                <CardDescription className="text-xs font-medium text-slate-400">
                                    {orders.length} unique customers found
                                </CardDescription>
                            </div>
                        </div>
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by company or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-11 h-11 rounded-xl bg-white/50 dark:bg-slate-900/50 border-none shadow-sm ring-1 ring-slate-100 dark:ring-white/5 focus:ring-2 focus:ring-slate-900 transition-all font-medium text-sm"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-b border-slate-50 dark:border-white/5">
                                    <TableHead className="w-[60px] pl-8 py-5 text-[10px] uppercase tracking-wider font-bold text-slate-400">SL</TableHead>
                                    <TableHead className="py-5 text-[10px] uppercase tracking-wider font-bold text-slate-400">Company</TableHead>
                                    <TableHead className="py-5 text-[10px] uppercase tracking-wider font-bold text-slate-400">Phone</TableHead>
                                    <TableHead className="py-5 text-[10px] uppercase tracking-wider font-bold text-slate-400">Address</TableHead>
                                    <TableHead className="py-5 text-center text-[10px] uppercase tracking-wider font-bold text-slate-400">Status</TableHead>
                                    <TableHead className="pr-8 py-5 text-right text-[10px] uppercase tracking-wider font-bold text-slate-400">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={i} className="animate-pulse">
                                            <TableCell className="pl-8"><div className="h-4 w-4 bg-slate-100 dark:bg-slate-800 rounded" /></TableCell>
                                            <TableCell><div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded" /></TableCell>
                                            <TableCell><div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded" /></TableCell>
                                            <TableCell><div className="h-4 w-40 bg-slate-100 dark:bg-slate-800 rounded" /></TableCell>
                                            <TableCell className="text-center"><div className="h-6 w-20 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full" /></TableCell>
                                            <TableCell className="pr-8 text-right"><div className="h-9 w-24 ml-auto bg-slate-100 dark:bg-slate-800 rounded-xl" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : paginatedOrders.length > 0 ? (
                                    paginatedOrders.map((order, index) => {
                                        const statusInfo = getStatusDisplayInfo(order.currentStatus);
                                        const sl = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                                        return (
                                            <TableRow key={order.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-all border-b border-slate-50 dark:border-white/5">
                                                <TableCell className="pl-8 py-4 font-bold text-[10px] text-slate-300 dark:text-slate-600">
                                                    {sl < 10 ? `0${sl}` : sl}
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-primary transition-colors">
                                                        {order.companyName}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-medium font-mono">{order.id}</div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <span className="text-slate-500 dark:text-slate-400 font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                                        {order.phoneNumber || 'N/A'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="text-slate-500 dark:text-slate-400 text-xs max-w-[200px] truncate font-medium" title={order.address}>
                                                        {order.address || 'N/A'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 text-center">
                                                    {voteCounts[order.phoneNumber] > 0 ? (
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold tracking-tight">
                                                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                                            VOTED
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-bold tracking-tight">
                                                            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                                            PENDING
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="pr-8 py-4 text-right">
                                                    <Link
                                                        href={`/vote/${order.phoneNumber}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center justify-center gap-2 rounded-xl text-[11px] font-bold transition-all h-9 px-4 bg-slate-900 text-white hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-slate-900/10"
                                                    >
                                                        <Info className="h-3.5 w-3.5" />
                                                        VOTE INFO
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-20">
                                            <div className="flex flex-col items-center gap-3">
                                                <VoteIcon className="h-12 w-12 text-muted-foreground/30" />
                                                <p className="text-lg font-medium text-muted-foreground">No orders found.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                {totalPages > 1 && (
                    <div className="py-6 border-t bg-muted/10">
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }}
                                        className={cn(currentPage === 1 && 'pointer-events-none opacity-50')}
                                    />
                                </PaginationItem>
                                {renderPagination()}
                                <PaginationItem>
                                    <PaginationNext
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                                        className={cn(currentPage === totalPages && 'pointer-events-none opacity-50')}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}
            </Card>
        </div>
    );
}
