
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Search, Loader2, Phone, Info, Calendar, User, Building2, LayoutGrid, List, Plus } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from "@/lib/utils";
import type { FollowUp, FollowUpStatusType, CustomerType } from '@/types';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationEllipsis
} from "@/components/ui/pagination";
import { FollowUpKanbanClient } from '@/components/follow-up/FollowUpKanbanClient';

const ITEMS_PER_PAGE = 25;

export default function FollowUpPage() {
    const { currentUser } = useAuth();
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [followUps, setFollowUps] = useState<FollowUp[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchData = useCallback(async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const { getFollowUps } = await import('@/lib/follow-up-service');
            const fetched = await getFollowUps();
            setFollowUps(fetched);
        } catch (error) {
            console.error("Failed to fetch follow-ups:", error);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(), 30000); // Silent refresh
        return () => clearInterval(interval);
    }, [fetchData]);

    const filteredFollowUps = useMemo(() => {
        if (!searchTerm) {
            return followUps;
        }

        const lowerSearchTerm = searchTerm.toLowerCase();
        return followUps.filter(item =>
            (item.contactName && item.contactName.toLowerCase().includes(lowerSearchTerm)) ||
            (item.businessName && item.businessName.toLowerCase().includes(lowerSearchTerm)) ||
            (item.phone && item.phone.toLowerCase().includes(lowerSearchTerm)) ||
            (item.address && item.address.toLowerCase().includes(lowerSearchTerm))
        );
    }, [followUps, searchTerm]);

    const totalPages = Math.ceil(filteredFollowUps.length / ITEMS_PER_PAGE);

    const paginatedFollowUps = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredFollowUps.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredFollowUps, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const getStatusBadge = (status: FollowUpStatusType) => {
        const variants: Record<string, string> = {
            'New Lead': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50',
            'Contacted': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200/50',
            'Qualified': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200/50',
            'Proposal Sent': 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200/50',
            'Negotiation': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/50',
            'Won': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50',
            'Lost': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/50',
        };

        return (
            <Badge className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border", variants[status] || 'bg-slate-100 text-slate-500')}>
                {status.toUpperCase()}
            </Badge>
        );
    };

    const getCustomerTypeBadge = (type: CustomerType | null | undefined) => {
        if (!type) return null;
        const variants: Record<string, string> = {
            'WARM': 'bg-orange-500 text-white',
            'COLD': 'bg-blue-400 text-white',
            'Order Lock': 'bg-emerald-600 text-white',
        };

        return (
            <Badge className={cn("px-2 py-0 h-4 text-[8px] font-black rounded-sm", variants[type])}>
                {type}
            </Badge>
        );
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
        <div className="flex flex-col h-[calc(100vh-theme(spacing.24))] space-y-6">

            {/* Main Content */}
            {viewMode === 'kanban' ? (
                <div className="flex-1 overflow-hidden">
                    <FollowUpKanbanClient />
                </div>
            ) : (
                <Card className="flex-1 overflow-hidden border-none bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 dark:ring-white/5 flex flex-col">
                    <CardHeader className="border-b border-slate-100/50 dark:border-white/5 px-6 py-5 shrink-0">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search follow-ups..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-11 h-11 rounded-xl bg-white/50 dark:bg-slate-900/50 border-none shadow-sm ring-1 ring-slate-100 dark:ring-white/5 focus:ring-2 focus:ring-primary/50 transition-all font-medium text-sm"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10 shadow-sm">
                                <TableRow className="hover:bg-transparent border-b border-slate-50 dark:border-white/5">
                                    <TableHead className="w-[60px] pl-8 py-5 text-[10px] uppercase tracking-wider font-bold text-slate-400">SL</TableHead>
                                    <TableHead className="py-5 text-[10px] uppercase tracking-wider font-bold text-slate-400">Biz Info</TableHead>
                                    <TableHead className="py-5 text-[10px] uppercase tracking-wider font-bold text-slate-400">Contact</TableHead>
                                    <TableHead className="py-5 text-[10px] uppercase tracking-wider font-bold text-slate-400">Location</TableHead>
                                    <TableHead className="py-5 text-center text-[10px] uppercase tracking-wider font-bold text-slate-400">Status</TableHead>
                                    <TableHead className="pr-8 py-5 text-right text-[10px] uppercase tracking-wider font-bold text-slate-400">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    [...Array(10)].map((_, i) => (
                                        <TableRow key={i} className="animate-pulse">
                                            <TableCell className="pl-8"><div className="h-4 w-4 bg-slate-100 dark:bg-slate-800 rounded" /></TableCell>
                                            <TableCell><div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded" /></TableCell>
                                            <TableCell><div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded" /></TableCell>
                                            <TableCell><div className="h-4 w-40 bg-slate-100 dark:bg-slate-800 rounded" /></TableCell>
                                            <TableCell className="text-center"><div className="h-6 w-20 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full" /></TableCell>
                                            <TableCell className="pr-8 text-right"><div className="h-9 w-24 ml-auto bg-slate-100 dark:bg-slate-800 rounded-xl" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : paginatedFollowUps.length > 0 ? (
                                    paginatedFollowUps.map((item, index) => {
                                        const sl = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                                        return (
                                            <TableRow key={item.id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-all border-b border-slate-50 dark:border-white/5">
                                                <TableCell className="pl-8 py-4 font-bold text-[10px] text-slate-300 dark:text-slate-600">
                                                    {sl < 10 ? `0${sl}` : sl}
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-primary transition-colors line-clamp-1">
                                                                {item.businessName || item.contactName}
                                                            </span>
                                                            {getCustomerTypeBadge(item.customerType)}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                                                            <User className="h-3 w-3" />
                                                            {item.contactName}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-slate-600 dark:text-slate-300 font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md inline-block w-fit">
                                                            {item.phone || 'N/A'}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                                                            <Calendar className="h-3 w-3" />
                                                            {new Date(item.date).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="text-slate-500 dark:text-slate-400 text-xs max-w-[200px] truncate font-medium" title={item.address}>
                                                        {item.address || 'N/A'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-medium italic">
                                                        {item.district}, {item.division}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 text-center">
                                                    {getStatusBadge(item.status)}
                                                </TableCell>
                                                <TableCell className="pr-8 py-4 text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="rounded-xl text-[11px] font-bold h-9 px-4 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                                                    >
                                                        <Info className="h-3.5 w-3.5 mr-2" />
                                                        DETAILS
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-20">
                                            <div className="flex flex-col items-center gap-3">
                                                <Phone className="h-12 w-12 text-muted-foreground/30" />
                                                <p className="text-lg font-medium text-muted-foreground">No records found.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    {totalPages > 1 && (
                        <div className="py-6 border-t bg-muted/10 shrink-0">
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
            )}
        </div>
    );
}
