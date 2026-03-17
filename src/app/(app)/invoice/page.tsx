
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Printer, Search, Package, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TrackingLink, CustomStatus, AdvancePaymentRecord, User } from '@/types';
import { getOrdersPaginated } from '@/lib/order-service';
import { getStatuses } from '@/lib/status-service';
import { getContrastTextColor } from '@/lib/color-utils';
import { getUsers } from '@/lib/user-service';
import { getFullOrdersByIds } from './actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Checkbox } from "@/components/ui/checkbox";
import { InvoiceDetailsClient } from '../invoice/[orderId]/InvoiceDetailsClient';
import { cn } from '@/lib/utils';
import { useInView } from 'react-intersection-observer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};

export default function InvoiceListPage() {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [allOrders, setAllOrders] = useState<TrackingLink[]>([]);
  const [allStatuses, setAllStatuses] = useState<CustomStatus[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [ordersToPrint, setOrdersToPrint] = useState<TrackingLink[] | null>(null);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

  // Pagination states
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const LIMIT = 20;

  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: false,
  });


  const fetchInvoiceData = useCallback(async (isInitial = true, currentSearch = searchTerm, currentStatus = selectedStatus) => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    if (isInitial) {
      setIsLoading(true);
      setPage(0);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const offset = isInitial ? 0 : (page + 1) * LIMIT;
      const effectiveStatus = currentStatus === 'all' ? '' : currentStatus;

      // Fetch statuses and users only once
      const promises: any[] = [
        getOrdersPaginated(LIMIT, offset, currentSearch, effectiveStatus),
      ];

      if (allStatuses.length === 0) promises.push(getStatuses());
      if (allUsers.length === 0) promises.push(getUsers());

      const [orderResult, fetchedStatuses, fetchedUsers] = await Promise.all(promises);

      if (isInitial) {
        setAllOrders(orderResult.orders);
        setPage(0);
      } else {
        setAllOrders(prev => [...prev, ...orderResult.orders]);
        setPage(prev => prev + 1);
      }

      setTotalCount(orderResult.total);
      const currentOrdersCount = isInitial ? orderResult.orders.length : allOrders.length + orderResult.orders.length;
      setHasMore(currentOrdersCount < orderResult.total);

      if (fetchedStatuses) setAllStatuses(fetchedStatuses);
      if (fetchedUsers) setAllUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to fetch orders or statuses:", error);
      toast({ title: "Error", description: "Could not load invoice data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [currentUser, toast, page, allStatuses.length, allUsers.length, searchTerm, selectedStatus, LIMIT]);

  useEffect(() => {
    // Debounce search and status changes
    const timer = setTimeout(() => {
      fetchInvoiceData(true, searchTerm, selectedStatus);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedStatus, currentUser]);

  useEffect(() => {
    if (inView && hasMore && !isLoading && !isLoadingMore) {
      fetchInvoiceData(false);
    }
  }, [inView, hasMore, isLoading, isLoadingMore, fetchInvoiceData]);


  const handlePrintInvoices = async (orderIds: string[]) => {
    if (orderIds.length === 0) return;
    setIsPreparingPrint(true);
    try {
      const fullOrders = await getFullOrdersByIds(orderIds);
      if (fullOrders.length !== orderIds.length) {
        toast({ title: "Print Warning", description: "Some selected invoices could not be found.", variant: "destructive" });
      }
      if (fullOrders.length > 0) {
        setOrdersToPrint(fullOrders);
      } else {
        setIsPreparingPrint(false);
      }
    } catch (error) {
      console.error("Failed to fetch full orders for printing:", error);
      toast({ title: "Print Error", description: "Could not prepare invoices for printing.", variant: "destructive" });
      setIsPreparingPrint(false);
    }
  };

  useEffect(() => {
    if (ordersToPrint) {
      const handleAfterPrint = () => {
        setOrdersToPrint(null);
        setIsPreparingPrint(false);
        setSelectedRowIds(new Set());
        window.removeEventListener('afterprint', handleAfterPrint);
      };

      window.addEventListener('afterprint', handleAfterPrint);

      const timer = setTimeout(() => {
        window.print();
      }, 100);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
    }
  }, [ordersToPrint]);

  const filteredOrders = allOrders;


  useEffect(() => {
    setSelectedRowIds(new Set());
  }, [searchTerm, selectedStatus]);
  

  const getOrderFinancials = useCallback((order: TrackingLink) => {
    const orderSubtotal = (order.orderItems || []).reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0);
    const effectiveDiscount = order.specialClientDiscount || 0;
    const netPayable = orderSubtotal - effectiveDiscount;
    const shippingCharge = order.shippingCharge || 0;

    const allAdvancePaymentRecords: AdvancePaymentRecord[] = [];
    if (order.advancePayments && order.advancePayments.length > 0) {
      allAdvancePaymentRecords.push(...order.advancePayments);
    } else if (order.advancePayment && order.advancePayment > 0) {
      allAdvancePaymentRecords.push({
        id: 'legacy-advance',
        amount: order.advancePayment,
        date: order.createdAt,
        paymentMethod: order.paymentMethod || "Unknown",
        notes: "Initial advance payment (legacy data).",
        recordedByUserId: order.crmUserId,
        recordedByUserName: order.crmUserName,
      });
    }

    const totalAdvancePaid = allAdvancePaymentRecords.reduce((sum, record) => sum + record.amount, 0);
    const grandTotal = netPayable + shippingCharge;
    const amountDue = grandTotal - totalAdvancePaid;

    return { netPayable, paidAmount: totalAdvancePaid, dueAmount: amountDue };
  }, []);

  const getStatusDisplayInfo = useCallback((statusId: string): { name: string; color: string; textColor: string } => {
    const status = allStatuses.find(s => s.id === statusId);
    if (status) {
      return { name: status.name, color: status.color, textColor: getContrastTextColor(status.color) };
    }
    return { name: 'N/A', color: '#A1A1AA', textColor: '#FFFFFF' };
  }, [allStatuses]);

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedRowIds(new Set(filteredOrders.map(o => o.id)));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const handleSelectRow = (orderId: string, checked: boolean) => {
    setSelectedRowIds(prev => {
      const newSelection = new Set(prev);
      if (checked) {
        newSelection.add(orderId);
      } else {
        newSelection.delete(orderId);
      }
      return newSelection;
    });
  };

  const numSelected = selectedRowIds.size;

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8 print:hidden">
        <Card className="shadow-xl border bg-card rounded-lg overflow-hidden">
          <CardHeader className="border-b p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-grow">
                <CardTitle className="text-card-foreground text-xl">All Order Invoices</CardTitle>
                <CardDescription className="text-muted-foreground text-sm mt-0.5">
                  A list of all generated orders and their financial status.
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0 sm:min-w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-background h-10 rounded-md w-full"
                  />
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {[
                      'CR Clearance',
                      'CO Clearance',
                      'On Design',
                      'On Hold',
                      'Logistics',
                      'Courier',
                      'Delivered',
                      'Cancel'
                    ].map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {numSelected > 0 && (
              <div className="flex items-center gap-4 px-5 py-3 bg-secondary/50 border-b">
                <div className="text-sm font-semibold text-foreground flex-1">
                  {numSelected} row{numSelected > 1 ? 's' : ''} selected.
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintInvoices(Array.from(selectedRowIds))}
                  disabled={isPreparingPrint}
                >
                  {isPreparingPrint ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing...</>
                  ) : (
                    <><Printer className="mr-2 h-4 w-4" /> Print Selected</>
                  )}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setSelectedRowIds(new Set())}>
                  <X className="h-4 w-4" />
                  <span className="sr-only">Clear selection</span>
                </Button>
              </div>
            )}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center pl-4">
                      <Checkbox
                        checked={
                          (numSelected > 0 && numSelected < filteredOrders.length)
                            ? 'indeterminate'
                            : (numSelected === filteredOrders.length && filteredOrders.length > 0)
                        }
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all rows"
                      />
                    </TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Net Payable</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(8)].map((_, i) => (
                      <TableRow key={`skel-invoice-${i}`}>
                        <TableCell className="text-center pl-4"><Skeleton className="h-5 w-5" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => {
                      const financials = getOrderFinancials(order);
                      const statusInfo = getStatusDisplayInfo(order.currentStatus);
                      const isSelected = selectedRowIds.has(order.id);
                      return (
                        <TableRow key={order.id} className="hover:bg-muted/50 transition-colors" data-state={isSelected ? "selected" : ""}>
                          <TableCell className="text-center pl-4">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectRow(order.id, !!checked)}
                              aria-label={`Select row for order ${order.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-primary">
                            <Link href={`/invoice/${order.id}`} className="hover:underline" target="_blank" rel="noopener noreferrer">
                              {order.id}
                            </Link>
                          </TableCell>
                          <TableCell className="text-card-foreground">{order.companyName}</TableCell>
                          <TableCell className="text-card-foreground font-mono">{formatCurrency(financials.netPayable)}</TableCell>
                          <TableCell className="text-green-600 font-mono">{formatCurrency(financials.paidAmount)}</TableCell>
                          <TableCell className="text-red-600 font-mono">{formatCurrency(financials.dueAmount)}</TableCell>
                          <TableCell>
                            <Badge style={{ backgroundColor: statusInfo.color, color: statusInfo.textColor }} className="border-transparent">
                              {statusInfo.name}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 h-[300px]">
                        <Package className="mx-auto h-12 w-12 opacity-50 mb-3 text-muted-foreground" />
                        <p className="text-lg text-muted-foreground font-medium">No orders found.</p>
                        <p className="text-sm text-muted-foreground">
                          {searchTerm ? "Try adjusting your search term." : "Create a new order to see it here."}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {hasMore && (
              <div ref={ref} className="py-8 flex justify-center border-t">
                {isLoadingMore ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading more invoices...</span>
                  </div>
                ) : (
                  <div className="h-1" />
                )}
              </div>
            )}
            {!hasMore && allOrders.length > 0 && (
              <div className="py-6 text-center text-muted-foreground text-sm border-t bg-muted/20">
                Showing all {allOrders.length} invoices.
              </div>
            )}
          </CardContent>

        </Card>
      </div>

      {/* Hidden container for printing */}
      {ordersToPrint && (
        <div className="hidden print:block">
          {ordersToPrint.map(order => (
            <div key={`print-${order.id}`} className="invoice-page">
              <InvoiceDetailsClient
                order={order}
                allStatuses={allStatuses}
                allUsers={allUsers}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
