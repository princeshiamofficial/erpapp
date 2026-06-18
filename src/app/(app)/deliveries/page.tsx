"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Eye, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DateRangePicker, type DateRange } from '@/components/dashboard/date-range-picker';
import type { TrackingLink, CustomStatus } from '@/types';
import { getDeliveredOrdersByDateRange } from '@/lib/order-service';
import { getStatuses } from '@/lib/status-service';
import { getContrastTextColor } from '@/lib/color-utils';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth, parseISO, format as formatDateFns } from 'date-fns';
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";

const formatDateForDisplay = (dateString: string | undefined) => {
  if (!dateString) return "N/A";
  try {
    return formatDateFns(parseISO(dateString), 'd MMM yyyy');
  } catch (e) {
    console.error("Invalid date string for formatting:", dateString, e);
    return "Invalid Date";
  }
};

const getInitials = (name: string | undefined): string => {
  if (!name) return '??';
  const names = name.split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return names[0].charAt(0).toUpperCase() + (names[names.length - 1] ? names[names.length - 1].charAt(0).toUpperCase() : '');
};

export default function DeliveriesPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<TrackingLink[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deliveredStatusId, setDeliveredStatusId] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return {
      from: startOfMonth(now),
      to: endOfMonth(now),
    };
  });
  const [dateRangeLabel, setDateRangeLabel] = useState<string>("This Month");

  const fetchDeliveries = useCallback(async (range: DateRange | undefined, page: number) => {
    setIsLoading(true);
    try {
      const fetchedStatuses = await getStatuses();
      setAllStatuses(fetchedStatuses);

      const delivStatus = fetchedStatuses.find(s => s.name.toLowerCase() === 'delivered');
      if (!delivStatus) {
        toast({ title: "Configuration Error", description: "'Delivered' status not found. Please ensure it's configured.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      setDeliveredStatusId(delivStatus.id);

      if (range?.from && range?.to) {
        const start = new Date(range.from);
        start.setHours(0, 0, 0, 0);
        const end = new Date(range.to);
        end.setHours(23, 59, 59, 999);

        // Format dates to MySQL compatible datetime format
        const startStr = formatDateFns(start, 'yyyy-MM-dd HH:mm:ss');
        const endStr = formatDateFns(end, 'yyyy-MM-dd HH:mm:ss');

        const limit = ITEMS_PER_PAGE;
        const offset = (page - 1) * ITEMS_PER_PAGE;

        const { orders: fetchedOrders, total } = await getDeliveredOrdersByDateRange(
          startStr,
          endStr,
          delivStatus.id,
          limit,
          offset
        );
        setOrders(fetchedOrders);
        setTotalOrders(total);
      } else {
        setOrders([]);
        setTotalOrders(0);
      }
    } catch (error) {
      console.error("Failed to fetch deliveries data:", error);
      toast({ title: "Error", description: "Could not load deliveries.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDeliveries(dateRange, currentPage);
  }, [dateRange, currentPage, fetchDeliveries]);

  const totalPages = Math.ceil(totalOrders / ITEMS_PER_PAGE);

  const getStatusDisplayInfo = useCallback((statusId: string): { name: string; color: string; textColor: string } => {
    const status = allStatuses.find(s => s.id === statusId);
    if (status) {
      return { name: status.name, color: status.color, textColor: getContrastTextColor(status.color) };
    }
    return { name: statusId, color: '#A1A1AA', textColor: '#FFFFFF' };
  }, [allStatuses]);

  return (
    <div className="space-y-8 p-1 sm:p-0">
      <DeliveryCard 
        title={`Deliveries (${dateRangeLabel})`}
        isLoading={isLoading}
        orders={orders}
        getStatusDisplayInfo={getStatusDisplayInfo}
        deliveredStatusId={deliveredStatusId}
        emptyText="No orders delivered in this period."
        headerAction={
          <DateRangePicker 
            initialRange={dateRange}
            onDateRangeChange={(range, label) => {
              setDateRange(range);
              setDateRangeLabel(label);
              setCurrentPage(1);
            }}
          />
        }
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
      />
    </div>
  );
}

interface DeliveryCardProps {
  title: string;
  isLoading: boolean;
  orders: TrackingLink[];
  getStatusDisplayInfo: (statusId: string) => { name: string; color: string; textColor: string };
  deliveredStatusId: string | undefined;
  emptyText: string;
  headerAction?: React.ReactNode;
  currentPage: number;
  totalPages: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

function DeliveryCard({ 
  title, 
  isLoading, 
  orders, 
  getStatusDisplayInfo, 
  deliveredStatusId, 
  emptyText,
  headerAction,
  currentPage,
  totalPages,
  setCurrentPage
}: DeliveryCardProps) {
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
    <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
      <CardHeader className="border-b p-5 bg-gradient-to-r from-muted/30 to-background flex flex-col sm:flex-row sm:items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-card-foreground text-xl">{title}</CardTitle>
        {headerAction}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Order ID</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>CRM Contact</TableHead>
                <TableHead>DR Assigned</TableHead>
                <TableHead className="text-right">Ordered On</TableHead>
                <TableHead className="text-right">Delivered On</TableHead>
                <TableHead className="pr-6 text-right">Current Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={`skel-${i}`}>
                    <TableCell className="pl-6"><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-24 inline-block" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-24 inline-block" /></TableCell>
                    <TableCell className="pr-6 text-right"><Skeleton className="h-6 w-28 rounded-full inline-block" /></TableCell>
                  </TableRow>
                ))
              ) : orders.length > 0 ? (
                orders.map((order) => {
                  const statusInfo = getStatusDisplayInfo(order.currentStatus);
                  const deliveryLog = [...order.statusHistory].reverse().find(log => log.status === deliveredStatusId);
                  return (
                    <TableRow key={order.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="pl-6">
                        <Link href={`/track/${order.id}`} className="font-medium text-primary hover:underline">
                          {order.id}
                        </Link>
                      </TableCell>
                      <TableCell className="text-card-foreground font-medium">{order.companyName}</TableCell>
                      <TableCell className="text-card-foreground">
                        <div className="flex items-center gap-2">
                          {order.crmUserName ? (
                            <>
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={order.assigneeAvatarUrl || undefined} alt={order.crmUserName} />
                                <AvatarFallback className="bg-muted text-[10px] font-bold">
                                  {getInitials(order.crmUserName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate max-w-[120px]">{order.crmUserName}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground italic">Unassigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-card-foreground">
                        <div className="flex items-center gap-2">
                          {order.designerRepresentativeName ? (
                            <>
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={order.designerRepresentativeAvatarUrl || undefined} alt={order.designerRepresentativeName} />
                                <AvatarFallback className="bg-muted text-[10px] font-bold">
                                  {getInitials(order.designerRepresentativeName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate max-w-[120px]">{order.designerRepresentativeName}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground italic">Unassigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground font-mono">
                        {formatDateForDisplay(order.createdAt)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground font-mono">
                        {deliveryLog ? formatDateForDisplay(deliveryLog.timestamp) : 'N/A'}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <Badge style={{ backgroundColor: statusInfo.color, color: statusInfo.textColor }} className="border-transparent shadow-sm">
                          {statusInfo.name}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 h-[320px]">
                    <Truck className="mx-auto h-12 w-12 opacity-30 mb-4 text-muted-foreground" />
                    <p className="text-lg text-muted-foreground font-semibold">{emptyText}</p>
                    <p className="text-sm text-muted-foreground/75 mt-1">Check back later or verify your delivery records.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="py-4 border-t">
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }}
                  aria-disabled={currentPage === 1}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              {renderPagination()}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                  aria-disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardFooter>
    </Card>
  );
}
