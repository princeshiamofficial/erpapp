
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
import { getOrders } from '@/lib/order-service';
import { getStatuses, getContrastTextColor } from '@/lib/status-service';
import { getUsers } from '@/lib/user-service';
import { getFullOrdersByIds } from './actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Checkbox } from "@/components/ui/checkbox";
import { InvoiceDetailsClient } from '../invoice/[orderId]/InvoiceDetailsClient';
import { cn } from '@/lib/utils';

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
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [ordersToPrint, setOrdersToPrint] = useState<TrackingLink[] | null>(null);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

  const fetchInvoiceData = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [fetchedOrders, fetchedStatuses, fetchedUsers] = await Promise.all([
        getOrders(),
        getStatuses(),
        getUsers(),
      ]);
      setAllOrders(fetchedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setAllStatuses(fetchedStatuses);
      setAllUsers(fetchedUsers);
    } catch (error) {
      console.error("Failed to fetch orders or statuses:", error);
      toast({ title: "Error", description: "Could not load invoice data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchInvoiceData();
  }, [fetchInvoiceData]);

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
      const timer = setTimeout(() => {
        window.print();
        setOrdersToPrint(null);
        setIsPreparingPrint(false);
        setSelectedRowIds(new Set());
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [ordersToPrint]);
  
  const filteredOrders = useMemo(() => {
    if (!searchTerm) return allOrders;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return allOrders.filter(order =>
      order.id.toLowerCase().includes(lowerSearchTerm) ||
      (order.companyName && order.companyName.toLowerCase().includes(lowerSearchTerm)) ||
      (order.phoneNumber && order.phoneNumber.toLowerCase().includes(lowerSearchTerm)) ||
      order.crmUserName.toLowerCase().includes(lowerSearchTerm)
    );
  }, [allOrders, searchTerm]);
  
  useEffect(() => {
    setSelectedRowIds(new Set());
  }, [searchTerm]);

  const getOrderFinancials = useCallback((order: TrackingLink) => {
    const orderSubtotal = (order.orderItems || []).reduce((acc, item) => acc + (item.lineItemTotalPrice || 0), 0);
    const effectiveDiscount = order.specialClientDiscount || 0;
    const netPayable = orderSubtotal - effectiveDiscount;

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
    const amountDue = netPayable - totalAdvancePaid;

    return { totalAmount: netPayable, paidAmount: totalAdvancePaid, dueAmount: amountDue };
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
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Card className="shadow-xl border bg-card rounded-lg overflow-hidden print:hidden">
        <CardHeader className="border-b p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-grow">
              <CardTitle className="text-card-foreground text-xl">All Order Invoices</CardTitle>
              <CardDescription className="text-muted-foreground text-sm mt-0.5">
                A list of all generated orders and their financial status.
              </CardDescription>
            </div>
            <div className="relative flex-grow sm:flex-grow-0 sm:max-w-xs w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background h-10 rounded-md w-full"
              />
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
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Preparing...</>
                    ) : (
                        <><Printer className="mr-2 h-4 w-4"/> Print Selected</>
                    )}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setSelectedRowIds(new Set())}>
                    <X className="h-4 w-4"/>
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
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <TableRow key={`skel-invoice-${i}`}>
                      <TableCell className="text-center pl-4"><Skeleton className="h-5 w-5"/></TableCell>
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
                        <TableCell className="text-card-foreground font-mono">{formatCurrency(financials.totalAmount)}</TableCell>
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
        </CardContent>
      </Card>
      
      {/* Hidden container for printing */}
      <div className={cn("hidden print:block", !ordersToPrint && "hidden")}>
        {ordersToPrint?.map(order => (
          <div key={`print-${order.id}`} className="invoice-page">
            <InvoiceDetailsClient 
              order={order} 
              allStatuses={allStatuses} 
              allUsers={allUsers}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
